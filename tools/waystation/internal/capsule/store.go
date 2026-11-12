package capsule

import (
	"archive/zip"
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/url"
	"os"
	"path/filepath"
	"reflect"
	"regexp"
	"sort"
	"strings"
	"sync"
	"time"
)

// Store keeps immutable bodies and manifests in ordinary files. Use one Store
// per archive; concurrent methods on that Store are safe. Multiple processes
// must not write the same archive concurrently.
type Store struct {
	Root string
	mu   sync.Mutex
}

var (
	hashPattern = regexp.MustCompile(`^[0-9a-f]{64}$`)
	idPattern   = regexp.MustCompile(`^[0-9]{8}T[0-9]{6}Z-[0-9a-f]{16}$`)
)

const maxManifestBytes = 32 << 20

// Open creates an archive if necessary. It never adopts symlinked archive
// directories, so imported manifests cannot redirect reads outside the store.
func Open(root string) (*Store, error) {
	absolute, err := filepath.Abs(root)
	if err != nil {
		return nil, err
	}
	if err := realDir(absolute, true); err != nil {
		return nil, err
	}
	absolute, err = filepath.EvalSymlinks(absolute)
	if err != nil {
		return nil, err
	}
	for _, dir := range []string{"objects", "snapshots"} {
		if err := realDir(filepath.Join(absolute, dir), true); err != nil {
			return nil, err
		}
	}
	return &Store{Root: absolute}, nil
}

func realDir(path string, create bool) error {
	if create {
		if err := os.MkdirAll(path, 0700); err != nil {
			return err
		}
	}
	info, err := os.Lstat(path)
	if err != nil {
		return err
	}
	if !info.IsDir() || info.Mode()&os.ModeSymlink != 0 {
		return fmt.Errorf("archive directory is not a real directory: %s", path)
	}
	return nil
}

func regularFile(path string) error {
	info, err := os.Lstat(path)
	if err != nil {
		return err
	}
	if !info.Mode().IsRegular() {
		return fmt.Errorf("archive entry is not a regular file: %s", path)
	}
	return nil
}

func digest(data []byte) string {
	sum := sha256.Sum256(data)
	return hex.EncodeToString(sum[:])
}

func (s *Store) objectPath(hash string, create bool) (string, error) {
	if !hashPattern.MatchString(hash) {
		return "", fmt.Errorf("invalid object hash %q", hash)
	}
	if err := realDir(s.Root, false); err != nil {
		return "", err
	}
	if err := realDir(filepath.Join(s.Root, "objects"), false); err != nil {
		return "", err
	}
	dir := filepath.Join(s.Root, "objects", hash[:2])
	if err := realDir(dir, create); err != nil {
		return "", err
	}
	return filepath.Join(dir, hash), nil
}

func (s *Store) snapshotPath(id string) (string, error) {
	if !idPattern.MatchString(id) {
		return "", fmt.Errorf("invalid snapshot ID %q", id)
	}
	if err := realDir(s.Root, false); err != nil {
		return "", err
	}
	if err := realDir(filepath.Join(s.Root, "snapshots"), false); err != nil {
		return "", err
	}
	return filepath.Join(s.Root, "snapshots", id+".json"), nil
}

// atomicNew is called with the store write lock held. The destination is never
// overwritten, and readers see either no file or its complete synced contents.
func atomicNew(path string, data []byte) error {
	if _, err := os.Lstat(path); err == nil {
		return fmt.Errorf("%s: %w", path, os.ErrExist)
	} else if !errors.Is(err, os.ErrNotExist) {
		return err
	}
	f, err := os.CreateTemp(filepath.Dir(path), ".pending-*")
	if err != nil {
		return err
	}
	defer os.Remove(f.Name())
	if _, err = f.Write(data); err == nil {
		err = f.Sync()
	}
	if closeErr := f.Close(); err == nil {
		err = closeErr
	}
	if err != nil {
		return err
	}
	return os.Rename(f.Name(), path)
}

