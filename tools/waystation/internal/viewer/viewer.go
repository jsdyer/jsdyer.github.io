// Package viewer exposes a read-only, embedded interface to a capsule store.
package viewer

import (
	"embed"
	"encoding/json"
	"fmt"
	"html/template"
	"io/fs"
	"mime"
	"net/http"
	"net/url"
	"strings"

	"github.com/jsdyer/jsdyer.github.io/tools/waystation/internal/capsule"
	"github.com/jsdyer/jsdyer.github.io/tools/waystation/internal/webdoc"
)

//go:embed static/*
var assets embed.FS

const replayPolicy = "default-src 'none'; script-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; media-src 'self'; connect-src 'none'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'; sandbox allow-same-origin"
const appPolicy = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"

// New serves the local library and inert replays. It cannot capture or mutate data.
func New(store *capsule.Store) http.Handler {
	mux := http.NewServeMux()
	static, _ := fs.Sub(assets, "static")
	mux.Handle("/assets/", http.StripPrefix("/assets/", http.FileServer(http.FS(static))))
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			http.NotFound(w, r)
			return
		}
		data, err := assets.ReadFile("static/index.html")
		if err != nil {
			http.Error(w, "interface unavailable", 500)
			return
		}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		_, _ = w.Write(data)
	})
	mux.HandleFunc("/api/snapshots", func(w http.ResponseWriter, r *http.Request) {
		items, err := store.List()
		if err != nil {
			jsonError(w, 500, "Cannot read the capsule library.")
			return
		}
		if items == nil {
			items = []capsule.Snapshot{}
		}
		writeJSON(w, items)
	})
	mux.HandleFunc("/api/snapshots/", func(w http.ResponseWriter, r *http.Request) {
		item, err := store.Load(strings.TrimPrefix(r.URL.Path, "/api/snapshots/"))
		if err != nil {
			jsonError(w, 404, "Snapshot not found or invalid.")
			return
		}
		writeJSON(w, item)
	})
	mux.HandleFunc("/api/diff", func(w http.ResponseWriter, r *http.Request) {
		before, err := store.Load(r.URL.Query().Get("before"))
		if err != nil {
			jsonError(w, 400, "Choose a valid earlier snapshot.")
			return
		}
		after, err := store.Load(r.URL.Query().Get("after"))
		if err != nil {
			jsonError(w, 400, "Choose a valid later snapshot.")
			return
		}
		changes := capsule.Diff(before, after)
		if changes == nil {
			changes = []capsule.Change{}
		}
		writeJSON(w, changes)
	})
	mux.HandleFunc("/replay/", func(w http.ResponseWriter, r *http.Request) { replay(w, r, store) })
	mux.HandleFunc("/missing", func(w http.ResponseWriter, r *http.Request) {
		missing(w, "This address was not captured", r.URL.Query().Get("url"))
	})
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Security-Policy", appPolicy)
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("Referrer-Policy", "no-referrer")
		w.Header().Set("Cache-Control", "no-store")
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			w.Header().Set("Allow", "GET, HEAD")
			http.Error(w, "This library is read-only.", http.StatusMethodNotAllowed)
			return
		}
		mux.ServeHTTP(w, r)
	})
}

func writeJSON(w http.ResponseWriter, value any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	_ = json.NewEncoder(w).Encode(value)
}

func jsonError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": message})
}

func replay(w http.ResponseWriter, r *http.Request, store *capsule.Store) {
	w.Header().Set("Content-Security-Policy", replayPolicy)
	id := strings.TrimPrefix(r.URL.Path, "/replay/")
	snapshot, err := store.Load(id)
	if err != nil {
		missing(w, "Snapshot unavailable", "It may have been moved, removed, or damaged.")
		return
	}
	index := make(map[string]capsule.Resource, len(snapshot.Resources))
	for _, resource := range snapshot.Resources {
		index[resource.URL] = resource
	}
	// A redirect destination is another address for the bytes we captured. A
	// separately captured destination takes precedence over an alias.
	for _, resource := range snapshot.Resources {
		if resource.FinalURL != "" {
			if _, exists := index[resource.FinalURL]; !exists {
				index[resource.FinalURL] = resource
			}
		}
	}
	wanted := r.URL.Query().Get("url")
	if parsed, err := url.Parse(wanted); err == nil {
		parsed.Fragment = ""
		parsed.RawFragment = ""
		wanted = parsed.String()
	}
	resource, ok := index[wanted]
	if !ok || resource.Hash == "" || resource.Error != "" {
		missing(w, "This address was not captured", wanted)
		return
	}
	data, err := store.Get(resource.Hash)
	if err != nil {
		missing(w, "Archived bytes unavailable", "Run waystation verify to inspect this capsule.")
		return
	}
	mediaType, _, err := mime.ParseMediaType(resource.MediaType)
	if err != nil {
		mediaType = "application/octet-stream"
	}
	resolve := func(absoluteURL string) string {
		parsed, err := url.Parse(absoluteURL)
		if err != nil {
			return "/missing"
		}
		fragment := parsed.EscapedFragment()
		parsed.Fragment = ""
		parsed.RawFragment = ""
		key := parsed.String()
		found, exists := index[key]
		if !exists || found.Hash == "" || found.Error != "" {
			return "/missing?url=" + url.QueryEscape(key)
		}
		local := "/replay/" + url.PathEscape(snapshot.ID) + "?url=" + url.QueryEscape(key)
		if fragment != "" {
			local += "#" + fragment
		}
		return local
	}
	if mediaType == "text/html" || mediaType == "application/xhtml+xml" || mediaType == "text/css" {
		base := resource.URL
		if resource.FinalURL != "" {
			base = resource.FinalURL
		}
		data, err = webdoc.Rewrite(data, mediaType, base, resolve)
		if err != nil {
			missing(w, "Unable to prepare this page", resource.URL)
			return
		}
		// The HTML parser serializes XHTML into inert HTML. Serve that result as
		// HTML rather than handing the original XML document to the browser.
		if mediaType == "application/xhtml+xml" {
			mediaType = "text/html"
		}
	}
	// Active documents and executable formats are never rendered as such. SVG
	// remains an attachment: it can contain navigation even with script-blocking
	// CSP, and a full SVG sanitizer is deliberately outside this version's scope.
	switch mediaType {
	case "text/html", "text/css", "text/plain":
		w.Header().Set("Content-Type", mediaType+"; charset=utf-8")
	case "image/png", "image/jpeg", "image/gif", "image/webp", "image/avif", "image/bmp", "image/x-icon", "image/vnd.microsoft.icon", "font/woff", "font/woff2", "font/ttf", "font/otf", "audio/mpeg", "audio/ogg", "audio/wav", "video/mp4", "video/webm":
		w.Header().Set("Content-Type", mediaType)
	default:
		w.Header().Set("Content-Type", "application/octet-stream")
		w.Header().Set("Content-Disposition", "attachment; filename=archived-resource")
	}
	w.Header().Set("X-Waystation-Snapshot", snapshot.ID)
	w.Header().Set("Content-Length", fmt.Sprint(len(data)))
	_, _ = w.Write(data)
}

var missingTemplate = template.Must(template.New("missing").Parse(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{{.Title}} · Waystation</title><body><main><p>WAYSTATION / OFFLINE REPLAY</p><h1>{{.Title}}</h1><p>{{.Detail}}</p><p>Waystation stays inside the capsule. It will not contact the original server.</p><a href="/">Return to the library</a></main></body></html>`))

func missing(w http.ResponseWriter, title, detail string) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusNotFound)
	_ = missingTemplate.Execute(w, struct{ Title, Detail string }{title, detail})
}
