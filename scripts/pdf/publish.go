package main

import (
	"bytes"
	"context"
	"crypto/md5"
	"crypto/sha1"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

const cnbAPI = "https://api.cnb.cool/Seeridia/Chemistry-Note-File/-"

var legacyFiles = map[string]string{
	".cnb.yml":         "330f8a7e782c603d9989dff1d77f5e18e63258745c59460e39f302e9af25a1b4",
	"merge_pdfs.py":    "f97c27149e862cd22d05a93d85909561521b489f75cf81984fc4308b31cab91d",
	"requirements.txt": "e63702381460bd5402f4959efea25a1ec57afdc6c43e0e47f5609c4ad74da0f0",
}

type publisher struct {
	api, token  string
	client      *http.Client
	checkSource func(context.Context, string) error
}

type release struct {
	ID     string `json:"id"`
	Assets []struct {
		Name      string `json:"name"`
		Size      int64  `json:"size"`
		HashAlgo  string `json:"hash_algo"`
		HashValue string `json:"hash_value"`
	} `json:"assets"`
}

func publish(ctx context.Context, output, repo, token string) error {
	p := publisher{cnbAPI, token, &http.Client{
		Timeout:       150 * time.Second,
		CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse },
	}, ensureCurrentSource}
	return p.publish(ctx, output, repo)
}

func ensureCurrentSource(ctx context.Context, expected string) error {
	repo, branch := os.Getenv("GITHUB_REPOSITORY"), os.Getenv("GITHUB_REF_NAME")
	if repo != "AnyayayPlus/Chemistry-Note" || branch != "master" {
		return errors.New("cloud publication requires the production GitHub branch")
	}
	latest, err := git(ctx, "", "ls-remote", "https://github.com/"+repo+".git", "refs/heads/"+branch)
	if err != nil {
		return err
	}
	fields := strings.Fields(latest)
	if len(fields) == 0 || fields[0] != expected {
		return errors.New("this run is no longer the head of the source branch")
	}
	return nil
}

func (p publisher) call(ctx context.Context, method, path string, payload, response any) (int, error) {
	var body io.Reader
	if payload != nil {
		data, err := json.Marshal(payload)
		if err != nil {
			return 0, err
		}
		body = bytes.NewReader(data)
	}
	req, err := http.NewRequestWithContext(ctx, method, p.api+path, body)
	if err != nil {
		return 0, err
	}
	req.Header.Set("Authorization", "Bearer "+p.token)
	req.Header.Set("Accept", "application/vnd.cnb.api+json")
	if payload != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	r, err := p.client.Do(req)
	if err != nil {
		// The confirmation URL can contain a temporary upload token.
		return 0, fmt.Errorf("CNB %s request failed: %v", method, ctx.Err())
	}
	defer r.Body.Close()
	if r.StatusCode < 200 || r.StatusCode >= 300 {
		return r.StatusCode, fmt.Errorf("CNB %s returned HTTP %d", method, r.StatusCode)
	}
	if response != nil {
		if err := json.NewDecoder(io.LimitReader(r.Body, 4<<20)).Decode(response); err != nil {
			return r.StatusCode, fmt.Errorf("decode CNB response: %w", err)
		}
	}
	return r.StatusCode, nil
}

func downloadPath(tag, name string) string {
	return "/releases/download/" + url.PathEscape(tag) + "/" + url.PathEscape(name)
}

func (r release) contains(book bookInfo, data []byte) bool {
	for _, asset := range r.Assets {
		if asset.Name != book.Name || asset.Size != book.Size {
			continue
		}
		var sum string
		switch strings.ReplaceAll(strings.ToLower(asset.HashAlgo), "-", "") {
		case "sha256":
			sum = digest(data)
		case "sha1":
			sum = fmt.Sprintf("%x", sha1.Sum(data))
		case "md5":
			sum = fmt.Sprintf("%x", md5.Sum(data))
		}
		if sum != "" && strings.EqualFold(sum, asset.HashValue) {
			return true
		}
	}
	return false
}

