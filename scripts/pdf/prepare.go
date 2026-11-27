package main

import (
	"bytes"
	"context"
	_ "embed"
	"errors"
	"fmt"
	"html/template"
	"image"
	_ "image/gif"
	"image/jpeg"
	"image/png"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"golang.org/x/image/draw"
	_ "golang.org/x/image/webp"
	"golang.org/x/net/html"
)

const fontURL = "https://raw.githubusercontent.com/notofonts/noto-cjk/Sans2.004/Sans/Variable/TTF/Subset/NotoSansSC-VF.ttf"
const fontHash = "d68bafcb48a2707749396aa12bbbd833cb70401f3a9a689fd2902c7e0d295964"

//go:embed print.css
var printCSS []byte

var articleTemplate = template.Must(template.New("article").Parse(`<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>{{.Title}}</title>
{{range .Styles}}<link rel="stylesheet" href="{{.}}">{{end}}
<link rel="stylesheet" href="/print.css">
</head><body class="pdf-article"><div class="pdf-breadcrumb">{{.Chapter}}</div>{{.Article}}</body></html>`))

type preparedAsset struct {
	path, hash string
}

type printInput struct {
	Title, Chapter string
	Styles         []string
	Article        template.HTML
}

func (o buildOptions) prepareUnit(u unit, printDir string, recipe string, assets map[string]preparedAsset) (unit, []string, error) {
	source, err := os.Open(filepath.Join(o.dist, u.HTML))
	if err != nil {
		return u, nil, err
	}
	defer source.Close()
	doc, err := html.Parse(source)
	if err != nil {
		return u, nil, err
	}
	var body *html.Node
	var styles, styleDigests []string
	for n := range descendants(doc) {
		if n.Type != html.ElementNode {
			continue
		}
		if n.Data == "div" && hasClass(n, "vp-doc") && body == nil {
			body = n
		}
		if n.Data == "link" && hasWord(attr(n, "rel"), "stylesheet") {
			path, err := localURLPath(attr(n, "href"), siteURL+"/")
			if err != nil {
				return u, nil, err
			}
			hash, err := fileDigest(filepath.Join(o.dist, path))
			if err != nil {
				return u, nil, err
			}
			styles = append(styles, "/site/"+path)
			styleDigests = append(styleDigests, hash)
		}
	}
	if body == nil || len(styles) == 0 {
		return u, nil, errors.New("missing rendered VitePress article or theme stylesheet")
	}
	base, err := url.Parse(siteURL + u.URL)
	if err != nil {
		return u, nil, err
	}
	for n := range descendants(body) {
		if n.Type != html.ElementNode {
			continue
		}
		if n != body && (n.Data == "script" || n.Data == "button" || hasClass(n, "header-anchor") ||
			hasClass(n, "visually-hidden") || hasClass(n, "home-community__stats")) {
			n.Parent.RemoveChild(n)
			continue
		}
		if n.Data == "details" {
			setAttr(n, "open", "")
		}
		if n.Data == "a" && attr(n, "href") != "" {
			href, err := base.Parse(attr(n, "href"))
			if err != nil {
				return u, nil, err
			}
			setAttr(n, "href", href.String())
		}
		if n.Data == "img" {
			src := attr(n, "src")
			removeAttr(n, "srcset")
			removeAttr(n, "fetchpriority")
			setAttr(n, "loading", "eager")
			if strings.HasPrefix(src, "data:image/") {
				continue
			}
			path, err := localURLPath(src, base.String())
			if err != nil {
				return u, nil, err
			}
			asset, ok := assets[path]
			if !ok {
				asset, err = prepareAsset(o.dist, printDir, path)
				if err != nil {
					return u, nil, err
				}
				assets[path] = asset
			}
			setAttr(n, "src", asset.path)
			setAttr(n, "data-source-hash", asset.hash)
		}
	}
	var article, rendered bytes.Buffer
	if err := html.Render(&article, body); err != nil {
		return u, nil, err
	}
	if err := articleTemplate.Execute(&rendered, printInput{u.Title, u.Chapter, styles, template.HTML(article.String())}); err != nil {
		return u, nil, err
	}
	u.Fingerprint = digest([]byte(recipe + strings.Join(styleDigests, "") + rendered.String()))
	return u, styles, os.WriteFile(filepath.Join(printDir, u.Fingerprint+".html"), rendered.Bytes(), 0o644)
}

func descendants(node *html.Node) func(func(*html.Node) bool) {
	return func(yield func(*html.Node) bool) {
		var walk func(*html.Node) bool
		walk = func(n *html.Node) bool {
			if !yield(n) {
				return false
			}
			for c := n.FirstChild; c != nil; {
				next := c.NextSibling
				if !walk(c) {
					return false
				}
				c = next
			}
			return true
		}
		walk(node)
	}
}

func attr(n *html.Node, key string) string {
	for _, a := range n.Attr {
		if a.Key == key {
			return a.Val
		}
	}
	return ""
}

func setAttr(n *html.Node, key, value string) {
	for i, a := range n.Attr {
		if a.Key == key {
			n.Attr[i].Val = value
			return
		}
	}
	n.Attr = append(n.Attr, html.Attribute{Key: key, Val: value})
}

