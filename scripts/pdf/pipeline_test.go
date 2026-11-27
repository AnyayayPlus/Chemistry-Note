package main

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestArticleFingerprintIncludesThemeAndReferencedImage(t *testing.T) {
	root := t.TempDir()
	dist, printDir := filepath.Join(root, "dist"), filepath.Join(root, "print")
	for _, dir := range []string{dist, filepath.Join(printDir, "assets")} {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			t.Fatal(err)
		}
	}
	put := func(path, text string) {
		t.Helper()
		if err := os.WriteFile(filepath.Join(dist, path), []byte(text), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	put("theme.css", ".vp-doc {color: black}")
	put("image.svg", "<svg>before</svg>")
	put("one.html", `<link rel="preload stylesheet" href="/theme.css"><div class="vp-doc"><h1>标题</h1><img src="/image.svg?cache=1"></div>`)
	put("two.html", `<link rel="stylesheet" href="/theme.css"><div class="vp-doc"><h1>其他内容</h1></div>`)
	o := buildOptions{dist: dist}
	fingerprint := func(name string) string {
		t.Helper()
		u, _, err := o.prepareUnit(unit{HTML: name, URL: "/" + name}, printDir, "recipe", map[string]preparedAsset{})
		if err != nil {
			t.Fatal(err)
		}
		return u.Fingerprint
	}
	first, second := fingerprint("one.html"), fingerprint("two.html")
	put("image.svg", "<svg>after</svg>")
	imageChange := fingerprint("one.html")
	if first == imageChange || second != fingerprint("two.html") {
		t.Fatal("the image should invalidate only its reader")
	}
	put("theme.css", ".vp-doc {color: red}")
	if imageChange == fingerprint("one.html") || second == fingerprint("two.html") {
		t.Fatal("theme changes should invalidate all printed articles")
	}
}

func TestPublicationKeepsPriorVersionOnFailedUpload(t *testing.T) {
	ctx := context.Background()
	root := t.TempDir()
	remote := filepath.Join(root, "remote.git")
	callGit := func(dir string, args ...string) string {
		t.Helper()
		out, err := git(ctx, dir, args...)
		if err != nil {
			t.Fatalf("git %v: %v", args, err)
		}
		return out
	}
	callGit(root, "init", "--quiet", "--bare", "--initial-branch=main", remote)
	writer := filepath.Join(root, "writer")
	callGit(root, "clone", "--quiet", remote, writer)
	put := func(path string, data []byte) {
		t.Helper()
		if err := os.WriteFile(path, data, 0o644); err != nil {
			t.Fatal(err)
		}
	}
	put(filepath.Join(writer, "obsolete.pdf"), []byte("old"))
	put(filepath.Join(writer, "README.md"), []byte("keep"))
	callGit(writer, "add", ".")
	callGit(writer, "-c", "user.name=Test", "-c", "user.email=test@example.test", "commit", "-m", "old")
	callGit(writer, "push", "--quiet", "origin", "main")
	previous := callGit(remote, "rev-parse", "main")

	output := filepath.Join(root, "artifacts")
	if err := os.MkdirAll(filepath.Join(output, "units"), 0o755); err != nil {
		t.Fatal(err)
	}
	body, book := []byte("new unit"), []byte("new book")
	put(filepath.Join(output, "units", "unit.pdf"), body)
	put(filepath.Join(output, bookName), book)
	m := manifest{
		Schema: 1, Source: strings.Repeat("b", 40), Edition: strings.Repeat("a", 64),
		Units: []unit{{PDF: "unit.pdf", SHA256: digest(body)}},
		Book:  bookInfo{Name: bookName, SHA256: digest(book), Size: int64(len(book))},
	}
	if err := writeJSON(filepath.Join(output, manifestName), m); err != nil {
		t.Fatal(err)
	}
	if err := writeJSON(filepath.Join(output, "result.json"), result{true, m.Edition}); err != nil {
		t.Fatal(err)
	}

	var server *httptest.Server
	fail, created, confirmed := true, false, false
	var uploaded []byte
	server = httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		respond := func(v any) { _ = json.NewEncoder(w).Encode(v) }
		if r.URL.Path == "/put" {
			if r.Method != http.MethodPut || r.Header.Get("Authorization") != "" {
				t.Error("signed request must use PUT without forwarding credentials")
			}
			if fail {
				w.WriteHeader(http.StatusServiceUnavailable)
				return
			}
			uploaded, _ = io.ReadAll(r.Body)
			return
		}
		if r.Header.Get("Authorization") != "Bearer simulation" {
			t.Error("expected simulated credentials on API calls")
		}
		switch {
		case r.URL.Path == "/releases" && r.Method == http.MethodPost:
			created = true
			respond(map[string]string{"id": "1"})
		case strings.HasPrefix(r.URL.Path, "/releases/tags/"):
			if !created {
				w.WriteHeader(http.StatusNotFound)
			} else if !confirmed {
				respond(map[string]string{"id": "1"})
			} else {
				respond(map[string]any{"id": "1", "assets": []map[string]any{{
					"name": bookName, "size": len(uploaded), "hash_algo": "SHA-256", "hash_value": digest(uploaded),
				}}})
			}
		case r.URL.Path == "/releases/1/asset-upload-url":
			respond(map[string]string{
				"upload_url": server.URL + "/put",
				"verify_url": server.URL + "/releases/1/asset-upload-confirmation/token/file",
			})
		case r.URL.Path == "/releases/1/asset-upload-confirmation/token/file":
			confirmed = digest(uploaded) == m.Book.SHA256
		case strings.HasPrefix(r.URL.Path, "/releases/download/") && r.Method == http.MethodHead && confirmed:
			w.WriteHeader(http.StatusOK)
		default:
			t.Errorf("unexpected request %s %s", r.Method, r.URL)
			w.WriteHeader(http.StatusBadRequest)
		}
	}))
	defer server.Close()
	p := publisher{server.URL, "simulation", server.Client(), func(context.Context, string) error { return nil }}
	if err := p.publish(ctx, output, writer); err == nil || !strings.Contains(err.Error(), "503") {
		t.Fatalf("expected upload failure, got %v", err)
	}
	if got := callGit(remote, "rev-parse", "main"); got != previous {
		t.Fatal("upload failure advanced the published branch")
	}
	if got := callGit(remote, "show", "main:obsolete.pdf"); got != "old" {
		t.Fatal("upload failure invalidated the previous PDF")
	}
	fail = false
	retry := filepath.Join(root, "retry")
	callGit(root, "clone", "--quiet", remote, retry)
	if err := p.publish(ctx, output, retry); err != nil {
		t.Fatal(err)
	}
	if got := callGit(remote, "ls-tree", "-r", "--name-only", "main"); got != "README.md\npdf-manifest.json\nunit.pdf" {
		t.Fatalf("unexpected files in the published branch: %s", got)
	}
	published, err := loadManifest(retry)
	if err != nil || !confirmed || published.Book.Tag == "" || published.Book.SHA256 != m.Book.SHA256 {
		t.Fatalf("invalid published edition: %v, %v", published.Book, err)
	}
	download := downloadPath(published.Book.Tag, bookName)
	if published.Book.URL != cnbPublic+download {
		t.Fatalf("published URL must use the public download host, got %q", published.Book.URL)
	}

	published.Book.URL = cnbAPI + download
	if err := writeJSON(filepath.Join(retry, manifestName), published); err != nil {
		t.Fatal(err)
	}
	callGit(retry, "add", manifestName)
	callGit(retry, "-c", "user.name=Test", "-c", "user.email=test@example.test", "commit", "-m", "old download URL")
	callGit(retry, "push", "--quiet", "origin", "main")
	if err := writeJSON(filepath.Join(output, "result.json"), result{false, m.Edition}); err != nil {
		t.Fatal(err)
	}
	if err := p.publish(ctx, output, retry); err != nil {
		t.Fatal(err)
	}
	var repaired manifest
	if err := json.Unmarshal([]byte(callGit(remote, "show", "main:"+manifestName)), &repaired); err != nil {
		t.Fatal(err)
	}
	if repaired.Book.URL != cnbPublic+download || repaired.Source != published.Source || repaired.Book.SHA256 != published.Book.SHA256 {
		t.Fatalf("unexpected migration result: %v", repaired)
	}
}