func (p publisher) put(ctx context.Context, target string, data []byte) error {
	u, err := url.Parse(target)
	if err != nil || u.Scheme != "https" || u.Host == "" || u.User != nil {
		return errors.New("invalid CNB attachment upload URL")
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPut, target, bytes.NewReader(data))
	if err != nil {
		return errors.New("invalid CNB attachment upload request")
	}
	req.Header.Set("Content-Type", "application/pdf")
	response, err := p.client.Do(req)
	if err != nil {
		return errors.New("CNB attachment upload failed")
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return fmt.Errorf("CNB attachment upload returned HTTP %d", response.StatusCode)
	}
	return nil
}

func (p publisher) publishBook(ctx context.Context, m *manifest, data []byte, base string) error {
	b := &m.Book
	b.Tag = "pdf-" + m.Edition[:16] + "-" + b.SHA256[:16]
	releasePath := "/releases/tags/" + b.Tag
	var r release
	status, err := p.call(ctx, http.MethodGet, releasePath, nil, &r)
	if err != nil && status != http.StatusNotFound {
		return err
	}
	if status == http.StatusNotFound {
		_, err := p.call(ctx, http.MethodPost, "/releases", map[string]string{
			"tag_name": b.Tag, "target_commitish": base, "name": "Chemistry Note · " + m.Source[:8],
			"body": "Source: " + m.Source + "\nSHA-256: " + b.SHA256, "make_latest": "false",
		}, &r)
		if err != nil {
			return err
		}
	}
	if !r.contains(*b, data) {
		if r.ID == "" {
			return errors.New("CNB returned a release without an ID")
		}
		path := "/releases/" + url.PathEscape(r.ID) + "/asset-upload"
		var endpoints struct {
			Upload string `json:"upload_url"`
			Verify string `json:"verify_url"`
		}
		_, err := p.call(ctx, http.MethodPost, path+"-url",
			map[string]any{"asset_name": b.Name, "size": b.Size, "overwrite": true}, &endpoints)
		if err != nil {
			return err
		}
		if err := p.put(ctx, endpoints.Upload, data); err != nil {
			return err
		}
		verify, err := url.Parse(endpoints.Verify)
		if err != nil || !strings.Contains(verify.EscapedPath(), "/asset-upload-confirmation/") {
			return errors.New("invalid CNB attachment confirmation URL")
		}
		parts := strings.Split(strings.Trim(verify.EscapedPath(), "/"), "/")
		if len(parts) < 3 {
			return errors.New("invalid CNB attachment confirmation path")
		}
		confirmation := strings.Join(parts[len(parts)-2:], "/")
		if _, err := p.call(ctx, http.MethodPost, path+"-confirmation/"+confirmation+"?ttl=0", nil, nil); err != nil {
			return err
		}
		if _, err := p.call(ctx, http.MethodGet, releasePath, nil, &r); err != nil {
			return err
		}
		if !r.contains(*b, data) {
			return errors.New("CNB attachment size or hash differs from the verified book")
		}
	}
	download := downloadPath(b.Tag, b.Name)
	if _, err := p.call(ctx, http.MethodHead, download, nil, nil); err != nil {
		return err
	}
	b.URL = p.api + download
	return nil
}