// Put stores a body by SHA-256. Existing identical bodies are reused; a corrupt
// existing object is reported rather than silently replaced.
func (s *Store) Put(data []byte) (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	hash := digest(data)
	path, err := s.objectPath(hash, true)
	if err != nil {
		return "", err
	}
	if _, err := os.Lstat(path); err == nil {
		if _, err := s.Get(hash); err != nil {
			return "", err
		}
		return hash, nil
	} else if !errors.Is(err, os.ErrNotExist) {
		return "", err
	}
	if err := atomicNew(path, data); err != nil {
		return "", err
	}
	return hash, nil
}

// Get verifies the content address before returning a body.
func (s *Store) Get(hash string) ([]byte, error) {
	path, err := s.objectPath(hash, false)
	if err != nil {
		return nil, err
	}
	if err := regularFile(path); err != nil {
		return nil, err
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	if digest(data) != hash {
		return nil, fmt.Errorf("object %s: SHA-256 mismatch", hash)
	}
	return data, nil
}

func sortedUnique(in []string) []string {
	out := append([]string(nil), in...)
	sort.Strings(out)
	if len(out) == 0 {
		return out
	}
	n := 1
	for _, item := range out[1:] {
		if item != out[n-1] {
			out[n] = item
			n++
		}
	}
	return out[:n]
}

func manifestID(snapshot Snapshot) (string, error) {
	snapshot.ID = ""
	data, err := json.Marshal(snapshot)
	if err != nil {
		return "", err
	}
	return snapshot.Created.UTC().Format("20060102T150405Z") + "-" + digest(data)[:16], nil
}

func httpURL(raw string) bool {
	u, err := url.Parse(raw)
	return err == nil && (u.Scheme == "http" || u.Scheme == "https") && u.Hostname() != "" && u.Opaque == ""
}

func validate(snapshot Snapshot, checkID bool) error {
	if snapshot.Version != FormatVersion {
		return fmt.Errorf("unsupported manifest version %d", snapshot.Version)
	}
	if snapshot.Created.IsZero() {
		return errors.New("manifest has no creation time")
	}
	if len(snapshot.Seeds) == 0 {
		return errors.New("manifest has no seed URLs")
	}
	for _, seed := range snapshot.Seeds {
		if !httpURL(seed) {
			return fmt.Errorf("invalid seed URL %q", seed)
		}
	}
	seen := make(map[string]bool)
	for _, resource := range snapshot.Resources {
		if !httpURL(resource.URL) || seen[resource.URL] {
			return fmt.Errorf("invalid or duplicate resource URL %q", resource.URL)
		}
		seen[resource.URL] = true
		if resource.FinalURL != "" && !httpURL(resource.FinalURL) {
			return fmt.Errorf("invalid final URL %q", resource.FinalURL)
		}
		if resource.Size < 0 || (resource.Hash == "" && resource.Size != 0) {
			return fmt.Errorf("invalid size for %s", resource.URL)
		}
		if resource.Hash != "" && !hashPattern.MatchString(resource.Hash) {
			return fmt.Errorf("invalid hash for %s", resource.URL)
		}
		if resource.Hash == "" && resource.Error == "" {
			return fmt.Errorf("resource has neither body nor error: %s", resource.URL)
		}
		if resource.Status < 0 || resource.Status > 599 || (resource.Status < 100 && resource.Status != 0) || (resource.Status == 0 && resource.Error == "") {
			return fmt.Errorf("invalid status for %s", resource.URL)
		}
		for _, link := range resource.Links {
			if !httpURL(link) {
				return fmt.Errorf("invalid link URL %q", link)
			}
		}
	}
	if checkID {
		id, err := manifestID(snapshot)
		if err != nil {
			return err
		}
		if !idPattern.MatchString(snapshot.ID) || snapshot.ID != id {
			return errors.New("manifest ID does not match its contents")
		}
	}
	return nil
}

// Save seals a snapshot. Its ID binds the manifest metadata as well as the
// content hashes. Inputs are copied before sorting so callers retain ownership.
func (s *Store) Save(snapshot Snapshot) (Snapshot, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if snapshot.Version == 0 {
		snapshot.Version = FormatVersion
	}
	if snapshot.Created.IsZero() {
		snapshot.Created = time.Now().UTC()
	}
	snapshot.Created = snapshot.Created.UTC()
	snapshot.Seeds = sortedUnique(snapshot.Seeds)
	snapshot.Resources = append([]Resource(nil), snapshot.Resources...)
	for i := range snapshot.Resources {
		snapshot.Resources[i].Links = sortedUnique(snapshot.Resources[i].Links)
	}
	sort.Slice(snapshot.Resources, func(i, j int) bool { return snapshot.Resources[i].URL < snapshot.Resources[j].URL })
	if err := validate(snapshot, false); err != nil {
		return Snapshot{}, err
	}
	id, err := manifestID(snapshot)
	if err != nil {
		return Snapshot{}, err
	}
	if snapshot.ID != "" && snapshot.ID != id {
		return Snapshot{}, errors.New("supplied snapshot ID does not match its contents")
	}
	snapshot.ID = id
	path, err := s.snapshotPath(id)
	if err != nil {
		return Snapshot{}, err
	}
	data, err := json.MarshalIndent(snapshot, "", "  ")
	if err != nil {
		return Snapshot{}, err
	}
	if len(data)+1 > maxManifestBytes {
		return Snapshot{}, errors.New("manifest exceeds 32 MiB")
	}
	if err := atomicNew(path, append(data, '\n')); err != nil {
		return Snapshot{}, err
	}
	return snapshot, nil
}

func (s *Store) Load(id string) (Snapshot, error) {
	path, err := s.snapshotPath(id)
	if err != nil {
		return Snapshot{}, err
	}
	if err := regularFile(path); err != nil {
		return Snapshot{}, err
	}
	f, err := os.Open(path)
	if err != nil {
		return Snapshot{}, err
	}
	defer f.Close()
	data, err := io.ReadAll(io.LimitReader(f, maxManifestBytes+1))
	if err != nil {
		return Snapshot{}, err
	}
	if len(data) > maxManifestBytes {
		return Snapshot{}, errors.New("manifest exceeds 32 MiB")
	}
	decoder := json.NewDecoder(bytes.NewReader(data))
	decoder.DisallowUnknownFields()
	var snapshot Snapshot
	if err := decoder.Decode(&snapshot); err != nil {
		return Snapshot{}, fmt.Errorf("read manifest %s: %w", id, err)
	}
	var extra any
	if err := decoder.Decode(&extra); err != io.EOF {
		return Snapshot{}, errors.New("manifest has trailing JSON data")
	}
	if snapshot.ID != id {
		return Snapshot{}, errors.New("manifest ID differs from its filename")
	}
	if err := validate(snapshot, true); err != nil {
		return Snapshot{}, fmt.Errorf("manifest %s: %w", id, err)
	}
	return snapshot, nil
}

// List fails on corrupt manifests instead of hiding damaged snapshots.
func (s *Store) List() ([]Snapshot, error) {
	dir := filepath.Join(s.Root, "snapshots")
	if err := realDir(s.Root, false); err != nil {
		return nil, err
	}
	if err := realDir(dir, false); err != nil {
		return nil, err
	}
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}
	out := make([]Snapshot, 0, len(entries))
	for _, entry := range entries {
		if !strings.HasSuffix(entry.Name(), ".json") {
			continue
		}
		snapshot, err := s.Load(strings.TrimSuffix(entry.Name(), ".json"))
		if err != nil {
			return nil, err
		}
		out = append(out, snapshot)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Created.Equal(out[j].Created) {
			return out[i].ID > out[j].ID
		}
		return out[i].Created.After(out[j].Created)
	})
	return out, nil
}

