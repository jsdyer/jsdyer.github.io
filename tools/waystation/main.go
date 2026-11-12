// Waystation turns an owned small website into a portable, offline capsule.
package main

import (
	"context"
	_ "embed"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"net"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"time"

	"github.com/jsdyer/jsdyer.github.io/tools/waystation/internal/capsule"
	"github.com/jsdyer/jsdyer.github.io/tools/waystation/internal/capture"
	"github.com/jsdyer/jsdyer.github.io/tools/waystation/internal/demo"
	"github.com/jsdyer/jsdyer.github.io/tools/waystation/internal/viewer"
)

//go:embed VERSION
var version string

const help = `WAYSTATION — your pocket internet

Capture your own server-rendered sites. Unplug the server. Keep browsing.

  waystation demo                         build two sample capsules and browse
  waystation capture [flags] URL [URL...]  preserve explicit origins
  waystation serve [flags]                open the read-only archive viewer
  waystation list [flags]                 show saved snapshots
  waystation inspect [flags] ID           print a manifest as JSON
  waystation diff [flags] BEFORE AFTER    show URL-level changes as JSON
  waystation verify [flags] ID            check content hashes and lengths
  waystation export [flags] ID            create a portable capsule ZIP
  waystation version

Every data command accepts --store DIR (default: ./waystation-data).
Flags go BEFORE positional URLs or IDs. Use COMMAND --help for options.
Capture is a manual operation for sites you own or have permission to archive.
`

func main() {
	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt)
	defer cancel()
	if err := run(ctx, os.Args[1:]); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return
		}
		fmt.Fprintln(os.Stderr, "waystation:", err)
		os.Exit(1)
	}
}

func run(ctx context.Context, args []string) error {
	if len(args) == 0 || args[0] == "help" || args[0] == "--help" || args[0] == "-h" {
		fmt.Print(help)
		return nil
	}
	if args[0] == "version" {
		fmt.Println("waystation", strings.TrimSpace(version))
		return nil
	}
	cmd := args[0]
	switch cmd {
	case "capture", "demo", "serve", "list", "inspect", "diff", "verify", "export":
	default:
		return fmt.Errorf("unknown command %q; use waystation help", cmd)
	}
	fs := flag.NewFlagSet(cmd, flag.ContinueOnError)
	root := fs.String("store", "waystation-data", "archive directory")
	var opts capture.Options
	var addr, out string
	var noServe bool
	if cmd == "capture" {
		fs.StringVar(&opts.Label, "label", "", "name on the capsule shelf")
		fs.IntVar(&opts.Workers, "workers", 4, "concurrent fetch workers")
		fs.IntVar(&opts.MaxResources, "max-resources", 250, "maximum pages and assets")
		fs.IntVar(&opts.MaxDepth, "depth", 4, "maximum link distance from a seed")
		fs.Int64Var(&opts.MaxBytes, "max-bytes", 8<<20, "maximum bytes per response")
		fs.Int64Var(&opts.MaxTotalBytes, "max-total-bytes", 64<<20, "maximum stored bytes per capture")
		fs.DurationVar(&opts.Timeout, "timeout", 15*time.Second, "timeout per HTTP request")
		fs.DurationVar(&opts.Delay, "delay", 100*time.Millisecond, "minimum interval between request starts")
	}
	if cmd == "serve" || cmd == "demo" {
		fs.StringVar(&addr, "listen", "127.0.0.1:8787", "viewer bind address (no authentication; loopback recommended)")
	}
	if cmd == "demo" {
		fs.BoolVar(&noServe, "no-serve", false, "create sample snapshots, then exit")
	}
	if cmd == "export" {
		fs.StringVar(&out, "out", "", "new ZIP file to create (required)")
	}
	if err := fs.Parse(args[1:]); err != nil {
		return err
	}
	n := fs.NArg()
	switch cmd {
	case "capture":
		if n == 0 {
			return errors.New("provide at least one HTTP(S) seed URL")
		}
	case "inspect", "verify", "export":
		if n != 1 {
			return errors.New("provide one snapshot ID from waystation list")
		}
	case "diff":
		if n != 2 {
			return errors.New("provide BEFORE and AFTER snapshot IDs")
		}
	default:
		if n != 0 {
			return errors.New("unexpected arguments; flags go before positional arguments")
		}
	}
	if cmd == "export" && out == "" {
		return errors.New("export needs --out capsule.zip before the snapshot ID")
	}
	s, err := capsule.Open(*root)
	if err != nil {
		return err
	}
	switch cmd {
	case "capture":
		opts.Seeds = fs.Args()
		snap, err := capture.Run(ctx, s, opts)
		if err != nil {
			return err
		}
		printSnapshot(snap)
		failures := 0
		for _, r := range snap.Resources {
			if r.Error != "" {
				failures++
			}
		}
		if failures > 0 || snap.Truncated {
			return fmt.Errorf("partial capture saved: %d failed resources, truncated=%v; inspect the manifest", failures, snap.Truncated)
		}
		return nil
	case "demo":
		snaps, err := demo.Seed(ctx, s)
		if err != nil {
			return err
		}
		for _, snap := range snaps {
			printSnapshot(snap)
		}
		fmt.Println("The sample origin has been shut down. Every replay now comes from your capsule.")
		if noServe {
			return nil
		}
		return serve(ctx, s, addr)
	case "serve":
		return serve(ctx, s, addr)
	case "list":
		snaps, err := s.List()
		if err != nil {
			return err
		}
		if len(snaps) == 0 {
			fmt.Println("No capsules yet. Try waystation demo.")
			return nil
		}
		for _, snap := range snaps {
			printSnapshot(snap)
		}
		return nil
	case "inspect":
		snap, err := s.Load(fs.Arg(0))
		if err != nil {
			return err
		}
		return printJSON(snap)
	case "diff":
		before, err := s.Load(fs.Arg(0))
		if err != nil {
			return err
		}
		after, err := s.Load(fs.Arg(1))
		if err != nil {
			return err
		}
		return printJSON(capsule.Diff(before, after))
	case "verify":
		v, err := s.Verify(fs.Arg(0))
		if err != nil {
			return err
		}
		if err := printJSON(v); err != nil {
			return err
		}
		if len(v.Errors) > 0 {
			return errors.New("verification failed")
		}
		return nil
	case "export":
		if err := s.Export(fs.Arg(0), out); err != nil {
			return err
		}
		fmt.Println("Exported", out)
		return nil
	}
	return nil
}

