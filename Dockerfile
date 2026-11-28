FROM node:24-bookworm-slim AS editor-api
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN NODE_USE_ENV_PROXY=1 pnpm install --prod --frozen-lockfile --ignore-scripts
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8787 CONTENT_REPOSITORY=AnyayayPlus/Chemistry-Note CONTENT_BRANCH=master
ENV EDITOR_REQUIRE_ACCOUNT=true EDITOR_ACCOUNT_COOKIE=__Host-cc_reader
ENV EDITOR_PATHS='["[0-9][0-9] */!(index).md"]'
USER node
EXPOSE 8787
CMD ["node", "node_modules/vitepress-inline-editor/bin/serve.mjs"]

# GitHub Actions builds the site and supplies .vitepress/dist/.
FROM nginx:stable-alpine

COPY .vitepress/dist/ /usr/share/nginx/html/

ENV EDITOR_API_ORIGIN=http://127.0.0.1:8787 COMMUNITY_ACCOUNT_ORIGIN=http://127.0.0.1:3000
RUN mkdir -p /etc/nginx/templates && printf '%s\n' \
    'server {' \
    '    listen 80;' \
    '    server_name _;' \
    '    root /usr/share/nginx/html;' \
    '    index index.html;' \
    '    gzip on;' \
    '    gzip_types text/css application/javascript application/json image/svg+xml;' \
    '    error_page 404 /404.html;' \
    '    location /api/editor/ {' \
    '        proxy_pass ${EDITOR_API_ORIGIN};' \
    '        proxy_ssl_server_name on;' \
    '        proxy_ssl_verify on;' \
    '        proxy_ssl_trusted_certificate /etc/ssl/certs/ca-certificates.crt;' \
    '        client_max_body_size 2m;' \
    '    }' \
    '    location ~ ^/(?:api/account/(?:login|oidc/callback|session|profile|submissions|logout)|api/public/editor-contributors|u/[0-9a-f-]+)$ {' \
    '        proxy_pass ${COMMUNITY_ACCOUNT_ORIGIN};' \
    '        proxy_ssl_server_name on;' \
    '        proxy_ssl_verify on;' \
    '        proxy_ssl_trusted_certificate /etc/ssl/certs/ca-certificates.crt;' \
    '        client_max_body_size 4k;' \
    '    }' \
    '    location = /pdf-manifest.json {' \
    '        proxy_pass https://cnb.cool/Seeridia/Chemistry-Note-File/-/git/raw/main/pdf-manifest.json;' \
    '        proxy_ssl_server_name on;' \
    '        proxy_ssl_verify on;' \
    '        proxy_ssl_trusted_certificate /etc/ssl/certs/ca-certificates.crt;' \
    '        proxy_connect_timeout 5s;' \
    '        proxy_read_timeout 10s;' \
    '        add_header Cache-Control "no-store" always;' \
    '    }' \
    '    location / {' \
    '        try_files $uri $uri.html $uri/ =404;' \
    '        add_header Cache-Control "no-cache" always;' \
    '    }' \
    '    location /assets/ {' \
    '        try_files $uri =404;' \
    '        expires 1h;' \
    '    }' \
    '}' > /etc/nginx/templates/default.conf.template

EXPOSE 80