func removeAttr(n *html.Node, key string) {
	for i, a := range n.Attr {
		if a.Key == key {
			n.Attr = append(n.Attr[:i], n.Attr[i+1:]...)
			return
		}
	}
}

func hasWord(value, word string) bool {
	for _, item := range strings.Fields(value) {
		if item == word {
			return true
		}
	}
	return false
}

func hasClass(n *html.Node, class string) bool {
	return hasWord(attr(n, "class"), class)
}

func localURLPath(raw, base string) (string, error) {
	u, err := url.Parse(base)
	if err == nil {
		u, err = u.Parse(raw)
	}
	if err != nil {
		return "", err
	}
	path := strings.TrimPrefix(u.Path, "/")
	if raw == "" || u.Host != "chemistry-note.seeridia.top" || !filepath.IsLocal(path) {
		return "", fmt.Errorf("non-local print asset: %q", raw)
	}
	return path, nil
}

func prepareAsset(dist, printDir, path string) (preparedAsset, error) {
	source, err := os.ReadFile(filepath.Join(dist, path))
	if err != nil {
		return preparedAsset{}, err
	}
	data, ext, err := optimizeImage(source, strings.ToLower(filepath.Ext(path)))
	if err != nil {
		return preparedAsset{}, fmt.Errorf("%s: %w", path, err)
	}
	key := digest(data) + ext
	asset := preparedAsset{"/assets/" + key, digest(source)}
	return asset, os.WriteFile(filepath.Join(printDir, "assets", key), data, 0o644)
}

func optimizeImage(data []byte, ext string) ([]byte, string, error) {
	if ext == ".svg" {
		return data, ext, nil
	}
	cfg, kind, err := image.DecodeConfig(bytes.NewReader(data))
	if err != nil {
		return nil, "", err
	}
	scale := min(1600.0/float64(cfg.Width), 2400.0/float64(cfg.Height), 1)
	if scale == 1 {
		switch kind {
		case "jpeg", "png", "webp", "gif":
			return data, ext, nil
		}
	}
	input, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return nil, "", err
	}
	resized := image.NewNRGBA(image.Rect(0, 0, max(1, int(float64(cfg.Width)*scale)), max(1, int(float64(cfg.Height)*scale))))
	draw.CatmullRom.Scale(resized, resized.Bounds(), input, input.Bounds(), draw.Over, nil)
	var out bytes.Buffer
	if kind == "jpeg" {
		err = jpeg.Encode(&out, resized, &jpeg.Options{Quality: 91})
		return out.Bytes(), ".jpg", err
	}
	err = png.Encode(&out, resized)
	return out.Bytes(), ".png", err
}

func prepareFonts(ctx context.Context, dir, cache, localSource string) error {
	hb, err := command(ctx, "", "hb-subset", "--version")
	if err != nil {
		return fmt.Errorf("HarfBuzz hb-subset is required: %w", err)
	}
	fontCache := filepath.Join(cache, "fonts-"+digest(append(hb, fontHash...))[:16])
	if err := os.MkdirAll(fontCache, 0o755); err != nil {
		return err
	}
	dest := filepath.Join(dir, "fonts")
	if err := os.MkdirAll(dest, 0o755); err != nil {
		return err
	}
	source := filepath.Join(fontCache, "source.ttf")
	for _, font := range []struct{ file, weight string }{{"regular.ttf", "400"}, {"bold.ttf", "700"}} {
		path := filepath.Join(fontCache, font.file)
		if _, err := os.Stat(path); errors.Is(err, os.ErrNotExist) {
			if err := getFontSource(ctx, source, localSource); err != nil {
				return err
			}
			if _, err := command(ctx, "", "hb-subset", source, "--unicodes=*", "--variations=wght="+font.weight,
				"--output-file="+path+".part"); err != nil {
				return err
			}
			if err := os.Rename(path+".part", path); err != nil {
				return err
			}
		}
		data, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		if err := os.WriteFile(filepath.Join(dest, font.file), data, 0o644); err != nil {
			return err
		}
	}
	return nil
}

func getFontSource(ctx context.Context, path, override string) error {
	if override == "" {
		if hash, err := fileDigest(path); err == nil && hash == fontHash {
			return nil
		}
	}
	var data []byte
	var err error
	if override != "" {
		data, err = os.ReadFile(override)
	} else {
		client := http.Client{Timeout: 40 * time.Second}
		req, requestErr := http.NewRequestWithContext(ctx, http.MethodGet, fontURL, nil)
		if requestErr != nil {
			return requestErr
		}
		response, getErr := client.Do(req)
		if getErr != nil {
			return getErr
		}
		defer response.Body.Close()
		if response.StatusCode != http.StatusOK {
			return fmt.Errorf("font download: HTTP %d", response.StatusCode)
		}
		data, err = io.ReadAll(io.LimitReader(response.Body, 64<<20))
	}
	if err != nil {
		return err
	}
	if digest(data) != fontHash {
		return errors.New("Noto Sans SC font checksum mismatch")
	}
	return os.WriteFile(path, data, 0o644)
}