func printJSON(v any) error {
	e := json.NewEncoder(os.Stdout)
	e.SetIndent("", "  ")
	return e.Encode(v)
}
func printSnapshot(s capsule.Snapshot) {
	fmt.Printf("%s  %3d resources  %s\n", s.ID, len(s.Resources), s.Label)
}

func serve(ctx context.Context, s *capsule.Store, addr string) error {
	host, _, err := net.SplitHostPort(addr)
	if err != nil {
		return fmt.Errorf("listen address must be HOST:PORT: %w", err)
	}
	if host == "" || host == "0.0.0.0" || host == "::" {
		return errors.New("use an explicit listen IP or hostname, such as 127.0.0.1:8787 or your LAN IP; wildcard listeners are not supported")
	}
	srv := &http.Server{Addr: addr, Handler: hostGuard(viewer.New(s), host), ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 15 * time.Second, WriteTimeout: 30 * time.Second, IdleTimeout: 60 * time.Second}
	stop := make(chan struct{})
	defer close(stop)
	go func() {
		select {
		case <-ctx.Done():
			shutdown, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			_ = srv.Shutdown(shutdown)
		case <-stop:
		}
	}()
	fmt.Printf("Waystation viewer: http://%s/\nRead-only. Press Ctrl+C to stop.\n", addr)
	err = srv.ListenAndServe()
	if errors.Is(err, http.ErrServerClosed) {
		return nil
	}
	return err
}

// A hostile website must not rebind its own hostname to the local library.
func hostGuard(next http.Handler, boundHost string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		host := r.Host
		if h, _, err := net.SplitHostPort(host); err == nil {
			host = h
		}
		host = strings.TrimSuffix(strings.ToLower(host), ".")
		bound := strings.TrimSuffix(strings.ToLower(boundHost), ".")
		loopback := func(s string) bool { ip := net.ParseIP(s); return s == "localhost" || (ip != nil && ip.IsLoopback()) }
		if host != bound && !(loopback(host) && loopback(bound)) {
			http.Error(w, "Host does not match the configured viewer address.", http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	})
}
