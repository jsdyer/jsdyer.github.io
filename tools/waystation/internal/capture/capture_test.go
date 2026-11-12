package capture

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/jsdyer/jsdyer.github.io/tools/waystation/internal/capsule"
)

func testStore(t *testing.T) *capsule.Store {
	t.Helper()
	s, err := capsule.Open(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	return s
}

func TestCaptureCyclesAssetsRedirectsAndOriginBoundary(t *testing.T) {
	var outsideCalls atomic.Int32
	outside := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { outsideCalls.Add(1); fmt.Fprint(w, "outside") }))
	defer outside.Close()
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/":
			w.Header().Set("Content-Type", "text/html")
			fmt.Fprintf(w, `<title>Home</title><a href="/docs">Docs</a><a href="/escape">Leave</a><a href="%s/page">Outside</a><link rel="stylesheet" href="/site.css"><a href="/missing">Missing</a>`, outside.URL)
		case "/docs":
			http.Redirect(w, r, "/docs/", http.StatusFound)
		case "/docs/":
			w.Header().Set("Content-Type", "text/html")
			fmt.Fprint(w, `<title>Docs</title><a href="/">Home</a><img src="picture.png">`)
		case "/docs/picture.png":
			w.Header().Set("Content-Type", "image/png")
			w.Write([]byte("PNG"))
		case "/site.css":
			w.Header().Set("Content-Type", "text/css")
			fmt.Fprint(w, `body { background: url('/background.png') }`)
		case "/background.png":
			w.Header().Set("Content-Type", "image/png")
			w.Write([]byte("BACKGROUND"))
		case "/escape":
			http.Redirect(w, r, outside.URL+"/secret", http.StatusFound)
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()
	store := testStore(t)
	snap, err := Run(context.Background(), store, Options{Seeds: []string{server.URL}, MaxDepth: 4, Workers: 3})
	if err != nil {
		t.Fatal(err)
	}
	if outsideCalls.Load() != 0 {
		t.Fatal("capture fetched an external origin")
	}
	byURL := map[string]capsule.Resource{}
	for _, r := range snap.Resources {
		byURL[r.URL] = r
	}
	for _, path := range []string{"/", "/docs", "/docs/picture.png", "/site.css", "/background.png", "/missing"} {
		r, ok := byURL[server.URL+path]
		if !ok || r.Hash == "" {
			t.Errorf("missing captured object %s: %+v", path, r)
		}
	}
	if byURL[server.URL+"/docs"].FinalURL != server.URL+"/docs/" {
		t.Fatal("redirect lost the final base URL")
	}
	if !strings.Contains(byURL[server.URL+"/escape"].Error, "redirect") {
		t.Fatal("redirect rejection not recorded")
	}
	if byURL[server.URL+"/missing"].Status != 404 {
		t.Fatal("failed HTTP status lost")
	}
	report, err := store.Verify(snap.ID)
	if err != nil || len(report.Errors) != 0 {
		t.Fatalf("snapshot fails verification: %+v, %v", report, err)
	}
}

func TestCaptureLimitsAndDeterministicBudget(t *testing.T) {
	var calls atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		w.Header().Set("Content-Type", "text/html")
		if r.URL.Path == "/" {
			fmt.Fprint(w, `<a href="/a">A</a><a href="/b">B</a><a href="/c">C</a>`)
			return
		}
		if r.URL.Path == "/a" {
			time.Sleep(15 * time.Millisecond)
		}
		fmt.Fprint(w, strings.Repeat(r.URL.Path[1:], 60))
	}))
	defer server.Close()
	for _, workers := range []int{1, 3} {
		snap, err := Run(context.Background(), testStore(t), Options{Seeds: []string{server.URL}, MaxDepth: 3, Workers: workers, MaxBytes: 200, MaxTotalBytes: 120})
		if err != nil {
			t.Fatal(err)
		}
		if !snap.Truncated {
			t.Fatal("byte budget did not mark partial capture")
		}
		var total int64
		for _, r := range snap.Resources {
			total += r.Size
			if strings.HasSuffix(r.URL, "/b") && r.Hash != "" {
				t.Fatal("budget acceptance depends on faster response")
			}
		}
		if total > 120 {
			t.Fatalf("stored %d bytes beyond limit", total)
		}
	}

	snap, err := Run(context.Background(), testStore(t), Options{Seeds: []string{server.URL}, MaxDepth: 3, MaxResources: 2})
	if err != nil || len(snap.Resources) != 2 || !snap.Truncated {
		t.Fatalf("resource cap: %+v, %v", snap, err)
	}
	snap, err = Run(context.Background(), testStore(t), Options{Seeds: []string{server.URL}, MaxDepth: 0})
	if err != nil || len(snap.Resources) != 1 || !snap.Truncated {
		t.Fatalf("depth cap: %+v, %v", snap, err)
	}
	snap, err = Run(context.Background(), testStore(t), Options{Seeds: []string{server.URL}, MaxDepth: 2, MaxBytes: 10})
	if err != nil || len(snap.Resources) != 1 || snap.Resources[0].Hash != "" || !snap.Truncated {
		t.Fatalf("body cap: %+v, %v", snap, err)
	}
}

