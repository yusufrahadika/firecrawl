import { execFileSync } from 'child_process';
import { Browser, firefox, chromium } from 'playwright';

type BrowserVariant = 'playwright' | 'cloakbrowser' | 'camoufox' | 'invisible_playwright';

type InvisiblePlaywrightConfig = {
  executablePath: string;
  firefoxUserPrefs: Record<string, string | number | boolean>;
};

const COMMON_CHROMIUM_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-accelerated-2d-canvas',
  '--no-first-run',
  '--no-zygote',
  '--disable-gpu'
];

const dynamicImport = new Function('specifier', 'return import(specifier)') as <T>(specifier: string) => Promise<T>;

export const getBrowserVariant = (): BrowserVariant => {
  const variant = (process.env.BROWSER_VARIANT || 'playwright').toLowerCase();
  if (variant === 'playwright' || variant === 'cloakbrowser' || variant === 'camoufox' || variant === 'invisible_playwright') {
    return variant;
  }
  throw new Error(`Unsupported BROWSER_VARIANT "${variant}". Supported values: playwright, cloakbrowser, camoufox, invisible_playwright`);
};

const shouldRunHeaded = (): boolean => {
  // Stealth variants should use the real rendering path by default. Keep an
  // emergency override for local debugging, but Docker/CI uses headed mode.
  return (process.env.BROWSER_HEADLESS || 'false').toLowerCase() !== 'true';
};

const launchPlaywrightChromium = async (): Promise<Browser> => chromium.launch({
  headless: true,
  args: COMMON_CHROMIUM_ARGS,
});

const launchCloakBrowser = async (): Promise<Browser> => {
  const cloakbrowser = await dynamicImport<{ launch: (options: Record<string, unknown>) => Promise<Browser> }>('cloakbrowser');
  return cloakbrowser.launch({
    headless: !shouldRunHeaded(),
    args: COMMON_CHROMIUM_ARGS,
  });
};

const launchCamoufox = async (): Promise<Browser> => {
  const camoufox = await dynamicImport<{ Camoufox: (options: Record<string, unknown>) => Promise<Browser> }>('camoufox-js');
  return camoufox.Camoufox({
    headless: !shouldRunHeaded(),
    virtual_display: process.env.DISPLAY || ':99',
  });
};

const getInvisiblePlaywrightConfig = (): InvisiblePlaywrightConfig => {
  const python = process.env.PYTHON_BIN || 'python3';
  const helper = process.env.INVISIBLE_PLAYWRIGHT_CONFIG_HELPER || 'helpers/invisible_playwright_config.py';
  const output = execFileSync(python, [helper], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return JSON.parse(output) as InvisiblePlaywrightConfig;
};

const launchInvisiblePlaywright = async (): Promise<Browser> => {
  const config = getInvisiblePlaywrightConfig();
  return firefox.launch({
    executablePath: config.executablePath,
    firefoxUserPrefs: config.firefoxUserPrefs,
    headless: !shouldRunHeaded(),
  });
};

export const launchBrowser = async (): Promise<Browser> => {
  const variant = getBrowserVariant();
  console.log(`Launching browser variant: ${variant}`);

  switch (variant) {
    case 'playwright':
      return launchPlaywrightChromium();
    case 'cloakbrowser':
      return launchCloakBrowser();
    case 'camoufox':
      return launchCamoufox();
    case 'invisible_playwright':
      return launchInvisiblePlaywright();
    default: {
      const exhaustive: never = variant;
      throw new Error(`Unsupported BROWSER_VARIANT: ${exhaustive}`);
    }
  }
};