func (p publisher) publish(ctx context.Context, output, repo string) error {
	if p.token == "" {
		return errors.New("CNB_TOKEN is required for publication")
	}
	var outcome result
	if err := readJSON(filepath.Join(output, "result.json"), &outcome); err != nil {
		return err
	}
	if !outcome.Changed {
		m, err := loadManifest(repo)
		if err != nil {
			return err
		}
		if m.Book.Tag == "" {
			return errors.New("the published manifest does not identify its release")
		}
		_, err = p.call(ctx, http.MethodHead, downloadPath(m.Book.Tag, m.Book.Name), nil, nil)
		if err == nil {
			fmt.Println("The current PDF edition is already published.")
		}
		return err
	}
	m, err := loadManifest(output)
	if err != nil {
		return err
	}
	if len(m.Source) < 8 || len(m.Edition) != 64 || len(m.Book.SHA256) != 64 || m.Edition != outcome.Edition || m.Book.Name != bookName || len(m.Units) == 0 {
		return errors.New("incomplete publication manifest")
	}
	if err := p.checkSource(ctx, m.Source); err != nil {
		return err
	}
	status, err := git(ctx, repo, "status", "--porcelain")
	if err != nil {
		return err
	}
	if status != "" {
		return errors.New("the CNB checkout must start clean")
	}
	base, err := git(ctx, repo, "rev-parse", "HEAD")
	if err != nil {
		return err
	}
	data, err := os.ReadFile(filepath.Join(output, m.Book.Name))
	if err != nil {
		return err
	}
	if digest(data) != m.Book.SHA256 || int64(len(data)) != m.Book.Size {
		return errors.New("book checksum or size differs from the manifest")
	}
	if err := stageUnits(ctx, output, repo, m.Units); err != nil {
		return err
	}
	if err := p.publishBook(ctx, &m, data, base); err != nil {
		return err
	}
	if err := writeJSON(filepath.Join(repo, manifestName), m); err != nil {
		return err
	}
	status, err = git(ctx, repo, "status", "--porcelain")
	if err != nil || status == "" {
		return err
	}
	if _, err := git(ctx, repo, "add", "-A"); err != nil {
		return err
	}
	if _, err := git(ctx, repo, "-c", "user.name=github-actions[bot]",
		"-c", "user.email=41898282+github-actions[bot]@users.noreply.github.com",
		"commit", "-m", "Publish PDFs from "+m.Source); err != nil {
		return err
	}
	if err := p.checkSource(ctx, m.Source); err != nil {
		return err
	}
	auth := base64.StdEncoding.EncodeToString([]byte("cnb:" + p.token))
	cmd := exec.CommandContext(ctx, "git", "push", "origin", "HEAD:refs/heads/main")
	cmd.Dir = repo
	cmd.Env = append(os.Environ(), "GIT_CONFIG_COUNT=1", "GIT_CONFIG_KEY_0=http.https://cnb.cool/.extraHeader",
		"GIT_CONFIG_VALUE_0=Authorization: Basic "+auth, "GIT_TERMINAL_PROMPT=0")
	cmd.Stdout, cmd.Stderr = os.Stdout, os.Stderr
	if err := cmd.Run(); err != nil {
		return err
	}
	fmt.Printf("Published %s\n", m.Book.URL)
	return nil
}

func stageUnits(ctx context.Context, output, repo string, units []unit) error {
	current := map[string]bool{}
	for _, u := range units {
		if !filepath.IsLocal(u.PDF) || filepath.Ext(u.PDF) != ".pdf" || current[u.PDF] {
			return fmt.Errorf("invalid or duplicate unit path %q", u.PDF)
		}
		current[u.PDF] = true
		from := filepath.Join(output, "units", u.PDF)
		hash, err := fileDigest(from)
		if err != nil {
			return err
		}
		if hash != u.SHA256 {
			return fmt.Errorf("%s checksum differs from the manifest", u.PDF)
		}
		to := filepath.Join(repo, u.PDF)
		if err := os.MkdirAll(filepath.Dir(to), 0o755); err != nil {
			return err
		}
		if err := copyFile(from, to); err != nil {
			return err
		}
	}
	tracked, err := git(ctx, repo, "ls-files", "-z", "--", "*.pdf")
	if err != nil {
		return err
	}
	for _, name := range strings.Split(tracked, "\x00") {
		if name != "" && !current[name] {
			if err := os.Remove(filepath.Join(repo, name)); err != nil {
				return err
			}
		}
	}
	for name, expected := range legacyFiles {
		path := filepath.Join(repo, name)
		hash, err := fileDigest(path)
		if errors.Is(err, os.ErrNotExist) {
			continue
		}
		if err != nil {
			return err
		}
		if hash != expected {
			return fmt.Errorf("legacy CNB file %s changed since migration was prepared", name)
		}
		if err := os.Remove(path); err != nil {
			return err
		}
	}
	return nil
}
