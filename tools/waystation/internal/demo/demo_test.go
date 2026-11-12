package demo

import (
	"archive/zip"
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/jsdyer/jsdyer.github.io/tools/waystation/internal/capsule"
	"github.com/jsdyer/jsdyer.github.io/tools/waystation/internal/viewer"
	"github.com/jsdyer/jsdyer.github.io/tools/waystation/internal/webdoc"
)

// The product promise: capture, stop the origin, move a capsule, keep browsing.
func TestUnplugExportReplay(t *testing.T) {
	s, err := capsule.Open(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	snaps, err := Seed(context.Background(), s)
	if err != nil {
		t.Fatal(err)
	}
	client := http.Client{Timeout: time.Second}
	if resp, err := client.Get(snaps[0].Seeds[0]); err == nil {
		resp.Body.Close()
		t.Fatal("demo origin still responds")
	}
	changes := capsule.Diff(snaps[0], snaps[1])
	kinds := map[string]bool{}
	for _, c := range changes {
		kinds[c.Kind] = true
	}
	for _, k := range []string{"added", "removed", "changed"} {
		if !kinds[k] {
			t.Fatalf("missing %s change: %+v", k, changes)
		}
	}
	archive := filepath.Join(t.TempDir(), "capsule.zip")
	if err = s.Export(snaps[1].ID, archive); err != nil {
		t.Fatal(err)
	}
	z, err := zip.OpenReader(archive)
	if err != nil {
		t.Fatal(err)
	}
	defer z.Close()
	root := t.TempDir()
	for _, f := range z.File {
		if !filepath.IsLocal(filepath.FromSlash(f.Name)) {
			t.Fatalf("unsafe ZIP path %s", f.Name)
		}
		dest := filepath.Join(root, filepath.FromSlash(f.Name))
		if f.FileInfo().IsDir() {
			if err := os.MkdirAll(dest, 0700); err != nil {
				t.Fatal(err)
			}
			continue
		}
		if err := os.MkdirAll(filepath.Dir(dest), 0700); err != nil {
			t.Fatal(err)
		}
		r, err := f.Open()
		if err != nil {
			t.Fatal(err)
		}
		data, err := io.ReadAll(r)
		r.Close()
		if err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(dest, data, 0600); err != nil {
			t.Fatal(err)
		}
	}
	copy, err := capsule.Open(root)
	if err != nil {
		t.Fatal(err)
	}
	v, err := copy.Verify(snaps[1].ID)
	if err != nil || len(v.Errors) > 0 {
		t.Fatalf("portable verification: %+v %v", v, err)
	}
	h := viewer.New(copy)
	for _, resource := range snaps[1].Resources {
		path := "/replay/" + snaps[1].ID + "?url=" + url.QueryEscape(resource.URL)
		w := httptest.NewRecorder()
		h.ServeHTTP(w, httptest.NewRequest("GET", path, nil))
		if w.Code != 200 {
			t.Fatalf("offline replay %s: %d %s", resource.URL, w.Code, w.Body.String())
		}
		if !strings.Contains(w.Header().Get("Content-Security-Policy"), "script-src 'none'") {
			t.Fatal("replay permits scripts")
		}
		if resource.MediaType == "text/html" || resource.MediaType == "text/css" {
			_, links := webdoc.Discover(w.Body.Bytes(), resource.MediaType, "http://waystation.invalid"+path)
			for _, linked := range links {
				if !strings.HasPrefix(linked, "http://waystation.invalid/") {
					t.Errorf("live link survived replay: %s", linked)
				}
			}
		}
	}
}
