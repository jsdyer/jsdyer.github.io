// Package capture builds bounded snapshots of deliberately selected web origins.
package capture

import (
	"context"
	"fmt"
	"io"
	"mime"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/jsdyer/jsdyer.github.io/tools/waystation/internal/capsule"
	"github.com/jsdyer/jsdyer.github.io/tools/waystation/internal/webdoc"
)

type Options struct {
	Seeds         []string
	Label         string
	MaxResources  int
	MaxBytes      int64
	MaxTotalBytes int64
	Workers       int
	MaxDepth      int
	Timeout       time.Duration
	Delay         time.Duration
}

type fetched struct {
	resource capsule.Resource
	body     []byte
	limited  bool
}

func origin(raw string) string {
	u, _ := url.Parse(raw)
	return u.Scheme + "://" + u.Host
}

// Run captures only HTTP(S) origins explicitly named in Seeds, including private
// homelab addresses. It never discovers or scans new origins. Limits include
// assets as well as pages. MaxDepth zero captures seed resources only.
func Run(ctx context.Context, store *capsule.Store, opts Options) (capsule.Snapshot, error) {
	var empty capsule.Snapshot
	if store == nil {
		return empty, fmt.Errorf("capture needs a store")
	}
	if opts.Workers == 0 {
		opts.Workers = 4
	}
	if opts.MaxResources == 0 {
		opts.MaxResources = 250
	}
	if opts.MaxBytes == 0 {
		opts.MaxBytes = 4 << 20
	}
	if opts.MaxTotalBytes == 0 {
		opts.MaxTotalBytes = 64 << 20
	}
	if opts.Timeout == 0 {
		opts.Timeout = 15 * time.Second
	}
	if opts.Workers < 1 || opts.Workers > 32 {
		return empty, fmt.Errorf("workers must be between 1 and 32")
	}
	if opts.MaxResources < 1 || opts.MaxResources > 10000 {
		return empty, fmt.Errorf("max resources must be between 1 and 10000")
	}
	if opts.MaxBytes < 1 || opts.MaxBytes > 128<<20 || opts.MaxTotalBytes < 1 {
		return empty, fmt.Errorf("byte limits must be positive; per-resource limit must be at most 128 MiB")
	}
	if opts.MaxDepth < 0 || opts.MaxDepth > 64 {
		return empty, fmt.Errorf("depth must be between 0 and 64")
	}
	if opts.Timeout < 0 || opts.Delay < 0 {
		return empty, fmt.Errorf("timeout and delay cannot be negative")
	}
	allowed := map[string]bool{}
	seen := map[string]bool{}
	var seeds []string
	for _, raw := range opts.Seeds {
		if len(raw) > 8192 {
			return empty, fmt.Errorf("seed URL exceeds 8192 bytes")
		}
		u, err := webdoc.CanonicalURL(raw)
		if err != nil {
			return empty, fmt.Errorf("invalid seed %q: %w", raw, err)
		}
		allowed[origin(u)] = true
		if !seen[u] {
			seeds = append(seeds, u)
			seen[u] = true
		}
	}
	if len(seeds) == 0 {
		return empty, fmt.Errorf("at least one seed URL is required")
	}
	if len(seeds) > opts.MaxResources {
		return empty, fmt.Errorf("number of seeds exceeds max resources")
	}
	sort.Strings(seeds)
	snapshot := capsule.Snapshot{Label: opts.Label, Seeds: seeds}
	if snapshot.Label == "" {
		snapshot.Label = seeds[0]
	}

	// Clone defaults for sane dial/TLS timeouts, but do not inherit a machine's
	// HTTP_PROXY setting: explicit local origins should stay direct.
	transport := http.DefaultTransport.(*http.Transport).Clone()
	transport.Proxy = nil
	transport.MaxConnsPerHost = opts.Workers
	defer transport.CloseIdleConnections()
	client := &http.Client{Transport: transport, Timeout: opts.Timeout}
	client.CheckRedirect = func(req *http.Request, via []*http.Request) error {
		if len(via) >= 10 {
			return fmt.Errorf("redirect limit exceeded")
		}
		u, err := webdoc.CanonicalURL(req.URL.String())
		if err != nil || !allowed[origin(u)] {
			return fmt.Errorf("redirect leaves explicitly selected origins")
		}
		return nil
	}

	jobs := make(chan string)
	results := make(chan fetched, opts.Workers)
	var workers sync.WaitGroup
	for i := 0; i < opts.Workers; i++ {
		workers.Add(1)
		go func() {
			defer workers.Done()
			for u := range jobs {
				results <- fetch(ctx, client, u, opts.MaxBytes)
			}
		}()
	}
	defer func() { close(jobs); workers.Wait() }()

	frontier := append([]string(nil), seeds...)
	var total int64
	budgetExhausted := false
	var lastDispatch time.Time
	for depth := 0; len(frontier) != 0; depth++ {
		if err := ctx.Err(); err != nil {
			return empty, err
		}
		sort.Strings(frontier)
		room := opts.MaxResources - len(snapshot.Resources)
		if len(frontier) > room {
			frontier = frontier[:room]
			snapshot.Truncated = true
		}
		if len(frontier) == 0 {
			break
		}
		var next []string
		for start := 0; start < len(frontier); start += opts.Workers {
			end := start + opts.Workers
			if end > len(frontier) {
				end = len(frontier)
			}
			batch := frontier[start:end]
			for _, u := range batch {
				if wait := opts.Delay - time.Since(lastDispatch); !lastDispatch.IsZero() && wait > 0 {
					timer := time.NewTimer(wait)
					select {
					case <-ctx.Done():
						timer.Stop()
						return empty, ctx.Err()
					case <-timer.C:
					}
				}
				select {
				case <-ctx.Done():
					return empty, ctx.Err()
				case jobs <- u:
					lastDispatch = time.Now()
				}
			}
			pending := make(map[string]fetched, len(batch))
			for range batch {
				r := <-results
				pending[r.resource.URL] = r
			}
			if err := ctx.Err(); err != nil {
				return empty, err
			}
			// Accept in sorted URL order, independent of worker completion order.
			for _, u := range batch {
				got := pending[u]
				r := got.resource
				if got.limited {
					snapshot.Truncated = true
				}
				if got.body != nil {
					if budgetExhausted || int64(len(got.body)) > opts.MaxTotalBytes-total {
						r.Error = "total byte budget exceeded"
						snapshot.Truncated = true
						budgetExhausted = true
					} else {
						hash, err := store.Put(got.body)
						if err != nil {
							return empty, fmt.Errorf("store %s: %w", u, err)
						}
						r.Hash, r.Size = hash, int64(len(got.body))
						total += r.Size
						base := r.URL
						if r.FinalURL != "" {
							base = r.FinalURL
						}
						r.Title, r.Links = webdoc.Discover(got.body, r.MediaType, base)
						if len(r.Links) > 10000 {
							r.Links = r.Links[:10000]
							snapshot.Truncated = true
						}
						for _, linked := range r.Links {
							if len(linked) > 8192 || !allowed[origin(linked)] || seen[linked] {
								continue
							}
							if depth == opts.MaxDepth {
								snapshot.Truncated = true
								continue
							}
							if len(seen) >= opts.MaxResources {
								snapshot.Truncated = true
								continue
							}
							seen[linked] = true
							next = append(next, linked)
						}
					}
				}
				snapshot.Resources = append(snapshot.Resources, r)
			}
			if budgetExhausted {
				break
			}
		}
		if depth == opts.MaxDepth || budgetExhausted {
			break
		}
		frontier = next
	}
	if err := ctx.Err(); err != nil {
		return empty, err
	}
	return store.Save(snapshot)
}

