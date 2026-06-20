FROM node:18-slim

WORKDIR /usr/src/app

ARG BROWSER_VARIANT=cloakbrowser
ARG PORT

ENV BROWSER_VARIANT=${BROWSER_VARIANT} \
    PLAYWRIGHT_BROWSERS_PATH=/usr/local/share/playwright \
    CLOAKBROWSER_CACHE_DIR=/usr/local/share/cloakbrowser \
    CAMOUFOX_INSTALL_DIR=/usr/local/share/camoufox \
    XVFB_DISPLAY=:99 \
    XVFB_RESOLUTION=1920x1080 \
    XVFB_DEPTH=24 \
    DISPLAY=:99 \
    PORT=${PORT}

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    xvfb \
    xauth \
    && if [ "$BROWSER_VARIANT" = "invisible_playwright" ]; then \
      apt-get install -y --no-install-recommends python3 python3-pip git; \
    fi \
    && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm@10.32.1 && pnpm install --frozen-lockfile

# Install shared browser system libraries without publishing/downloading the
# regular Playwright browser as a release artifact for this branch.
RUN pnpm exec playwright install-deps chromium firefox

RUN if [ "$BROWSER_VARIANT" = "cloakbrowser" ]; then \
      node -e "import('cloakbrowser').then(({ ensureBinary }) => ensureBinary())"; \
    elif [ "$BROWSER_VARIANT" = "camoufox" ]; then \
      pnpm exec camoufox-js fetch; \
    elif [ "$BROWSER_VARIANT" = "invisible_playwright" ]; then \
      python3 -m pip install --break-system-packages "git+https://github.com/feder-cr/invisible_playwright.git" && \
      python3 -m invisible_playwright fetch; \
    else \
      echo "Unsupported BROWSER_VARIANT=$BROWSER_VARIANT" >&2; exit 1; \
    fi

COPY . .

RUN npm run build && chmod +x /usr/src/app/entrypoint.sh

EXPOSE ${PORT}

ENTRYPOINT ["/usr/src/app/entrypoint.sh"]
CMD ["npm", "start"]
