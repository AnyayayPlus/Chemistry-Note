FROM golang:1.26.11-bookworm AS go-toolchain
FROM node:24.22.0-bookworm

COPY --from=go-toolchain /usr/local/go /usr/local/go
ENV PATH="/usr/local/go/bin:${PATH}" \
    PLAYWRIGHT_BROWSERS_PATH=/opt/playwright \
    PDF_PLAYWRIGHT_VERSION=1.64.1 \
    PDF_CHROMIUM=/usr/local/bin/chemistry-chromium \
    VP_ENV_FORBIDDEN=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends libharfbuzz-bin \
    && npm install --global pnpm@12.14.0 \
    && npx --yes --package "playwright@${PDF_PLAYWRIGHT_VERSION}" playwright install --with-deps --only-shell chromium \
    && chromium="$(find "$PLAYWRIGHT_BROWSERS_PATH" -path '*/chrome-headless-shell-linux64/chrome-headless-shell' -type f)" \
    && test -x "$chromium" \
    && ln -s "$chromium" "$PDF_CHROMIUM" \
    && rm -rf /var/lib/apt/lists/* /root/.npm/_npx
