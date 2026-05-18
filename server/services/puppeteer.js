import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { readdirSync, existsSync } from 'fs';
import { join } from 'path';
import logger from '../utils/logger.js';

puppeteer.use(StealthPlugin());

let browser = null;

/**
 * Resolve the Chromium executable path.
 * Priority:
 * 1. PUPPETEER_EXECUTABLE_PATH env (exact path)
 * 2. Search /opt/browser/chromium-* for a 'chrome' binary (mounted shared browser)
 * 3. System chromium (/usr/bin/chromium)
 */
function resolveExecutablePath() {
  const envPath = process.env.PUPPETEER_EXECUTABLE_PATH;

  // If env points to a direct executable, use it
  if (envPath && existsSync(envPath)) {
    logger.info(`Using browser from env: ${envPath}`);
    return envPath;
  }

  // Search mounted browser directory for chromium-* folders
  const browserDir = '/opt/browser';
  if (existsSync(browserDir)) {
    try {
      const entries = readdirSync(browserDir, { withFileTypes: true });
      const chromiumDir = entries
        .filter(e => e.isDirectory() && e.name.startsWith('chromium'))
        .sort((a, b) => b.name.localeCompare(a.name))[0]; // latest version first
      if (chromiumDir) {
        const chromePath = join(browserDir, chromiumDir.name, 'chrome');
        if (existsSync(chromePath)) {
          logger.info(`Found mounted browser: ${chromePath}`);
          return chromePath;
        }
      }
    } catch (e) {
      logger.warn(`Error scanning ${browserDir}: ${e.message}`);
    }
  }

  // Fallback to system chromium
  if (existsSync('/usr/bin/chromium')) {
    logger.info('Using system chromium: /usr/bin/chromium');
    return '/usr/bin/chromium';
  }

  throw new Error('No Chromium executable found. Mount a browser to /opt/browser or install chromium.');
}

export async function launchBrowser(options = {}) {
  if (browser && browser.connected) return browser;
  const headless = options.headless ?? 'new';
  const executablePath = resolveExecutablePath();
  logger.info('Launching browser (stealth mode)...');
  browser = await puppeteer.launch({
    headless,
    executablePath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-extensions',
      '--disable-software-rasterizer',
      '--ozone-platform=headless',
      '--single-process',
      '--no-zygote',
      '--window-size=1280,800',
    ],
  });
  browser.on('disconnected', () => {
    browser = null;
    logger.info('Browser disconnected');
  });
  return browser;
}

export async function closeBrowser() {
  if (browser && browser.connected) {
    await browser.close();
    browser = null;
    logger.info('Browser closed');
  }
}

export async function createPage(b, options = {}) {
  const page = await b.newPage();
  const timeout = Number(options.timeoutMs || 60000);
  page.setDefaultTimeout(timeout);
  page.setDefaultNavigationTimeout(timeout);
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
  );
  return page;
}