func fetch(ctx context.Context, client *http.Client, raw string, limit int64) fetched {
	out := fetched{resource: capsule.Resource{URL: raw}}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, raw, nil)
	if err != nil {
		out.resource.Error = err.Error()
		return out
	}
	req.Header.Set("User-Agent", "Waystation/0.1 (manual personal-site preservation)")
	req.Header.Set("Accept", "text/html,text/css,image/*,*/*;q=0.5")
	resp, err := client.Do(req)
	if err != nil {
		out.resource.Error = err.Error()
		return out
	}
	defer resp.Body.Close()
	out.resource.Status = resp.StatusCode
	final, err := webdoc.CanonicalURL(resp.Request.URL.String())
	if err == nil && final != raw {
		out.resource.FinalURL = final
	}
	if resp.ContentLength > limit {
		out.resource.Error = "resource exceeds byte limit"
		out.limited = true
		return out
	}
	body, err := io.ReadAll(io.LimitReader(resp.Body, limit+1))
	if err != nil {
		out.resource.Error = err.Error()
		return out
	}
	if int64(len(body)) > limit {
		out.resource.Error = "resource exceeds byte limit"
		out.limited = true
		return out
	}
	mediaType, _, err := mime.ParseMediaType(resp.Header.Get("Content-Type"))
	if err != nil || mediaType == "" {
		mediaType = strings.Split(http.DetectContentType(body), ";")[0]
	}
	out.resource.MediaType = strings.ToLower(mediaType)
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		out.resource.Error = fmt.Sprintf("HTTP %d", resp.StatusCode)
	}
	out.body = body
	if out.body == nil {
		out.body = []byte{}
	}
	return out
}