// Verify checks every referenced object once. Objects and Bytes count intact
// unique bodies. Capture failures are distinct from archive-integrity failures.
func (s *Store) Verify(id string) (Verification, error) {
	snapshot, err := s.Load(id)
	if err != nil {
		return Verification{}, err
	}
	result := Verification{Errors: []string{}}
	type checked struct {
		size int64
		err  error
	}
	seen := make(map[string]checked)
	for _, resource := range snapshot.Resources {
		if resource.Hash == "" {
			continue
		}
		check, ok := seen[resource.Hash]
		if !ok {
			data, err := s.Get(resource.Hash)
			check = checked{int64(len(data)), err}
			seen[resource.Hash] = check
			if err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("%s: %v", resource.Hash, err))
			} else {
				result.Objects++
				result.Bytes += check.size
			}
		}
		if check.err == nil && check.size != resource.Size {
			result.Errors = append(result.Errors, fmt.Sprintf("%s: size is %d, manifest says %d", resource.URL, check.size, resource.Size))
		}
	}
	return result, nil
}

// Export makes a portable archive using the same on-disk layout. Extract it
// into an empty directory and pass that directory to Open. Existing outputs are
// never replaced, and incomplete outputs are removed on any failure.
func (s *Store) Export(id, out string) (err error) {
	snapshot, err := s.Load(id)
	if err != nil {
		return err
	}
	verified, err := s.Verify(id)
	if err != nil {
		return err
	}
	if len(verified.Errors) != 0 {
		return fmt.Errorf("cannot export damaged archive: %s", strings.Join(verified.Errors, "; "))
	}
	f, err := os.OpenFile(out, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0600)
	if err != nil {
		return err
	}
	defer func() {
		if closeErr := f.Close(); err == nil {
			err = closeErr
		}
		if err != nil {
			os.Remove(out)
		}
	}()
	zw := zip.NewWriter(f)
	write := func(name string, data []byte) error {
		header := &zip.FileHeader{Name: name, Method: zip.Deflate}
		header.SetModTime(snapshot.Created)
		header.SetMode(0600)
		entry, err := zw.CreateHeader(header)
		if err != nil {
			return err
		}
		_, err = entry.Write(data)
		return err
	}
	manifest, err := json.MarshalIndent(snapshot, "", "  ")
	if err != nil {
		return err
	}
	if err := write("snapshots/"+id+".json", append(manifest, '\n')); err != nil {
		return err
	}
	seen := make(map[string]bool)
	for _, resource := range snapshot.Resources {
		if resource.Hash == "" || seen[resource.Hash] {
			continue
		}
		seen[resource.Hash] = true
		data, err := s.Get(resource.Hash)
		if err != nil {
			return err
		}
		if err := write("objects/"+resource.Hash[:2]+"/"+resource.Hash, data); err != nil {
			return err
		}
	}
	if err := zw.Close(); err != nil {
		return err
	}
	return f.Sync()
}

// Diff compares bodies, response metadata, capture failures and discovered links.
func Diff(before, after Snapshot) []Change {
	old := make(map[string]Resource, len(before.Resources))
	next := make(map[string]Resource, len(after.Resources))
	for _, resource := range before.Resources {
		old[resource.URL] = resource
	}
	for _, resource := range after.Resources {
		next[resource.URL] = resource
	}
	changes := make([]Change, 0)
	for address, resource := range old {
		updated, found := next[address]
		if !found {
			changes = append(changes, Change{Kind: "removed", URL: address, BeforeHash: resource.Hash})
		} else {
			resource.Links = sortedUnique(resource.Links)
			updated.Links = sortedUnique(updated.Links)
			if !reflect.DeepEqual(resource, updated) {
				changes = append(changes, Change{Kind: "changed", URL: address, BeforeHash: resource.Hash, AfterHash: updated.Hash})
			}
		}
	}
	for address, resource := range next {
		if _, found := old[address]; !found {
			changes = append(changes, Change{Kind: "added", URL: address, AfterHash: resource.Hash})
		}
	}
	sort.Slice(changes, func(i, j int) bool { return changes[i].URL < changes[j].URL })
	return changes
}
