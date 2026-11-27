FROM golang:1.26.11-bookworm AS go-toolchain
FROM node:24.22.0-trixie

COPY --from=go-toolchain /usr/local/go /usr/local/go
ENV PATH="/usr/local/go/bin:${PATH}" \
    PLAYWRIGHT_BROWSERS_PATH=/opt/playwright \
    PDF_PLAYWRIGHT_VERSION=1.64.1 \
    PDF_CHROMIUM=/usr/local/bin/chemistry-chromium \
    PDF_FONT_SOURCE=/opt/NotoSansSC-VF.ttf \
    VP_ENV_FORBIDDEN=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends libharfbuzz-bin \
    && npm install --global pnpm@12.14.0 \
    && npx --yes --package "playwright@${PDF_PLAYWRIGHT_VERSION}" playwright install --with-deps --only-shell chromium \
    && chromium="$(find "$PLAYWRIGHT_BROWSERS_PATH" -path '*/chrome-headless-shell-linux64/chrome-headless-shell' -type f)" \
    && test -x "$chromium" \
    && ln -s "$chromium" "$PDF_CHROMIUM" \
    && (curl -fsSL --retry 1 --max-time 30 -o "$PDF_FONT_SOURCE" https://cdn.jsdelivr.net/gh/notofonts/noto-cjk@Sans2.004/Sans/Variable/TTF/Subset/NotoSansSC-VF.ttf \
        || curl -fsSL --retry 1 --max-time 30 -o "$PDF_FONT_SOURCE" https://raw.githubusercontent.com/notofonts/noto-cjk/Sans2.004/Sans/Variable/TTF/Subset/NotoSansSC-VF.ttf) \
    && (curl -fsSL --max-time 15 -o /opt/NotoSansSC-LICENSE https://cdn.jsdelivr.net/gh/notofonts/noto-cjk@Sans2.004/LICENSE \
        || curl -fsSL --max-time 15 -o /opt/NotoSansSC-LICENSE https://raw.githubusercontent.com/notofonts/noto-cjk/Sans2.004/LICENSE) \
    && printf '%s  %s\n' d68bafcb48a2707749396aa12bbbd833cb70401f3a9a689fd2902c7e0d295964 "$PDF_FONT_SOURCE" | sha256sum -c \
    && hb-subset "$PDF_FONT_SOURCE" --unicodes=4E2D --variations=wght=700 --output-file=/tmp/chemistry-font-test.ttf \
    && rm /tmp/chemistry-font-test.ttf \
    && rm -rf /var/lib/apt/lists/* /root/.npm/_npx
