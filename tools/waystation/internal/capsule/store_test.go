package capsule

import (
	"archive/zip"
	"encoding/json"
	"errors"
	"io"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"sync"
	"testing"
	"time"
)

func testStore(t *testing.T) *Store {
	t.Helper()
	s, err := Open(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	return s
}

func testSnapshot(t *testing.T, s *Store) Snapshot {
	t.Helper()
	body := []byte("A small web worth keeping.\n")
	hash, err := s.Put(body)
	if err != nil {
		t.Fatal(err)
	}
	return Snapshot{
		Created: time.Date(2026, 11, 12, 15, 0, 0, 123, time.UTC),
		Label:   "The attic — November",
		Seeds:   []string{"http://lab.example/"},
		Resources: []Resource{
			{URL: "http://lab.example/b", Hash: hash, Size: int64(len(body)), Status: 200, MediaType: "text/plain", Links: []string{"http://lab.example/z", "http://lab.example/a", "http://lab.example/a"}},
			{URL: "http://lab.example/a", Hash: hash, Size: int64(len(body)), Status: 200, MediaType: "text/plain"},
			{URL: "http://lab.example/missing", Error: "connection refused", Status: 0},
		},
	}
}

func mustSave(t *testing.T, s *Store, snapshot Snapshot) Snapshot {
	t.Helper()
	result, err := s.Save(snapshot)
	if err != nil {
		t.Fatal(err)
	}
	return result
}

func TestRoundTripDedupAndImmutableManifest(t *testing.T) {
	s := testStore(t)
	input := testSnapshot(t, s)
	snapshot := mustSave(t, s, input)
	if input.Resources[0].URL != "http://lab.example/b" || len(input.Resources[0].Links) != 3 {
		t.Fatal("Save mutated caller data")
	}
	if snapshot.Resources[0].URL != "http://lab.example/a" || len(snapshot.Resources[1].Links) != 2 {
		t.Fatal("manifest was not normalized")
	}
	loaded, err := s.Load(snapshot.ID)
	if err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(snapshot, loaded) {
		t.Fatalf("round-trip mismatch: %#v", loaded)
	}
	if _, err := s.Save(snapshot); !errors.Is(err, os.ErrExist) {
		t.Fatalf("overwrote immutable manifest: %v", err)
	}
	result, err := s.Verify(snapshot.ID)
	if err != nil {
		t.Fatal(err)
	}
	if result.Objects != 1 || result.Bytes != input.Resources[0].Size || len(result.Errors) != 0 {
		t.Fatalf("bad verification or object deduplication: %#v", result)
	}
	newer := input
	newer.Created = newer.Created.Add(time.Hour)
	latest := mustSave(t, s, newer)
	all, err := s.List()
	if err != nil {
		t.Fatal(err)
	}
	if len(all) != 2 || all[0].ID != latest.ID {
		t.Fatalf("wrong ordering: %#v", all)
	}
}

func TestConcurrentPutAndCorruptObject(t *testing.T) {
	s := testStore(t)
	body := []byte("identical concurrent object")
	var wg sync.WaitGroup
	for range 20 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if _, err := s.Put(body); err != nil {
				t.Error(err)
			}
		}()
	}
	wg.Wait()
	hash := digest(body)
	path, err := s.objectPath(hash, false)
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, []byte("tampered"), 0600); err != nil {
		t.Fatal(err)
	}
	if _, err := s.Get(hash); err == nil {
		t.Fatal("Get accepted corrupt body")
	}
	if _, err := s.Put(body); err == nil {
		t.Fatal("Put silently replaced corruption")
	}
	actual, _ := os.ReadFile(path)
	if string(actual) != "tampered" {
		t.Fatal("corrupt object was overwritten")
	}
}

func TestVerificationFindsMissingTamperedAndWrongSize(t *testing.T) {
	for _, mode := range []string{"missing", "tampered", "size"} {
		t.Run(mode, func(t *testing.T) {
			s := testStore(t)
			input := testSnapshot(t, s)
			if mode == "size" {
				input.Resources[0].Size++
			}
			snapshot := mustSave(t, s, input)
			path, _ := s.objectPath(input.Resources[0].Hash, false)
			switch mode {
			case "missing":
				if err := os.Remove(path); err != nil {
					t.Fatal(err)
				}
			case "tampered":
				if err := os.WriteFile(path, []byte("replacement"), 0600); err != nil {
					t.Fatal(err)
				}
			}
			result, err := s.Verify(snapshot.ID)
			if err != nil {
				t.Fatal(err)
			}
			if len(result.Errors) == 0 {
				t.Fatal("damage was not found")
			}
			out := filepath.Join(t.TempDir(), "bad.zip")
			if err := s.Export(snapshot.ID, out); err == nil {
				t.Fatal("exported damaged snapshot")
			}
			if _, err := os.Stat(out); !errors.Is(err, os.ErrNotExist) {
				t.Fatal("left an output for failed export")
			}
		})
	}
}

