package main

import (
	"context"
	"errors"
	"fmt"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/chromedp/cdproto/cdp"
	"github.com/chromedp/cdproto/emulation"
	"github.com/chromedp/cdproto/page"
	"github.com/chromedp/chromedp"
)

type renderJob struct {
	input, output, title string
}

type renderer struct {
	ctx   context.Context
	url   string
	close func()
}

func newRenderer(ctx context.Context, dir, dist, executable string) (*renderer, error) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return nil, err
	}
	mux := http.NewServeMux()
	mux.Handle("/site/", http.StripPrefix("/site/", http.FileServer(http.Dir(dist))))
	mux.Handle("/", http.FileServer(http.Dir(dir)))
	server := &http.Server{
		ReadHeaderTimeout: 10 * time.Second,
		Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Cache-Control", "no-store")
			w.Header().Set("Content-Security-Policy", "default-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'")
			mux.ServeHTTP(w, r)
		}),
	}
	go server.Serve(listener)
	options := append([]chromedp.ExecAllocatorOption{}, chromedp.DefaultExecAllocatorOptions[:]...)
	if executable != "" {
		options = append(options, chromedp.ExecPath(executable))
	}
	options = append(options, chromedp.Flag("no-sandbox", true))
	allocator, stopAllocator := chromedp.NewExecAllocator(ctx, options...)
	browser, stopBrowser := chromedp.NewContext(allocator)
	close := func() {
		stopBrowser()
		stopAllocator()
		server.Close()
	}
	if err := chromedp.Do(browser, chromedp.Navigate("about:blank")); err != nil {
		close()
		return nil, fmt.Errorf("start Chromium: %w", err)
	}
	return &renderer{browser, "http://" + listener.Addr().String() + "/", close}, nil
}

const awaitAssets = `(async () => {
  const weights = await Promise.all([
    document.fonts.load('400 12pt "Note Sans"', '化学'),
    document.fonts.load('700 12pt "Note Sans"', '化学')
  ]);
  if (weights.some(fonts => fonts.length === 0)) throw new Error('Print fonts unavailable');
  await document.fonts.ready;
  await Promise.all(Array.from(document.images, async image => {
    try { await image.decode(); } catch { throw new Error('Image unavailable: ' + image.src); }
  }));
  return true;
})()`

func (r *renderer) render(jobs []renderJob) error {
	if len(jobs) == 0 {
		return nil
	}
	ctx, stop := context.WithCancel(r.ctx)
	defer stop()
	queue := make(chan renderJob, len(jobs))
	for _, job := range jobs {
		queue <- job
	}
	close(queue)
	var wg sync.WaitGroup
	var firstErr error
	var once sync.Once
	for range min(4, len(jobs)) {
		wg.Add(1)
		go func() {
			defer wg.Done()
			tab, closeTab := chromedp.NewContext(ctx)
			defer closeTab()
			// The tab's event loop must outlive each individual print deadline.
			if err := chromedp.Do(tab, chromedp.Navigate("about:blank")); err != nil {
				once.Do(func() { firstErr = fmt.Errorf("initialize printing tab: %w", err); stop() })
				return
			}
			for job := range queue {
				if ctx.Err() != nil {
					return
				}
				if err := r.print(tab, job); err != nil {
					once.Do(func() { firstErr = fmt.Errorf("%s: %w", job.title, err); stop() })
					return
				}
			}
		}()
	}
	wg.Wait()
	return errors.Join(firstErr, r.ctx.Err())
}

func (r *renderer) print(tab context.Context, job renderJob) error {
	ctx, cancel := context.WithTimeout(tab, 90*time.Second)
	defer cancel()
	if err := chromedp.Do(ctx,
		chromedp.Func(func(ctx context.Context, t *chromedp.Target) error {
			_, err := cdp.Call(ctx, t, emulation.SetEmulatedMedia, emulation.SetEmulatedMediaParams{Media: "print"})
			return err
		}),
		chromedp.Navigate(r.url+job.input),
	); err != nil {
		return err
	}
	ready, err := chromedp.Run(ctx, chromedp.Evaluate[bool](awaitAssets, chromedp.EvalAwaitPromise))
	if err != nil {
		return err
	}
	pdf, err := chromedp.Run(ctx, chromedp.PrintToPDF(
		chromedp.PDFPreferCSSPageSize(), chromedp.PDFPrintBackground(), chromedp.PDFStream(),
		func(p *page.PrintToPDFParams) { tagged := false; p.GenerateTaggedPDF = &tagged },
	))
	if err != nil {
		return err
	}
	if !ready || !strings.HasPrefix(string(pdf[:min(len(pdf), 5)]), "%PDF-") {
		return fmt.Errorf("Chromium produced an invalid PDF")
	}
	temp, err := os.CreateTemp(filepath.Dir(job.output), "*.part")
	if err != nil {
		return err
	}
	defer os.Remove(temp.Name())
	_, writeErr := temp.Write(pdf)
	if err := errors.Join(writeErr, temp.Close()); err != nil {
		return err
	}
	return os.Rename(temp.Name(), job.output)
}
