package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"slices"
	"strings"

	"github.com/pdfcpu/pdfcpu/pkg/api"
)

func loadManifest(dir string) (manifest, error) {
	var m manifest
	if dir == "" {
		return m, nil
	}
	if err := readJSON(filepath.Join(dir, manifestName), &m); err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return m, nil
		}
		return m, err
	}
	if m.Schema != 1 {
		return m, errors.New("unsupported PDF manifest schema")
	}
	return m, nil
}

func (o buildOptions) loadCatalog() (catalog, error) {
	var c catalog
	if err := readJSON(filepath.Join(o.dist, "pdf-catalog.json"), &c); err != nil {
		return c, fmt.Errorf("read the PDF catalog (run vp run docs:build first): %w", err)
	}
	if len(o.units) != 0 {
		var selected []unit
		for _, u := range c.Units {
			if slices.Contains(o.units, u.HTML) || slices.Contains(o.units, u.PDF) {
				selected = append(selected, u)
			}
		}
		if len(selected) != len(o.units) {
			return c, errors.New("each --unit must match a distinct HTML or PDF path")
		}
		c.Units = selected
	}
	if len(c.Units) == 0 {
		return c, errors.New("no PDF units were selected")
	}
	return c, nil
}

func recipeDigest(root string, paths ...string) (string, error) {
	var items []string
	for _, name := range paths {
		hash, err := fileDigest(filepath.Join(root, name))
		if err != nil {
			return "", err
		}
		items = append(items, hash)
	}
	return digest([]byte(strings.Join(items, ""))), nil
}

func matchingPublished(u unit, old map[string]unit, previous string) bool {
	p, exists := old[u.PDF]
	if !exists || u.Fingerprint != p.Fingerprint {
		return false
	}
	hash, err := fileDigest(filepath.Join(previous, u.PDF))
	return err == nil && hash == p.SHA256
}

func build(ctx context.Context, o buildOptions) error {
	c, err := o.loadCatalog()
	if err != nil {
		return err
	}
	for _, dir := range []string{o.output, o.cache} {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			return err
		}
	}
	previous, err := loadManifest(o.previous)
	if err != nil {
		return err
	}
	temp, err := os.MkdirTemp(o.output, "print-")
	if err != nil {
		return err
	}
	defer os.RemoveAll(temp)
	if err := os.Mkdir(filepath.Join(temp, "assets"), 0o755); err != nil {
		return err
	}
	if err := os.WriteFile(filepath.Join(temp, "print.css"), printCSS, 0o644); err != nil {
		return err
	}
	recipe, err := recipeDigest(o.root, "scripts/pdf/prepare.go", "scripts/pdf/render.go",
		"scripts/pdf/print.css", "scripts/pdf/go.sum", "pnpm-lock.yaml")
	if err != nil {
		return err
	}
	recipe += fontHash + runtime.GOOS + "/" + runtime.GOARCH
	if o.browser != "" {
		version, err := command(ctx, o.root, o.browser, "--version")
		if err != nil {
			return err
		}
		recipe += string(version)
	}
	layout, err := recipeDigest(o.root, "scripts/pdf/layout.go")
	if err != nil {
		return err
	}
	assets := map[string]preparedAsset{}
	var styles []string
	for i, u := range c.Units {
		prepared, links, err := o.prepareUnit(u, temp, recipe, assets)
		if err != nil {
			return fmt.Errorf("%s: %w", u.HTML, err)
		}
		c.Units[i] = prepared
		if i == 0 {
			styles = links
		}
	}
	raw, err := json.Marshal(c.Units)
	if err != nil {
		return err
	}
	edition := digest(append(raw, layout...))
	old := map[string]unit{}
	if previous.Layout == layout {
		for _, u := range previous.Units {
			old[u.PDF] = u
		}
	}
	matching := make(map[string]bool, len(c.Units))
	for _, u := range c.Units {
		if matchingPublished(u, old, o.previous) {
			matching[u.PDF] = true
		}
	}
	if !o.force && edition == previous.Edition && len(matching) == len(c.Units) {
		fmt.Println("PDF edition and published files are unchanged.")
		return writeJSON(filepath.Join(o.output, "result.json"), result{false, edition})
	}
	if err := prepareFonts(ctx, temp, o.cache, o.fontSource); err != nil {
		return err
	}
	var jobs []renderJob
	seen := map[string]bool{}
	for _, u := range c.Units {
		cache := filepath.Join(o.cache, u.Fingerprint+".pdf")
		if !o.force {
			if pages, err := api.PageCountFile(ctx, cache); err == nil && pages > 0 {
				continue
			}
		}
		if !seen[u.Fingerprint] {
			jobs = append(jobs, renderJob{u.Fingerprint + ".html", cache, u.HTML})
			seen[u.Fingerprint] = true
		}
	}
	r, err := newRenderer(ctx, temp, o.dist, o.browser)
	if err != nil {
		return err
	}
	defer r.close()
	if err := r.render(jobs); err != nil {
		return err
	}
	fmt.Printf("Rendered %d of %d units.\n", len(jobs), len(c.Units))

	start := 1
	for i := range c.Units {
		u := &c.Units[i]
		body, err := readPDF(ctx, filepath.Join(o.cache, u.Fingerprint+".pdf"))
		if err != nil {
			return fmt.Errorf("%s: %w", u.PDF, err)
		}
		u.Pages, u.Start = body.PageCount, start
		start += u.Pages
		target := filepath.Join(o.output, "units", u.PDF)
		if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
			return err
		}
		if matching[u.PDF] && !o.force {
			if err := copyFile(filepath.Join(o.previous, u.PDF), target); err != nil {
				return err
			}
		} else {
			if err := stampPages(ctx, body, 0); err != nil {
				return fmt.Errorf("%s: %w", u.PDF, err)
			}
			if err := writePDF(ctx, body, target); err != nil {
				return err
			}
		}
		u.SHA256, err = fileDigest(target)
		if err != nil {
			return err
		}
	}
	target := filepath.Join(o.output, bookName)
	pages, err := createBook(ctx, r, temp, o.cache, target, c.Units, styles)
	if err != nil {
		return err
	}
	info, err := os.Stat(target)
	if err != nil {
		return err
	}
	hash, err := fileDigest(target)
	if err != nil {
		return err
	}
	source, err := git(ctx, o.root, "rev-parse", "HEAD")
	if err != nil {
		return err
	}
	m := manifest{1, source, edition, layout, c.Units, bookInfo{Name: bookName, SHA256: hash, Size: info.Size(), Pages: pages}}
	if err := writeJSON(filepath.Join(o.output, manifestName), m); err != nil {
		return err
	}
	fmt.Printf("Validated %d units and a %d-page book.\n", len(c.Units), pages)
	return writeJSON(filepath.Join(o.output, "result.json"), result{true, edition})
}

func copyFile(source, target string) error {
	data, err := os.ReadFile(source)
	if err != nil {
		return err
	}
	return os.WriteFile(target, data, 0o644)
}
