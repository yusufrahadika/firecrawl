# Playwright Scrape API

This is a simple web scraping service built with Express and Playwright.

## Features

- Scrapes HTML content from specified URLs.
- Blocks requests to known ad-serving domains.
- Blocks media files to reduce bandwidth usage.
- Uses random user-agent strings to avoid detection.
- Strategy to ensure the page is fully rendered.

## Install
```bash
npm install
npx playwright install
```

## RUN
```bash
npm run build
npm start
```
OR
```bash
npm run dev
```

## USE

```bash
curl -X POST http://localhost:3000/scrape \
-H "Content-Type: application/json" \
-d '{
  "url": "https://example.com",
  "wait_after_load": 1000,
  "timeout": 15000,
  "headers": {
    "Custom-Header": "value"
  },
  "check_selector": "#content"
}'
```

## Browser variants

This fork's `stealth-browser-build` branch builds only stealth browser images for GHCR:

- `ghcr.io/<owner>/playwright-service:latest-cloakbrowser`
- `ghcr.io/<owner>/playwright-service:latest-camoufox`
- `ghcr.io/<owner>/playwright-service:latest-invisible_playwright`

The regular Playwright `latest` / `latest-playwright` tags are intentionally not published from this branch.

Select a variant with `BROWSER_VARIANT`:

```bash
BROWSER_VARIANT=cloakbrowser npm start
BROWSER_VARIANT=camoufox npm start
BROWSER_VARIANT=invisible_playwright npm start
```

All stealth variants run headed by default (`headless: false`) and the Docker image starts an Xvfb virtual display (`DISPLAY=:99`) so the browsers use real rendering paths.

### Compatibility notes

- `cloakbrowser` is used through its Playwright-compatible Node launcher.
- `camoufox` uses the `camoufox-js` package and its Playwright-compatible browser object.
- `invisible_playwright` is Python-first, so the service keeps browser control in Node Playwright and uses a small Python helper only to provide the patched Firefox executable path and generated `firefoxUserPrefs`.

## USING WITH FIRECRAWL

Add `PLAYWRIGHT_MICROSERVICE_URL=http://localhost:3003/scrape` to `/apps/api/.env` to configure the API to use this Playwright microservice for scraping operations.

## Maintenance workflow

Keep upstream sync simple by maintaining these changes in the single `stealth-browser-build` branch:

1. Sync the fork's `main` with upstream Firecrawl.
2. Rebase `stealth-browser-build` onto the updated `main`.
3. Resolve conflicts primarily in the small adapter/Docker/CI files; avoid changing scrape route logic unless upstream requires it.
4. Keep future changes in isolated commits by intent so individual browser variants can be reviewed or reverted independently.
