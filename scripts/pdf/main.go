package main

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"strings"
)

const manifestName = "pdf-manifest.json"
const bookName = "Anyayay_Chemistry_Note.pdf"
const siteURL = "https://chemistry-note.seeridia.top"

type unit struct {
	Chapter     string `json:"chapter"`
	HTML        string `json:"html"`
	PDF         string `json:"pdf"`
	URL         string `json:"url"`
	Title       string `json:"title"`
	Fingerprint string `json:"fingerprint,omitempty"`
	Pages       int    `json:"pages,omitempty"`
	Start       int    `json:"start,omitempty"`
	SHA256      string `json:"sha256,omitempty"`
}

type bookInfo struct {
	Name   string `json:"name"`
	SHA256 string `json:"sha256"`
	Size   int64  `json:"size"`
	Pages  int    `json:"pages"`
	Tag    string `json:"tag,omitempty"`
	URL    string `json:"url,omitempty"`
}

type manifest struct {
	Schema  int      `json:"schema"`
	Source  string   `json:"source"`
	Edition string   `json:"edition"`
	Layout  string   `json:"layout"`
	Units   []unit   `json:"units"`
	Book    bookInfo `json:"book"`
}

type result struct {
	Changed bool   `json:"changed"`
	Edition string `json:"edition"`
}

type catalog struct {
	Units []unit `json:"units"`
}

type buildOptions struct {
	root, dist, output, cache, previous, fontSource, browser string
	force                                                    bool
	units                                                    []string
}

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
	defer stop()
	if err := run(ctx, os.Args[1:]); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func run(ctx context.Context, args []string) error {
	if len(args) == 0 {
		return errors.New("usage: chemistry-pdf build [flags] | publish OUTPUT CNB_CHECKOUT")
	}
	switch args[0] {
	case "build":
		root, err := repositoryRoot()
		if err != nil {
			return err
		}
		o := buildOptions{root: root}
		flags := flag.NewFlagSet("build", flag.ContinueOnError)
		flags.StringVar(&o.dist, "dist", filepath.Join(root, ".vitepress/dist"), "VitePress output directory")
		flags.StringVar(&o.output, "output", filepath.Join(root, "output/pdf"), "PDF output directory")
		flags.StringVar(&o.cache, "cache", filepath.Join(root, "output/pdf-bodies"), "unnumbered PDF cache")
		flags.StringVar(&o.previous, "previous", "", "published CNB checkout")
		flags.StringVar(&o.fontSource, "font-source", "", "local copy of the pinned Noto Sans SC TTF")
		flags.StringVar(&o.browser, "browser", os.Getenv("PDF_CHROMIUM"), "Chromium executable")
		flags.BoolVar(&o.force, "force", false, "re-render all bodies")
		flags.Func("unit", "select a source HTML or output PDF path", func(v string) error {
			o.units = append(o.units, v)
			return nil
		})
		if err := flags.Parse(args[1:]); err != nil {
			return err
		}
		if flags.NArg() != 0 {
			return errors.New("unexpected positional arguments")
		}
		return build(ctx, o)
	case "publish":
		if len(args) != 3 {
			return errors.New("usage: chemistry-pdf publish OUTPUT CNB_CHECKOUT")
		}
		return publish(ctx, args[1], args[2], os.Getenv("CNB_TOKEN"))
	default:
		return fmt.Errorf("unknown command %q", args[0])
	}
}

func repositoryRoot() (string, error) {
	dir, err := os.Getwd()
	if err != nil {
		return "", err
	}
	for {
		if _, err := os.Stat(filepath.Join(dir, ".vitepress/config.mts")); err == nil {
			return dir, nil
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return "", errors.New("run the PDF command inside the Chemistry Note repository")
		}
		dir = parent
	}
}

func digest(data []byte) string {
	return fmt.Sprintf("%x", sha256.Sum256(data))
}

func fileDigest(path string) (string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	return digest(data), nil
}

func readJSON(path string, dest any) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	if err := json.Unmarshal(data, dest); err != nil {
		return fmt.Errorf("%s: %w", path, err)
	}
	return nil
}

func writeJSON(path string, v any) error {
	data, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, append(data, '\n'), 0o644)
}

func command(ctx context.Context, dir, name string, args ...string) ([]byte, error) {
	cmd := exec.CommandContext(ctx, name, args...)
	cmd.Dir = dir
	cmd.Stderr = os.Stderr
	return cmd.Output()
}

func git(ctx context.Context, dir string, args ...string) (string, error) {
	out, err := command(ctx, dir, "git", args...)
	return strings.TrimRight(string(out), "\r\n"), err
}
