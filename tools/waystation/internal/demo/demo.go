// Package demo stages a tiny personal web, captures it twice, and turns it off.
package demo

import (
	"context"
	"fmt"
	"image"
	"image/color"
	"image/png"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"time"

	"github.com/jsdyer/jsdyer.github.io/tools/waystation/internal/capsule"
	"github.com/jsdyer/jsdyer.github.io/tools/waystation/internal/capture"
)

func Seed(ctx context.Context, store *capsule.Store) ([]capsule.Snapshot, error) {
	var edition atomic.Int32
	edition.Store(1)
	origin := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		second := edition.Load() == 2
		switch r.URL.Path {
		case "/site.css":
			w.Header().Set("Content-Type", "text/css")
			fmt.Fprint(w, `body{max-width:760px;margin:4rem auto;padding:0 1.5rem;background:#eee9db;color:#27352d;font:18px/1.7 Georgia,serif}a{color:#27694d}h1{font-size:3rem;line-height:1.1}nav{display:flex;gap:1rem;flex-wrap:wrap;font:14px monospace;border-block:1px solid #a3ab9b;padding:1rem 0}small{font:13px monospace}img{max-width:100%;border:12px solid white;box-shadow:0 6px 30px #293e2420}blockquote{border-left:3px solid #70866d;padding-left:1rem}code{background:#dce0d0;padding:.2rem}footer{margin-top:3rem;border-top:1px solid #a3ab9b;padding:1rem 0}`)
		case "/photo.png":
			w.Header().Set("Content-Type", "image/png")
			_ = png.Encode(w, landscape())
		default:
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			title, body := "", ""
			switch r.URL.Path {
			case "/":
				title = "The little server that could"
				body = `<p>A fictional home page for people who would rather own a little corner of the web than rent a feed.</p><img src="/photo.png" alt="Illustrated mountain landscape"><p>This site was running on a temporary local server. Waystation captured it, and then switched that server off.</p><ul><li><a href="/lab">Visit the machine room</a></li><li><a href="/field-notes">Read the field notes</a></li>`
				if second {
					body += `<li><a href="/guestbook">A new guestbook page</a></li>`
				} else {
					body += `<li><a href="/old-links">The old links page</a></li>`
				}
				body += `</ul>`
			case "/lab":
				title = "Machine room"
				body = `<p>An old tower, a quiet NAS, an Apache server, and a collection of scripts I understand.</p><blockquote>The best infrastructure is infrastructure you can explain to yourself six months later.</blockquote><p>Status: `
				if second {
					body += `the archive drive has been upgraded; backups now have room to grow.`
				} else {
					body += `the archive drive is nearly full. A weekend project awaits.`
				}
				body += `</p>`
			case "/field-notes":
				title = "Field notes"
				body = `<p>Today: scan a photograph, rescue an old game save, write down how the server works.</p><p>Tomorrow: keep the links alive.</p><p><a href="/lab#backups">Back to the machine room</a></p>`
			case "/old-links":
				title = "Old links"
				body = `<p>This page belongs to the first edition. It disappears from the next capture, but the earlier capsule keeps it.</p>`
			case "/guestbook":
				if second {
					title = "A guestbook, again"
					body = `<p>A small web should feel inhabited. This new page appears in the second edition.</p><p>Forms are deliberately inert in an archive: a preserved page cannot submit back to the original server.</p><form action="/sign" method="post"><input aria-label="Guest name"><button>Sign</button></form>`
				}
			}
			if title == "" {
				http.NotFound(w, r)
				return
			}
			fmt.Fprintf(w, `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>%s</title><link rel="stylesheet" href="/site.css"></head><body><small>THE SMALL WEB / EDITION %d</small><h1>%s</h1><nav><a href="/">Home</a><a href="/lab">Machine room</a><a href="/field-notes">Field notes</a></nav>%s<footer>Sample content included with Waystation. No personal data.</footer></body></html>`, title, edition.Load(), title, body)
		}
	}))
	defer origin.Close()
	var snapshots []capsule.Snapshot
	for i, label := range []string{"The small web · first light", "The small web · a weekend later"} {
		edition.Store(int32(i + 1))
		snap, err := capture.Run(ctx, store, capture.Options{Seeds: []string{origin.URL + "/"}, Label: label, Workers: 3, MaxResources: 32, MaxBytes: 1 << 20, MaxTotalBytes: 8 << 20, MaxDepth: 4, Timeout: 5 * time.Second})
		if err != nil {
			return nil, err
		}
		for _, r := range snap.Resources {
			if r.Error != "" {
				return nil, fmt.Errorf("sample capture: %s: %s", r.URL, r.Error)
			}
		}
		if snap.Truncated {
			return nil, fmt.Errorf("sample capture unexpectedly truncated")
		}
		snapshots = append(snapshots, snap)
	}
	// The deferred Close is the point of the demo: the viewer never needs this origin.
	return snapshots, nil
}

// A generated fixture keeps the demo independent of image downloads and files.
func landscape() image.Image {
	img := image.NewRGBA(image.Rect(0, 0, 640, 300))
	for y := 0; y < 300; y++ {
		for x := 0; x < 640; x++ {
			c := color.RGBA{191, 208, 187, 255}
			if (x-480)*(x-480)+(y-80)*(y-80) < 36*36 {
				c = color.RGBA{249, 234, 193, 255}
			}
			peak := 65 + abs(x-140)*4/5
			if x > 300 {
				peak = 130 + abs(x-415)*2/3
			}
			if y > peak {
				c = color.RGBA{86, 121, 108, 255}
			}
			if y > 180+abs(x-200)/3 {
				c = color.RGBA{49, 79, 71, 255}
			}
			img.SetRGBA(x, y, c)
		}
	}
	return img
}

func abs(n int) int {
	if n < 0 {
		return -n
	}
	return n
}
