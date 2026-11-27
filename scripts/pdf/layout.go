package main

import (
	"bytes"
	"context"
	"fmt"
	"html/template"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/pdfcpu/pdfcpu/pkg/api"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu/model"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu/types"
	"github.com/skip2/go-qrcode"
)

const tocLink = "https://pdf-index.invalid/unit/"

var frontTemplate = template.Must(template.New("front").Funcs(template.FuncMap{
	"target": func(n int) string { return tocLink + strconv.Itoa(n) },
}).Parse(`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<title>Anyayay’s Chemistry Note</title>
{{range .Styles}}<link rel="stylesheet" href="{{.}}">{{end}}
<link rel="stylesheet" href="/print.css"></head>
<body class="pdf-front"><main class="vp-doc">
<section class="pdf-cover">
<img class="pdf-cover-logo" src="/site/images/icon.svg" alt="">
<h1>化学笔记</h1><p class="pdf-cover-subtitle" lang="en">Anyayay’s Chemistry Note</p>
<div class="pdf-cover-site">
<div class="pdf-cover-site-label"><span>扫码查看</span>
<a href="{{.SiteURL}}">{{.SiteLabel}}</a></div>
<img src="/site-qr.png" alt="化学笔记官网二维码">
</div>
</section>
<section class="pdf-toc"><h1>目录</h1>
{{range .Chapters}}<section class="pdf-chapter"><h2>{{.Title}}</h2>
<ul>{{range .Units}}<li><a href="{{target .Start}}"><span>{{.Title}}</span><span>{{.Start}}</span></a></li>{{end}}</ul>
</section>{{end}}</section></main></body></html>`))

type chapter struct {
	Title string
	Units []unit
}

func chapters(units []unit) []chapter {
	var result []chapter
	for _, u := range units {
		if len(result) == 0 || result[len(result)-1].Title != u.Chapter {
			result = append(result, chapter{Title: u.Chapter})
		}
		current := &result[len(result)-1]
		current.Units = append(current.Units, u)
	}
	return result
}

func pdfConfig() *model.Configuration {
	conf := model.NewDefaultConfiguration()
	conf.CreateBookmarks = false
	conf.PreserveInfoDict = true
	return conf
}

func readPDF(ctx context.Context, path string) (*model.Context, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	pdf, err := api.ReadContext(ctx, f, pdfConfig())
	if err != nil {
		return nil, err
	}
	return pdf, api.ValidateContext(ctx, pdf)
}

func writePDF(ctx context.Context, pdf *model.Context, path string) error {
	if pdf.Info != nil {
		info, err := pdf.DereferenceDict(*pdf.Info)
		if err != nil {
			return err
		}
		delete(info, "CreationDate")
		delete(info, "ModDate")
	}
	return api.WriteContextFile(ctx, pdf, path)
}

func stampPages(ctx context.Context, pdf *model.Context, front int) error {
	font, err := pdf.IndRefForNewObject(types.Dict{
		"Type": types.Name("Font"), "Subtype": types.Name("Type1"), "BaseFont": types.Name("Helvetica"),
	})
	if err != nil {
		return err
	}
	save, err := pdf.StreamDictIndRef([]byte("q\n"))
	if err != nil {
		return err
	}
	for n := front + 1; n <= pdf.PageCount; n++ {
		page, _, attrs, err := pdf.PageDict(ctx, n, false)
		if err != nil {
			return err
		}
		resources := types.Dict{}
		if attrs.Resources != nil {
			resources = attrs.Resources.Clone().(types.Dict)
		}
		fonts := types.Dict{}
		if resources["Font"] != nil {
			existing, err := pdf.DereferenceDict(resources["Font"])
			if err != nil {
				return err
			}
			if existing != nil {
				fonts = existing.Clone().(types.Dict)
			}
		}
		fonts["ChemistryPageNumber"] = *font
		resources["Font"] = fonts
		page["Resources"] = resources
		label := strconv.Itoa(n - front)
		x := attrs.MediaBox.UR.X - 42 - float64(len(label))*5.0
		footer := fmt.Sprintf("\nQ q 0.32 g BT /ChemistryPageNumber 9 Tf 1 0 0 1 %.2f 26 Tm (%s) Tj ET Q\n", x, label)
		ref, err := pdf.StreamDictIndRef([]byte(footer))
		if err != nil {
			return err
		}
		streams := types.Array{*save}
		if original := page["Contents"]; original != nil {
			contents, err := pdf.Dereference(original)
			if err != nil {
				return err
			}
			if array, ok := contents.(types.Array); ok {
				streams = append(streams, array...)
			} else {
				streams = append(streams, original)
			}
		}
		page["Contents"] = append(streams, *ref)
	}
	return nil
}

