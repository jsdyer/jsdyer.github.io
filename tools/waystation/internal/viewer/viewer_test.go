package viewer

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"github.com/jsdyer/jsdyer.github.io/tools/waystation/internal/capsule"
)

func library(t *testing.T) (*capsule.Store, capsule.Snapshot) {
	t.Helper()
	store, err := capsule.Open(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	page := []byte(`<!doctype html><title>A little site</title><link rel="stylesheet" href="style.css"><a href="page.html#saved">Visit</a><a href="https://outside.invalid/">Outside</a><script>fetch('https://outside.invalid')</script><form action="/delete"><button>Delete</button></form>`)
	hash, err := store.Put(page)
	if err != nil {
		t.Fatal(err)
	}
	css := []byte(`body{color:green}`)
	cssHash, err := store.Put(css)
	if err != nil {
		t.Fatal(err)
	}
	snapshot, err := store.Save(capsule.Snapshot{Label: "Example", Seeds: []string{"http://example.test/start"}, Resources: []capsule.Resource{
		{URL: "http://example.test/start", FinalURL: "http://example.test/dir/", Hash: hash, Size: int64(len(page)), Status: 200, MediaType: "text/html"},
		{URL: "http://example.test/dir/page.html", Hash: hash, Size: int64(len(page)), Status: 200, MediaType: "text/html"},
		{URL: "http://example.test/dir/style.css", Hash: cssHash, Size: int64(len(css)), Status: 200, MediaType: "text/css"},
		{URL: "http://example.test/gap", Status: 500, Error: "HTTP 500"},
	}})
	if err != nil {
		t.Fatal(err)
	}
	return store, snapshot
}

func get(handler http.Handler, path string) *httptest.ResponseRecorder {
	r := httptest.NewRecorder()
	handler.ServeHTTP(r, httptest.NewRequest(http.MethodGet, path, nil))
	return r
}

func TestReplayInertAndRewritesUsingFinalURL(t *testing.T) {
	store, snapshot := library(t)
	handler := New(store)
	r := get(handler, "/replay/"+snapshot.ID+"?url="+url.QueryEscape("http://example.test/start"))
	if r.Code != 200 {
		t.Fatalf("got %d: %s", r.Code, r.Body.String())
	}
	policy := r.Header().Get("Content-Security-Policy")
	for _, directive := range []string{"script-src 'none'", "connect-src 'none'", "form-action 'none'", "sandbox", "base-uri 'none'"} {
		if !strings.Contains(policy, directive) {
			t.Errorf("missing CSP directive %s", directive)
		}
	}
	body := r.Body.String()
	if strings.Contains(body, "<script") || strings.Contains(body, "<form") {
		t.Fatalf("active content remained: %s", body)
	}
	if !strings.Contains(body, "/replay/"+snapshot.ID+"?url="+url.QueryEscape("http://example.test/dir/page.html")+"#saved") {
		t.Errorf("link did not use redirect base or fragment: %s", body)
	}
	if !strings.Contains(body, "/missing?url=") {
		t.Errorf("uncaptured link did not resolve to local missing page: %s", body)
	}
	if r.Header().Get("X-Content-Type-Options") != "nosniff" {
		t.Error("missing nosniff")
	}
	if r.Header().Get("X-Waystation-Snapshot") != snapshot.ID {
		t.Error("missing provenance")
	}
	css := get(handler, "/replay/"+snapshot.ID+"?url="+url.QueryEscape("http://example.test/dir/style.css"))
	if css.Code != 200 || !strings.HasPrefix(css.Header().Get("Content-Type"), "text/css") {
		t.Fatalf("CSS cannot be replayed: %d", css.Code)
	}
}

func TestReadOnlyAPIAndMissing(t *testing.T) {
	store, snapshot := library(t)
	handler := New(store)
	r := get(handler, "/api/snapshots")
	var snapshots []capsule.Snapshot
	if err := json.Unmarshal(r.Body.Bytes(), &snapshots); err != nil {
		t.Fatal(err)
	}
	if len(snapshots) != 1 || snapshots[0].ID != snapshot.ID {
		t.Fatalf("wrong library: %#v", snapshots)
	}
	for _, path := range []string{"/api/snapshots/invalid", "/replay/not-a-snapshot?url=http://example.test/", "/replay/" + snapshot.ID + "?url=http://example.test/gap", "/replay/" + snapshot.ID + "?url=http://example.test/absent"} {
		if got := get(handler, path).Code; got != 404 {
			t.Errorf("%s returned %d, want 404", path, got)
		}
	}
	if got := get(handler, "/api/diff?before=../../secret&after="+snapshot.ID).Code; got != 400 {
		t.Errorf("invalid diff returned %d", got)
	}
	if got := get(handler, "/api/snapshots/%2e%2e%2fsecret").Code; got == 200 {
		t.Error("traversal accepted")
	}
	r = httptest.NewRecorder()
	handler.ServeHTTP(r, httptest.NewRequest(http.MethodPost, "/api/snapshots", strings.NewReader("{}")))
	if r.Code != http.StatusMethodNotAllowed {
		t.Errorf("write returned %d", r.Code)
	}
	r = get(handler, "/missing?url="+url.QueryEscape(`<script>alert(1)</script>`))
	if strings.Contains(r.Body.String(), "<script>") || !strings.Contains(r.Body.String(), "&lt;script&gt;") {
		t.Error("missing-page text is not escaped")
	}
}

func TestEmbeddedInterfaceAndEmptyLibrary(t *testing.T) {
	store, err := capsule.Open(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	handler := New(store)
	for _, path := range []string{"/", "/assets/style.css", "/assets/app.js"} {
		r := get(handler, path)
		if r.Code != 200 || r.Body.Len() == 0 {
			t.Errorf("asset %s unavailable", path)
		}
		if !strings.Contains(r.Header().Get("Content-Security-Policy"), "script-src 'self'") {
			t.Error("application CSP missing")
		}
	}
	if got := strings.TrimSpace(get(handler, "/api/snapshots").Body.String()); got != "[]" {
		t.Errorf("empty API: %s", got)
	}
}

func TestExecutableResourceIsAttachment(t *testing.T) {
	store, snapshot := library(t)
	data := []byte(`alert('never run')`)
	hash, err := store.Put(data)
	if err != nil {
		t.Fatal(err)
	}
	snapshot.ID = ""
	snapshot.Resources = append(snapshot.Resources, capsule.Resource{URL: "http://example.test/run.js", Hash: hash, Size: int64(len(data)), Status: 200, MediaType: "application/javascript"})
	snapshot, err = store.Save(snapshot)
	if err != nil {
		t.Fatal(err)
	}
	r := get(New(store), "/replay/"+snapshot.ID+"?url="+url.QueryEscape("http://example.test/run.js"))
	if r.Header().Get("Content-Type") != "application/octet-stream" || !strings.HasPrefix(r.Header().Get("Content-Disposition"), "attachment;") {
		t.Fatal("active resource not served as inert attachment")
	}
}

func TestXHTMLReplaysAsInertHTML(t *testing.T) {
	store, snapshot := library(t)
	data := []byte(`<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>XHTML archive</title></head><body><a href="/dir/page.html">Saved page</a><script type="text/javascript">alert(1)</script><form action="https://outside.invalid"><input name="x" /></form></body></html>`)
	hash, err := store.Put(data)
	if err != nil {
		t.Fatal(err)
	}
	snapshot.ID = ""
	snapshot.Resources = append(snapshot.Resources, capsule.Resource{URL: "http://example.test/index.xhtml", Hash: hash, Size: int64(len(data)), Status: 200, MediaType: "application/xhtml+xml; charset=utf-8"})
	snapshot, err = store.Save(snapshot)
	if err != nil {
		t.Fatal(err)
	}
	r := get(New(store), "/replay/"+snapshot.ID+"?url="+url.QueryEscape("http://example.test/index.xhtml"))
	if r.Code != http.StatusOK || r.Header().Get("Content-Type") != "text/html; charset=utf-8" || r.Header().Get("Content-Disposition") != "" {
		t.Fatalf("XHTML not replayed as HTML: status=%d headers=%v", r.Code, r.Header())
	}
	if !strings.Contains(r.Header().Get("Content-Security-Policy"), "script-src 'none'") {
		t.Error("XHTML replay lacks script-blocking CSP")
	}
	body := r.Body.String()
	if strings.Contains(body, "<script") || strings.Contains(body, "<form") {
		t.Fatalf("XHTML kept active content: %s", body)
	}
	if !strings.Contains(body, "/replay/"+snapshot.ID+"?url="+url.QueryEscape("http://example.test/dir/page.html")) {
		t.Fatalf("XHTML link was not rewritten: %s", body)
	}
}
