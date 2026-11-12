// Package webdoc finds static web dependencies and rewrites them for inert replay.
// It deliberately does not execute JavaScript or implement a browser's CSS engine.
package webdoc

import (
	"bytes"
	"fmt"
	"net"
	"net/url"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"unicode"

	"golang.org/x/net/html"
)

// CanonicalURL removes fragments and default ports without changing query order.
// Credentials are never accepted: a capture must not silently archive a login.
func CanonicalURL(raw string) (string, error) {
	u, err := url.Parse(strings.TrimSpace(raw))
	if err != nil {
		return "", err
	}
	u.Scheme = strings.ToLower(u.Scheme)
	if u.Scheme != "http" && u.Scheme != "https" {
		return "", fmt.Errorf("only http and https URLs are supported")
	}
	if u.Hostname() == "" || u.Opaque != "" || u.User != nil {
		return "", fmt.Errorf("URL needs a host and must not contain credentials")
	}
	host := strings.ToLower(u.Hostname())
	port := u.Port()
	if port != "" {
		n, e := strconv.Atoi(port)
		if e != nil || n < 1 || n > 65535 {
			return "", fmt.Errorf("invalid URL port")
		}
	}
	if (u.Scheme == "http" && port == "80") || (u.Scheme == "https" && port == "443") {
		port = ""
	}
	if port != "" {
		u.Host = net.JoinHostPort(host, port)
	} else if strings.Contains(host, ":") {
		u.Host = "[" + host + "]"
	} else {
		u.Host = host
	}
	u.Fragment, u.RawFragment = "", ""
	if u.Path == "" {
		u.Path = "/"
	}
	return u.String(), nil
}

func isHTML(mediaType string) bool {
	t := strings.ToLower(strings.TrimSpace(strings.Split(mediaType, ";")[0]))
	return t == "text/html" || t == "application/xhtml+xml"
}

func isCSS(mediaType string) bool {
	return strings.EqualFold(strings.TrimSpace(strings.Split(mediaType, ";")[0]), "text/css")
}

func resolveURL(base, raw string) (canonical, fragment string, ok bool) {
	b, err := url.Parse(base)
	if err != nil {
		return "", "", false
	}
	u, err := url.Parse(strings.TrimSpace(raw))
	if err != nil {
		return "", "", false
	}
	u = b.ResolveReference(u)
	fragment = u.EscapedFragment()
	canonical, err = CanonicalURL(u.String())
	return canonical, fragment, err == nil
}

func walk(n *html.Node, visit func(*html.Node)) {
	visit(n)
	for c := n.FirstChild; c != nil; c = c.NextSibling {
		walk(c, visit)
	}
}

func textContent(n *html.Node) string {
	var b strings.Builder
	walk(n, func(p *html.Node) {
		if p.Type == html.TextNode {
			b.WriteString(p.Data)
		}
	})
	return strings.Join(strings.Fields(b.String()), " ")
}

func documentBase(doc *html.Node, fallback string) string {
	base := fallback
	found := false
	walk(doc, func(n *html.Node) {
		if found || n.Type != html.ElementNode || n.Data != "base" {
			return
		}
		for _, a := range n.Attr {
			if a.Key == "href" {
				found = true
				if u, _, ok := resolveURL(fallback, a.Val); ok {
					base = u
				}
				return
			}
		}
	})
	return base
}

// Conventional CSS URL forms only. The browser CSP is the final network boundary
// for exotic CSS syntax; this extractor is not presented as a full CSS parser.
var cssURL = regexp.MustCompile(`(?is)url\(\s*(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|([^)'"\s][^)]*?))\s*\)`)
var cssImport = regexp.MustCompile(`(?is)@import\s+(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)')`)

func cssValue(m []string) string {
	for _, s := range m[1:] {
		if s != "" {
			return unescapeCSS(strings.TrimSpace(s))
		}
	}
	return ""
}

