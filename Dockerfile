# GitHub Actions builds the site and supplies .vitepress/dist/.
FROM nginx:stable-alpine

COPY .vitepress/dist/ /usr/share/nginx/html/

RUN printf '%s\n' \
    'server {' \
    '    listen 80;' \
    '    server_name _;' \
    '    root /usr/share/nginx/html;' \
    '    index index.html;' \
    '    gzip on;' \
    '    gzip_types text/css application/javascript application/json image/svg+xml;' \
    '    error_page 404 /404.html;' \
    '    location / {' \
    '        try_files $uri $uri.html $uri/ =404;' \
    '        add_header Cache-Control "no-cache" always;' \
    '    }' \
    '    location /assets/ {' \
    '        try_files $uri =404;' \
    '        expires 1h;' \
    '    }' \
    '}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