func createBook(ctx context.Context, r *renderer, dir, cache, path string, units []unit, styles []string) (int, error) {
	var content bytes.Buffer
	if err := frontTemplate.Execute(&content, struct {
		Styles    []string
		Chapters  []chapter
		SiteURL   string
		SiteLabel string
	}{styles, chapters(units), siteURL, strings.TrimPrefix(siteURL, "https://")}); err != nil {
		return 0, err
	}
	if err := qrcode.WriteFile(siteURL, qrcode.Medium, -8, filepath.Join(dir, "site-qr.png")); err != nil {
		return 0, fmt.Errorf("write cover QR code: %w", err)
	}
	if err := os.WriteFile(filepath.Join(dir, "front.html"), content.Bytes(), 0o644); err != nil {
		return 0, err
	}
	front := filepath.Join(dir, "front.pdf")
	if err := r.render([]renderJob{{"front.html", front, "cover and contents"}}); err != nil {
		return 0, err
	}
	frontCount, err := api.PageCountFile(ctx, front)
	if err != nil {
		return 0, err
	}
	inputs := []string{front}
	for _, u := range units {
		inputs = append(inputs, filepath.Join(cache, u.Fingerprint+".pdf"))
	}
	merged := filepath.Join(dir, "merged.pdf")
	if err := api.MergeCreateFile(ctx, inputs, merged, false, pdfConfig()); err != nil {
		return 0, fmt.Errorf("merge PDF units: %w", err)
	}
	pdf, err := readPDF(ctx, merged)
	if err != nil {
		return 0, err
	}
	root, err := pdf.Catalog()
	if err != nil {
		return 0, err
	}
	root["Lang"] = types.StringLiteral("zh-CN")
	root["PageLabels"] = types.Dict{"Nums": types.Array{
		types.Integer(0), types.Dict{"S": types.Name("r")},
		types.Integer(frontCount), types.Dict{"S": types.Name("D")},
	}}
	pdf.Title = "Anyayay's Chemistry Note"
	toc := []pdfcpu.Bookmark{{Title: "目录", PageFrom: 2}}
	targets := make(map[int]types.IndirectRef)
	expectedPages := frontCount
	for _, c := range chapters(units) {
		chapter := pdfcpu.Bookmark{Title: c.Title, PageFrom: frontCount + c.Units[0].Start}
		for _, u := range c.Units {
			expectedPages += u.Pages
			dest := frontCount + u.Start
			ref, err := pdf.PageDictIndRef(ctx, dest)
			if err != nil {
				return 0, err
			}
			targets[u.Start] = *ref
			chapter.Kids = append(chapter.Kids, pdfcpu.Bookmark{Title: u.Title, PageFrom: dest})
		}
		toc = append(toc, chapter)
	}
	if pdf.PageCount != expectedPages {
		return 0, fmt.Errorf("book page count %d, expected %d", pdf.PageCount, expectedPages)
	}
	if err := replaceContentsLinks(ctx, pdf, frontCount, targets); err != nil {
		return 0, err
	}
	if err := pdfcpu.AddBookmarks(ctx, pdf, toc, true); err != nil {
		return 0, err
	}
	if err := stampPages(ctx, pdf, frontCount); err != nil {
		return 0, err
	}
	if err := writePDF(ctx, pdf, path); err != nil {
		return 0, err
	}
	if _, err := readPDF(ctx, path); err != nil {
		return 0, fmt.Errorf("validate finished book: %w", err)
	}
	return expectedPages, nil
}

func replaceContentsLinks(ctx context.Context, pdf *model.Context, front int, targets map[int]types.IndirectRef) error {
	linked := make(map[int]bool)
	for n := 1; n <= front; n++ {
		page, _, _, err := pdf.PageDict(ctx, n, false)
		if err != nil {
			return err
		}
		if page["Annots"] == nil {
			continue
		}
		annotations, err := pdf.DereferenceArray(page["Annots"])
		if err != nil {
			return err
		}
		for _, obj := range annotations {
			annotation, err := pdf.DereferenceDict(obj)
			if err != nil {
				return err
			}
			if annotation["A"] == nil {
				continue
			}
			action, err := pdf.DereferenceDict(annotation["A"])
			if err != nil {
				return err
			}
			uri, _, err := pdf.DereferenceStringEntry(action, "URI")
			if err != nil {
				return err
			}
			if uri == nil || !strings.HasPrefix(*uri, tocLink) {
				continue
			}
			start, err := strconv.Atoi(strings.TrimPrefix(*uri, tocLink))
			ref, exists := targets[start]
			if err != nil || !exists {
				return fmt.Errorf("invalid table of contents link %q", *uri)
			}
			delete(annotation, "A")
			annotation["Dest"] = types.Array{ref, types.Name("Fit")}
			linked[start] = true
		}
	}
	if len(linked) != len(targets) {
		return fmt.Errorf("table of contents has %d destinations, expected %d", len(linked), len(targets))
	}
	return nil
}