func unescapeCSS(s string) string {
	var b strings.Builder
	for i := 0; i < len(s); i++ {
		if s[i] != '\\' || i+1 == len(s) {
			b.WriteByte(s[i])
			continue
		}
		i++
		if s[i] == '\n' || s[i] == '\r' {
			continue
		}
		start := i
		for i < len(s) && i-start < 6 && ((s[i] >= '0' && s[i] <= '9') || (s[i] >= 'a' && s[i] <= 'f') || (s[i] >= 'A' && s[i] <= 'F')) {
			i++
		}
		if i > start {
			n, _ := strconv.ParseInt(s[start:i], 16, 32)
			if n == 0 || n > 0x10ffff || (n >= 0xd800 && n <= 0xdfff) {
				n = 0xfffd
			}
			b.WriteRune(rune(n))
			if i < len(s) && unicode.IsSpace(rune(s[i])) {
				i++
			}
			i--
		} else {
			b.WriteByte(s[i])
		}
	}
	return b.String()
}

func cssLinks(s string) []string {
	var out []string
	for _, re := range []*regexp.Regexp{cssURL, cssImport} {
		for _, m := range re.FindAllStringSubmatch(s, -1) {
			out = append(out, cssValue(m))
		}
	}
	return out
}

func rewriteCSS(s string, rewrite func(string) string) string {
	s = cssURL.ReplaceAllStringFunc(s, func(m string) string {
		return "url(" + strconv.Quote(rewrite(cssValue(cssURL.FindStringSubmatch(m)))) + ")"
	})
	return cssImport.ReplaceAllStringFunc(s, func(m string) string {
		return "@import " + strconv.Quote(rewrite(cssValue(cssImport.FindStringSubmatch(m))))
	})
}

// srcset follows the URL+descriptor tokenization used by HTML. In particular,
// commas inside data URLs are not interpreted as extra network URLs. Data URLs
// themselves are omitted because replay deliberately disallows them.
func srcsetValues(s string) [][2]string {
	var values [][2]string
	space := func(b byte) bool { return b == ' ' || b == '\t' || b == '\r' || b == '\n' || b == '\f' }
	for i := 0; i < len(s); {
		for i < len(s) && (space(s[i]) || s[i] == ',') {
			i++
		}
		start := i
		for i < len(s) && !space(s[i]) {
			i++
		}
		raw := s[start:i]
		if raw == "" {
			break
		}
		descriptor := ""
		if strings.HasSuffix(raw, ",") {
			raw = strings.TrimRight(raw, ",")
		} else {
			start = i
			parens := 0
			for i < len(s) {
				if s[i] == ',' && parens == 0 {
					break
				}
				if s[i] == '(' {
					parens++
				}
				if s[i] == ')' && parens > 0 {
					parens--
				}
				i++
			}
			descriptor = strings.Join(strings.Fields(s[start:i]), " ")
		}
		if raw != "" && !strings.HasPrefix(strings.ToLower(raw), "data:") {
			values = append(values, [2]string{raw, descriptor})
		}
	}
	return values
}

func isURLAttr(key string) bool {
	switch key {
	case "href", "src", "poster", "background", "cite", "longdesc":
		return true
	}
	return false
}

// Discover returns a title and sorted unique HTTP(S) edges, including edges to
// origins outside the capture scope. The capture package decides what to fetch.
func Discover(data []byte, mediaType, baseURL string) (title string, links []string) {
	seen := map[string]bool{}
	add := func(base, raw string) {
		if u, _, ok := resolveURL(base, raw); ok {
			seen[u] = true
		}
	}
	if isCSS(mediaType) {
		for _, raw := range cssLinks(string(data)) {
			add(baseURL, raw)
		}
	} else if isHTML(mediaType) {
		doc, err := html.Parse(bytes.NewReader(data))
		if err != nil {
			return "", nil
		}
		base := documentBase(doc, baseURL)
		walk(doc, func(n *html.Node) {
			if n.Type != html.ElementNode {
				return
			}
			if n.Data == "title" && title == "" {
				title = textContent(n)
			}
			if blockedTag(n) || n.Data == "base" {
				return
			}
			if n.Data == "style" {
				for _, raw := range cssLinks(textContentRaw(n)) {
					add(base, raw)
				}
			}
			for _, a := range n.Attr {
				if a.Namespace != "" {
					continue
				}
				switch {
				case isURLAttr(a.Key):
					add(base, a.Val)
				case a.Key == "srcset":
					for _, v := range srcsetValues(a.Val) {
						add(base, v[0])
					}
				case a.Key == "style":
					for _, raw := range cssLinks(a.Val) {
						add(base, raw)
					}
				}
			}
		})
	}
	for u := range seen {
		links = append(links, u)
	}
	sort.Strings(links)
	return title, links
}

