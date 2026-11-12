package webdoc

import (
	"reflect"
	"strings"
	"testing"
)

func TestCanonicalURL(t *testing.T) {
	for _, tc := range []struct{ input, want string }{
		{"HTTP://Example.COM:80#section", "http://example.com/"},
		{"https://EXAMPLE.com:443/a%2Fb?z=2&a=1#frag", "https://example.com/a%2Fb?z=2&a=1"},
		{"http://[::1]:8080/", "http://[::1]:8080/"},
	} {
		got, err := CanonicalURL(tc.input)
		if err != nil || got != tc.want {
			t.Errorf("CanonicalURL(%q) = %q, %v", tc.input, got, err)
		}
	}
	for _, bad := range []string{"file:///etc/passwd", "javascript:alert(1)", "http://user:password@example.com/", "//example.com/a", "http://example.com:0/", "https://example.com:65536/"} {
		if _, err := CanonicalURL(bad); err == nil {
			t.Errorf("accepted %q", bad)
		}
	}
}

func TestDiscoverBaseCSSAndSrcset(t *testing.T) {
	input := []byte(`<html><head><title>A &amp; B</title><base href="/docs/"><link rel="stylesheet" href="main.css"><style>body{background:url('../bg.png')} @import "print.css";</style></head><body><a href="page?q=1#part">Read</a><img src="one.png" srcset="data:image/png;base64,AAAA 1x, two.png 2x, three.png 3x"><script src="tracking.js"></script><a href="mailto:a@example.com">mail</a></body></html>`)
	title, links := Discover(input, "text/html; charset=utf-8", "https://example.com/start")
	if title != "A & B" {
		t.Fatalf("title %q", title)
	}
	want := []string{"https://example.com/bg.png", "https://example.com/docs/main.css", "https://example.com/docs/one.png", "https://example.com/docs/page?q=1", "https://example.com/docs/print.css", "https://example.com/docs/three.png", "https://example.com/docs/two.png"}
	if !reflect.DeepEqual(links, want) {
		t.Fatalf("links\n%q\nwant\n%q", links, want)
	}
}

func TestRewriteMakesArchiveInert(t *testing.T) {
	input := []byte(`<html><head><base href="/docs/"><meta http-equiv="refresh" content="0;url=https://outside.invalid"><script>alert(1)</script><style>p{background:url('../bg.png')}</style></head><body onload="alert(1)"><a href="chapter#part" ping="https://outside.invalid" target="_top">Read</a><img src="pic.png" onerror="alert(1)" srcset="a.png 1x, b.png 2x"><form action="https://outside.invalid"><input name="q"><button formaction="https://outside.invalid">Submit</button></form><iframe srcdoc="unsafe"></iframe><object data="x"></object><svg><script>alert(1)</script></svg><a href="javascript:alert(1)">Bad</a></body></html>`)
	got, err := Rewrite(input, "text/html", "https://example.com/start", func(u string) string { return "/local/" + strings.TrimPrefix(u, "https://example.com/") })
	if err != nil {
		t.Fatal(err)
	}
	s := string(got)
	for _, forbidden := range []string{"<script", "<base", "http-equiv", "onload", "onerror", "<form", "formaction", "<iframe", "<object", "<svg", "ping=", "target=", "javascript:"} {
		if strings.Contains(s, forbidden) {
			t.Errorf("replay contains %q: %s", forbidden, s)
		}
	}
	for _, required := range []string{`href="/local/docs/chapter#part"`, `src="/local/docs/pic.png"`, `srcset="/local/docs/a.png 1x, /local/docs/b.png 2x"`, `disabled="disabled"`, `url("/local/bg.png")`, `#waystation-unavailable`} {
		if !strings.Contains(s, required) {
			t.Errorf("missing %q in %s", required, s)
		}
	}
}

func TestCSSQuotedURLsAndEscapes(t *testing.T) {
	input := []byte(`@import "theme.css" screen; p { background: URL("a(b).png"); mask: url(\69 con.png); }`)
	_, links := Discover(input, "text/css", "https://example.com/css/main.css")
	want := []string{"https://example.com/css/a(b).png", "https://example.com/css/icon.png", "https://example.com/css/theme.css"}
	if !reflect.DeepEqual(links, want) {
		t.Fatalf("%q, want %q", links, want)
	}
	out, err := Rewrite(input, "text/css", "https://example.com/css/main.css", func(u string) string { return "/asset?url=" + u })
	if err != nil || !strings.Contains(string(out), `@import "/asset?url=https://example.com/css/theme.css"`) {
		t.Fatalf("rewrite %s, %v", out, err)
	}
}

func TestRewriteUnknownTypeIsUnchanged(t *testing.T) {
	input := []byte{0, 1, 2, 255}
	got, err := Rewrite(input, "image/png", "https://example.com/a.png", func(string) string { t.Fatal("unexpected resolver call"); return "" })
	if err != nil || !reflect.DeepEqual(input, got) {
		t.Fatalf("binary changed: %v", err)
	}
}

func TestCSSFragmentPreservedAfterLocalResolution(t *testing.T) {
	got, err := Rewrite([]byte(`filter:url("icons.svg#blur");`), "text/css", "https://example.com/theme/main.css", func(u string) string {
		if u != "https://example.com/theme/icons.svg" {
			t.Fatalf("resolver received noncanonical URL %q", u)
		}
		return "/replay/object?key=abc"
	})
	if err != nil || string(got) != `filter:url("/replay/object?key=abc#blur");` {
		t.Fatalf("fragment lost: %s, %v", got, err)
	}
}
