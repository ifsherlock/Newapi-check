import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

puppeteer.use(StealthPlugin());

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let browser = null;

// Turnstile bypass script - patches MouseEvent.screenX/screenY
// Same logic as the Chrome extension but injected via evaluateOnNewDocument
const TURNSTILE_PATCH_SCRIPT = `
(function() {
  function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  const screenX = getRandomInt(800, 1200);
  const screenY = getRandomInt(400, 600);
  Object.defineProperty(MouseEvent.prototype, 'screenX', { value: screenX });
  Object.defineProperty(MouseEvent.prototype, 'screenY', { value: screenY });
})();
`;

export async function launchBrowser(options = {}) {
  if (browser && browser.connected) return browser;
  const headless = options.headless ?? 'new';

  logger.info(`Launching browser (stealth, headless=${headless}, turnstile=${!!options.turnstile})...`);

  const args = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-software-rasterizer',
    '--ozone-platform=headless',
    '--single-process',
    '--no-zygote',
    '--window-size=1280,800',
  ];

  browser = await puppeteer.launch({ headless, args });
  browser.on('disconnected', () => {
    browser = null;
    logger.info('Browser disconnected');
  });

  // Store turnstile flag on browser instance for createPage to use
  browser._useTurnstile = !!options.turnstile;

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

  // Inject Turnstile bypass script if enabled (works in headless, no extension needed)
  if (b._useTurnstile || options.turnstile) {
    await page.evaluateOnNewDocument(TURNSTILE_PATCH_SCRIPT);
    logger.info('Turnstile bypass script injected via evaluateOnNewDocument');
  }

  return page;
}

/**
 * Wait for Turnstile challenge to appear and attempt to solve it.
 * The MouseEvent patch (injected via evaluateOnNewDocument) makes the checkbox
 * clickable even in headless mode. We just need to find and click it.
 */
export async function solveTurnstile(page, timeoutMs = 30000) {
  try {
    // Check if turnstile iframe or widget exists
    const hasTurnstile = await page.evaluate(() => {
      return !!(
        document.querySelector('iframe[src*="challenges.cloudflare.com"]') ||
        document.querySelector('.cf-turnstile') ||
        document.querySelector('[data-sitekey]') ||
        document.querySelector('[name="cf-turnstile-response"]')
      );
    });

    if (!hasTurnstile) {
      logger.info('No Turnstile challenge detected');
      return true;
    }

    logger.info('Turnstile challenge detected, attempting to solve...');

    // Wait for the turnstile response input
    try {
      await page.waitForSelector('[name="cf-turnstile-response"]', { timeout: 10000 });
    } catch {
      // Maybe it's a different turnstile variant
      logger.info('No cf-turnstile-response input found, trying iframe click...');
    }

    // Strategy 1: Click the turnstile iframe directly
    const iframeEl = await page.$('iframe[src*="challenges.cloudflare.com"]');
    if (iframeEl) {
      const box = await iframeEl.boundingBox();
      if (box) {
        // The checkbox is typically at the left-center of the iframe
        await page.mouse.click(box.x + 30, box.y + box.height / 2);
        logger.info('Clicked Turnstile iframe checkbox area');

        // Wait for solution
        const solved = await waitForTurnstileToken(page, timeoutMs);
        if (solved) {
          logger.info('Turnstile solved successfully');
          return true;
        }
      }
    }

    // Strategy 2: Try clicking via evaluate (for shadow DOM scenarios)
    const clickResult = await page.evaluate(async (timeout) => {
      const start = Date.now();

      // Find turnstile iframe
      const iframes = document.querySelectorAll('iframe[src*="challenges.cloudflare.com"]');
      for (const iframe of iframes) {
        try {
          // Simulate a click event on the iframe
          const rect = iframe.getBoundingClientRect();
          const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            clientX: rect.left + 30,
            clientY: rect.top + rect.height / 2,
          });
          iframe.dispatchEvent(clickEvent);
        } catch (e) { /* cross-origin, expected */ }
      }

      // Poll for token
      while (Date.now() - start < timeout) {
        await new Promise(r => setTimeout(r, 500));
        const el = document.querySelector('[name="cf-turnstile-response"]');
        if (el && el.value) return true;
      }
      return false;
    }, Math.min(timeoutMs, 15000));

    if (clickResult) {
      logger.info('Turnstile solved via evaluate click');
      return true;
    }

    logger.warn('Turnstile challenge not solved within timeout');
    return false;
  } catch (err) {
    logger.warn(`Turnstile solving error: ${err.message}`);
    return false;
  }
}

async function waitForTurnstileToken(page, timeoutMs) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    const hasToken = await page.evaluate(() => {
      const el = document.querySelector('[name="cf-turnstile-response"]');
      return !!(el && el.value);
    });
    if (hasToken) return true;
    await new Promise(r => setTimeout(r, 500));
  }
  return false;
}