func textContentRaw(n *html.Node) string {
	var b strings.Builder
	walk(n, func(p *html.Node) {
		if p.Type == html.TextNode {
			b.WriteString(p.Data)
		}
	})
	return b.String()
}

func blockedTag(n *html.Node) bool {
	if n.Namespace != "" {
		return true
	}
	switch n.Data {
	case "script", "iframe", "frame", "frameset", "object", "embed", "applet", "noscript", "template":
		return true
	}
	return false
}

func allowedAttr(key string) bool {
	if strings.HasPrefix(key, "aria-") {
		return true
	}
	switch key {
	case "class", "id", "title", "lang", "dir", "role", "hidden", "tabindex", "alt", "width", "height", "colspan", "rowspan", "scope", "headers", "abbr", "start", "reversed", "value", "type", "name", "content", "charset", "rel", "media", "sizes", "controls", "loop", "muted", "preload", "kind", "srclang", "label", "datetime", "open", "disabled", "checked", "selected", "placeholder", "rows", "cols", "span", "align", "border", "cellpadding", "cellspacing":
		return true
	}
	return false
}

// Rewrite makes HTML inert and rewrites conventional HTML/CSS references.
// resolve receives a fragment-free canonical URL. Fragments are appended again
// after resolving so in-page anchors work. Callers must also enforce a restrictive
// CSP and must not serve arbitrary active content (e.g. SVG) as a top-level page.
func Rewrite(data []byte, mediaType, baseURL string, resolve func(string) string) ([]byte, error) {
	base := baseURL
	rewrite := func(raw string) string {
		u, frag, ok := resolveURL(base, raw)
		if !ok {
			return "#waystation-unavailable"
		}
		local := resolve(u)
		if frag != "" {
			local += "#" + frag
		}
		return local
	}
	if isCSS(mediaType) {
		return []byte(rewriteCSS(string(data), rewrite)), nil
	}
	if !isHTML(mediaType) {
		return data, nil
	}
	doc, err := html.Parse(bytes.NewReader(data))
	if err != nil {
		return nil, err
	}
	base = documentBase(doc, baseURL)
	var clean func(*html.Node)
	clean = func(n *html.Node) {
		for child := n.FirstChild; child != nil; {
			next := child.NextSibling
			if child.Type == html.ElementNode && (blockedTag(child) || child.Data == "base") {
				n.RemoveChild(child)
				child = next
				continue
			}
			if child.Type == html.ElementNode {
				if child.Data == "meta" {
					remove := false
					for _, a := range child.Attr {
						if strings.EqualFold(a.Key, "http-equiv") {
							remove = true
						}
					}
					if remove {
						n.RemoveChild(child)
						child = next
						continue
					}
				}
				if child.Data == "form" {
					child.Data = "div"
					child.DataAtom = 0
				}
				attrs := make([]html.Attribute, 0, len(child.Attr))
				for _, a := range child.Attr {
					if a.Namespace != "" || strings.HasPrefix(strings.ToLower(a.Key), "on") {
						continue
					}
					switch {
					case isURLAttr(a.Key):
						a.Val = rewrite(a.Val)
					case a.Key == "srcset":
						var parts []string
						for _, v := range srcsetValues(a.Val) {
							p := rewrite(v[0])
							if v[1] != "" {
								p += " " + v[1]
							}
							parts = append(parts, p)
						}
						a.Val = strings.Join(parts, ", ")
					case a.Key == "style":
						a.Val = rewriteCSS(a.Val, rewrite)
					case !allowedAttr(a.Key):
						continue
					}
					attrs = append(attrs, a)
				}
				child.Attr = attrs
				switch child.Data {
				case "input", "button", "select", "textarea":
					child.Attr = append(child.Attr, html.Attribute{Key: "disabled", Val: "disabled"})
				}
				if child.Data == "style" {
					for c := child.FirstChild; c != nil; c = c.NextSibling {
						if c.Type == html.TextNode {
							c.Data = rewriteCSS(c.Data, rewrite)
						}
					}
				}
			}
			clean(child)
			child = next
		}
	}
	clean(doc)
	var b bytes.Buffer
	if err := html.Render(&b, doc); err != nil {
		return nil, err
	}
	return b.Bytes(), nil
}
