package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestViewerHostBoundary(t *testing.T) {
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusNoContent) })
	for _, test := range []struct {
		bind, host string
		status     int
	}{
		{"127.0.0.1", "127.0.0.1:8787", 204},
		{"127.0.0.1", "localhost:8787", 204},
		{"127.0.0.1", "[::1]:8787", 204},
		{"127.0.0.1", "attacker.example:8787", 403},
		{"127.0.0.1", "127.0.0.1.attacker.example", 403},
		{"192.0.2.10", "192.0.2.10:8787", 204},
		{"192.0.2.10", "attacker.example", 403},
	} {
		r := httptest.NewRequest("GET", "http://localhost/api/snapshots", nil)
		r.Host = test.host
		w := httptest.NewRecorder()
		hostGuard(next, test.bind).ServeHTTP(w, r)
		if w.Code != test.status {
			t.Errorf("bind=%s host=%s got %d want %d", test.bind, test.host, w.Code, test.status)
		}
	}
}