func TestCaptureConcurrentWorkersBounded(t *testing.T) {
	var active, peak atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/" {
			w.Header().Set("Content-Type", "text/html")
			for i := 0; i < 12; i++ {
				fmt.Fprintf(w, `<a href="/%d">x</a>`, i)
			}
			return
		}
		n := active.Add(1)
		defer active.Add(-1)
		for {
			old := peak.Load()
			if n <= old || peak.CompareAndSwap(old, n) {
				break
			}
		}
		time.Sleep(20 * time.Millisecond)
		fmt.Fprint(w, "ok")
	}))
	defer server.Close()
	snap, err := Run(context.Background(), testStore(t), Options{Seeds: []string{server.URL}, MaxDepth: 1, Workers: 3})
	if err != nil || len(snap.Resources) != 13 {
		t.Fatalf("capture %+v %v", snap, err)
	}
	if peak.Load() > 3 || peak.Load() < 2 {
		t.Fatalf("expected actual bounded concurrency, peak %d", peak.Load())
	}
}

func TestCaptureCancellationDoesNotSavePartialManifest(t *testing.T) {
	started := make(chan struct{}, 1)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { started <- struct{}{}; <-r.Context().Done() }))
	defer server.Close()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	store := testStore(t)
	done := make(chan error, 1)
	go func() { _, err := Run(ctx, store, Options{Seeds: []string{server.URL}}); done <- err }()
	select {
	case <-started:
	case err := <-done:
		t.Fatalf("capture ended before request arrived (check loopback access): %v", err)
	case <-time.After(2 * time.Second):
		t.Fatal("test server did not receive the request")
	}
	cancel()
	select {
	case err := <-done:
		if err != context.Canceled {
			t.Fatalf("got %v", err)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("capture did not stop on cancellation")
	}
	snaps, err := store.List()
	if err != nil || len(snaps) != 0 {
		t.Fatalf("cancelled capture saved a manifest: %v %v", snaps, err)
	}
}

func TestCaptureValidatesAllSeedsBeforeNetwork(t *testing.T) {
	var calls atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { calls.Add(1) }))
	defer server.Close()
	for _, seed := range []string{"file:///etc/passwd", "http://user:secret@example.com/", "https://example.com:0"} {
		_, err := Run(context.Background(), testStore(t), Options{Seeds: []string{server.URL, seed}})
		if err == nil {
			t.Fatalf("accepted %s", seed)
		}
	}
	if calls.Load() != 0 {
		t.Fatal("network happened before validation completed")
	}
}

func TestCaptureAllExplicitSeedOriginsAreAllowed(t *testing.T) {
	a := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { fmt.Fprint(w, "a") }))
	defer a.Close()
	b := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { fmt.Fprint(w, "b") }))
	defer b.Close()
	snap, err := Run(context.Background(), testStore(t), Options{Seeds: []string{b.URL, a.URL, b.URL}})
	if err != nil || len(snap.Resources) != 2 {
		t.Fatalf("%+v %v", snap, err)
	}
	if !reflect.DeepEqual(snap.Seeds, []string{a.URL + "/", b.URL + "/"}) && !reflect.DeepEqual(snap.Seeds, []string{b.URL + "/", a.URL + "/"}) {
		t.Fatalf("unexpected normalized seeds %q", snap.Seeds)
	}
}