func TestManifestTamperAndTraversal(t *testing.T) {
	s := testStore(t)
	snapshot := mustSave(t, s, testSnapshot(t, s))
	for _, invalid := range []string{"", "..", "../outside", `..\outside`, strings.Repeat("a", 64), snapshot.ID + "/../x"} {
		if _, err := s.Load(invalid); err == nil {
			t.Fatalf("accepted ID %q", invalid)
		}
		if _, err := s.Get(invalid); err == nil {
			t.Fatalf("accepted hash %q", invalid)
		}
	}
	path, _ := s.snapshotPath(snapshot.ID)
	snapshot.Label = "different metadata"
	data, _ := json.Marshal(snapshot)
	if err := os.WriteFile(path, data, 0600); err != nil {
		t.Fatal(err)
	}
	if _, err := s.Load(snapshot.ID); err == nil {
		t.Fatal("accepted tampered manifest")
	}
	if _, err := s.List(); err == nil {
		t.Fatal("silently hid damaged snapshot")
	}
	if err := os.WriteFile(path, []byte("{broken json"), 0600); err != nil {
		t.Fatal(err)
	}
	if _, err := s.Load(snapshot.ID); err == nil {
		t.Fatal("accepted broken JSON")
	}
}

func TestRejectSymlinkObject(t *testing.T) {
	s := testStore(t)
	body := []byte("outside")
	hash := digest(body)
	outside := filepath.Join(t.TempDir(), "outside")
	if err := os.WriteFile(outside, body, 0600); err != nil {
		t.Fatal(err)
	}
	path, err := s.objectPath(hash, true)
	if err != nil {
		t.Fatal(err)
	}
	if err := os.Symlink(outside, path); err != nil {
		t.Skipf("symlinks unavailable: %v", err)
	}
	if _, err := s.Get(hash); err == nil {
		t.Fatal("followed object symlink")
	}
	if _, err := s.Put(body); err == nil {
		t.Fatal("accepted symlink as immutable object")
	}
}

func TestExportCanBeExtractedAndVerified(t *testing.T) {
	s := testStore(t)
	snapshot := mustSave(t, s, testSnapshot(t, s))
	out := filepath.Join(t.TempDir(), "capsule.zip")
	if err := s.Export(snapshot.ID, out); err != nil {
		t.Fatal(err)
	}
	if err := s.Export(snapshot.ID, out); !errors.Is(err, os.ErrExist) {
		t.Fatalf("replaced existing export: %v", err)
	}
	zr, err := zip.OpenReader(out)
	if err != nil {
		t.Fatal(err)
	}
	defer zr.Close()
	if len(zr.File) != 2 {
		t.Fatalf("expected one manifest and one deduplicated object, got %d", len(zr.File))
	}
	destination := t.TempDir()
	for _, file := range zr.File {
		if strings.HasPrefix(file.Name, "/") || strings.Contains(file.Name, "..") || strings.Contains(file.Name, `\`) {
			t.Fatalf("unsafe ZIP path %q", file.Name)
		}
		r, err := file.Open()
		if err != nil {
			t.Fatal(err)
		}
		data, err := io.ReadAll(r)
		r.Close()
		if err != nil {
			t.Fatal(err)
		}
		path := filepath.Join(destination, filepath.FromSlash(file.Name))
		if err := os.MkdirAll(filepath.Dir(path), 0700); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(path, data, 0600); err != nil {
			t.Fatal(err)
		}
	}
	restored, err := Open(destination)
	if err != nil {
		t.Fatal(err)
	}
	result, err := restored.Verify(snapshot.ID)
	if err != nil || len(result.Errors) != 0 || result.Objects != 1 {
		t.Fatalf("portable capsule failed: %#v, %v", result, err)
	}
}

func TestDiffIncludesMetadataAndFailures(t *testing.T) {
	before := Snapshot{Resources: []Resource{
		{URL: "http://example/a", Hash: "same", Status: 200, Links: []string{"http://example/z", "http://example/y"}},
		{URL: "http://example/b", Hash: "same", Status: 200},
		{URL: "http://example/c", Error: "timeout"},
		{URL: "http://example/d", Hash: "removed"},
	}}
	after := Snapshot{Resources: []Resource{
		{URL: "http://example/a", Hash: "same", Status: 200, Links: []string{"http://example/y", "http://example/z"}},
		{URL: "http://example/b", Hash: "same", Status: 404},
		{URL: "http://example/c", Error: "connection refused"},
		{URL: "http://example/e", Hash: "added"},
	}}
	changes := Diff(before, after)
	if len(changes) != 4 {
		t.Fatalf("wrong changes: %#v", changes)
	}
	for i, expected := range []string{"changed", "changed", "removed", "added"} {
		if changes[i].Kind != expected {
			t.Fatalf("wrong change: %#v", changes[i])
		}
	}
}
