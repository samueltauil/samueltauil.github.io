// @ts-check
const { test, expect } = require('@playwright/test');

/** Pages worth checking: a long post with screenshots and code, the home page,
 * an archive, and the full-width photo grid which deliberately opts out.
 */
const PAGES = [
  { name: 'post', path: '/github-copilot/devops/2026/09/10/hydrafusion-model-routing-grafana-traces.html' },
  { name: 'home', path: '/' },
  { name: 'archive', path: '/posts.html' },
  { name: 'photography', path: '/photography.html' },
];

// A 1x1 PNG. The posts embed screenshots from raw.githubusercontent.com and the
// photo pages from a CDN, so without this the suite depends on the network and
// on third parties being up. Stubbing them keeps the run hermetic and fast, and
// still gives every <img> a real decoded size to measure.
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

test.beforeEach(async ({ page }) => {
  await page.route(
    (url) => /raw\.githubusercontent\.com|cdn\.assets\.lomography\.com/.test(url.href),
    (route) => route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL })
  );
});

/** Bounding boxes for the article blocks that must share a grid track. */
async function articleMetrics(page) {
  return page.evaluate(() => {
    const round = (n) => Math.round(n);
    const box = (el) => {
      const r = el.getBoundingClientRect();
      return { left: round(r.left), right: round(r.right), width: round(r.width) };
    };

    const content = document.querySelector('.post-content');
    if (!content) return null;

    // Elements expected on the `content` track. Screenshots and galleries opt
    // into wider tracks on purpose, so they are excluded here.
    const onContentTrack = [...content.children].filter((el) => {
      if (el.querySelector(':scope > img, :scope > a > img')) return false;
      if (el.matches('.post-list, .photo-gallery, .camera-list, .skills-grid, .cert-grid, table')) return false;
      return el.getBoundingClientRect().width > 0;
    });

    const prose = [...content.querySelectorAll(':scope > p')]
      .find((el) => el.innerText.trim().length > 200);

    let charsPerLine = null;
    if (prose) {
      const cs = getComputedStyle(prose);
      const ctx = document.createElement('canvas').getContext('2d');
      ctx.font = `${cs.fontSize} ${cs.fontFamily}`;
      const text = prose.innerText;
      const avg = ctx.measureText(text).width / text.length;
      charsPerLine = Math.round(prose.getBoundingClientRect().width / avg);
    }

    return {
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      trackLefts: [...new Set(onContentTrack.map((el) => box(el).left))],
      trackWidths: [...new Set(onContentTrack.map((el) => box(el).width))],
      header: document.querySelector('.post-header') ? box(document.querySelector('.post-header')) : null,
      firstContentChild: onContentTrack.length ? box(onContentTrack[0]) : null,
      charsPerLine,
      images: [...content.querySelectorAll('img')].map(box),
      display: getComputedStyle(content).display,
    };
  });
}

for (const target of PAGES) {
  test.describe(target.name, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(target.path, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts && document.fonts.ready);
    });

    // Applies to every page, article or not. A page that cannot be measured
    // still must not scroll sideways.
    test('does not scroll horizontally', async ({ page }) => {
      const doc = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      // One pixel of slack absorbs sub-pixel rounding at fractional DPRs.
      expect(doc.scrollWidth).toBeLessThanOrEqual(doc.clientWidth + 1);
    });

    test('no image overflows the viewport', async ({ page }) => {
      const images = await page.evaluate(() => {
        const clientWidth = document.documentElement.clientWidth;
        return {
          clientWidth,
          boxes: [...document.querySelectorAll('img')]
            .map((el) => el.getBoundingClientRect())
            .filter((r) => r.width > 0)
            .map((r) => ({ width: Math.round(r.width), right: Math.round(r.right) })),
        };
      });
      for (const img of images.boxes) {
        expect(img.width).toBeLessThanOrEqual(images.clientWidth);
        expect(img.right).toBeLessThanOrEqual(images.clientWidth + 1);
      }
    });

    test('article blocks share one grid track', async ({ page }) => {
      const m = await articleMetrics(page);
      test.skip(m === null || m.trackLefts.length === 0, `${target.name} has no article content grid`);
      // The whole point of the content grid: every non-breakout child starts
      // and ends on the same line, in every engine. Compared as a spread rather
      // than an exact set because engines round fractional tracks differently.
      const spread = (values) => Math.max(...values) - Math.min(...values);
      expect(spread(m.trackLefts)).toBeLessThanOrEqual(1);
      expect(spread(m.trackWidths)).toBeLessThanOrEqual(1);
    });

    test('the header aligns with the body', async ({ page }) => {
      const m = await articleMetrics(page);
      test.skip(m === null || !m.header || !m.firstContentChild, `${target.name} has no post header`);
      expect(Math.abs(m.header.left - m.firstContentChild.left)).toBeLessThanOrEqual(1);
      expect(Math.abs(m.header.width - m.firstContentChild.width)).toBeLessThanOrEqual(1);
    });
  });
}

test.describe('reading measure', () => {
  test('stays within a readable range', async ({ page }) => {
    await page.goto(PAGES[0].path, { waitUntil: 'load' });
    const m = await articleMetrics(page);
    expect(m.charsPerLine).not.toBeNull();

    // On a 320px phone the line length is dictated by the screen, not by the
    // measure, so the floor has to scale with the viewport.
    const floor = m.clientWidth < 400 ? 30 : 45;
    expect(m.charsPerLine).toBeGreaterThan(floor);
    // Upper bound is the readability limit and applies everywhere.
    expect(m.charsPerLine).toBeLessThan(110);
  });
});

test.describe('accessibility of scale', () => {
  // Users who zoom, or who set a large default font, must not get a broken
  // layout. `ch` and `clamp()` should absorb both.
  for (const rootFontSize of ['20px', '24px']) {
    test(`survives a ${rootFontSize} root font size`, async ({ page }) => {
      await page.goto(PAGES[0].path, { waitUntil: 'load' });
      await page.evaluate((size) => {
        document.documentElement.style.fontSize = size;
      }, rootFontSize);
      const m = await articleMetrics(page);
      expect(m.scrollWidth).toBeLessThanOrEqual(m.clientWidth + 1);
      expect(m.trackLefts).toHaveLength(1);
    });
  }
});

test.describe('copy buttons', () => {
  test('every code block gets one', async ({ page }) => {
    await page.goto(PAGES[0].path, { waitUntil: 'load' });
    const counts = await page.evaluate(() => ({
      blocks: document.querySelectorAll('.post-content .code-block').length,
      buttons: document.querySelectorAll('.post-content .copy-button').length,
    }));
    expect(counts.blocks).toBeGreaterThan(0);
    expect(counts.buttons).toBe(counts.blocks);
  });

  test('copies the block contents', async ({ page, context, browserName }) => {
    // Reading the system clipboard needs a permission only Chromium implements
    // in Playwright, and headless WebKit does not reliably grant clipboard
    // access at all. So assert the guaranteed contract everywhere (the click
    // always produces feedback) and the exact content where it is readable.
    if (browserName === 'chromium') {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    }

    await page.goto(PAGES[0].path, { waitUntil: 'load' });
    const button = page.locator('.post-content .copy-button').first();
    const expected = await page.locator('.post-content .code-block').first()
      .evaluate((el) => (el.querySelector('code') || el).innerText.replace(/\n$/, ''));

    await button.click();
    // Either outcome is acceptable, silence is not: the reader must be told.
    await expect(button).toHaveClass(/is-copied|is-failed/);

    if (browserName === 'chromium') {
      await expect(button).toHaveClass(/is-copied/);
      const clipboard = await page.evaluate(() => navigator.clipboard.readText());
      // Windows normalises clipboard line endings to CRLF.
      expect(clipboard.replace(/\r\n/g, '\n')).toBe(expected);
    }
  });

  test('is reachable and labelled for assistive tech', async ({ page }) => {
    await page.goto(PAGES[0].path, { waitUntil: 'load' });
    const button = page.locator('.post-content .copy-button').first();
    await expect(button).toHaveAttribute('aria-label', /copy/i);
    // Hidden by opacity rather than display, so it stays focusable.
    await button.focus();
    await expect(button).toBeFocused();
  });
});

test.describe('image lightbox', () => {
  // PhotoSwipe skips its open and close animations under reduced motion. That
  // makes the teardown deterministic instead of racing a transition, and it
  // exercises the setting a real user may have on.
  test.use({ reducedMotion: 'reduce' });

  test('opens with zoom controls and closes', async ({ page }) => {
    await page.goto(PAGES[0].path, { waitUntil: 'load' });
    const firstImage = page.locator('.post-content a.pswp-item').first();
    await expect(firstImage).toBeVisible();

    await firstImage.click();
    const dialog = page.locator('.pswp');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('role', 'dialog');

    // Zoom is the reason for using a lightbox rather than a plain link.
    await expect(page.locator('.pswp__button--zoom')).toBeVisible();
    await expect(page.locator('.pswp__img').first()).toBeVisible();

    // Close via the button rather than Escape. Key handling belongs to
    // PhotoSwipe and is their tested behaviour; the wiring is what is ours.
    await page.locator('.pswp__button--close').click();
    await expect(dialog).toHaveCount(0, { timeout: 10000 });
  });

  test('resolves real image dimensions rather than guessing', async ({ page }) => {
    await page.goto(PAGES[0].path, { waitUntil: 'load' });
    const img = page.locator('.post-content a.pswp-item img').first();
    await expect(img).toBeVisible();
    const natural = await img.evaluate((el) => el.naturalWidth);
    expect(natural).toBeGreaterThan(0);
  });
});

test.describe('screenshots', () => {
  test('sit on the same centre axis as the prose', async ({ page }) => {
    // A screenshot narrower than its track used to pin to the track's left
    // edge, so it sat outdented from the text while wider ones looked fine.
    await page.goto(PAGES[0].path, { waitUntil: 'load' });
    const centres = await page.evaluate(() => {
      const centre = (el) => {
        const r = el.getBoundingClientRect();
        return Math.round(r.left + r.width / 2);
      };
      const prose = [...document.querySelectorAll('.post-content > p')]
        .find((el) => el.innerText.trim().length > 200);
      return {
        prose: centre(prose),
        images: [...document.querySelectorAll('.post-content p img')]
          .filter((el) => el.getBoundingClientRect().width > 0)
          .map(centre),
      };
    });
    expect(centres.images.length).toBeGreaterThan(0);
    for (const c of centres.images) {
      expect(Math.abs(c - centres.prose)).toBeLessThanOrEqual(1);
    }
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('screenshots still link to the full resolution file', async ({ page }) => {
    await page.goto(PAGES[0].path, { waitUntil: 'load' });
    const href = await page.locator('.post-content p a:has(> img)').first().getAttribute('href');
    expect(href).toMatch(/\.(png|jpe?g|webp|gif)$/i);
  });

  test('layout still holds', async ({ page }) => {
    await page.goto(PAGES[0].path, { waitUntil: 'load' });
    const doc = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(doc.scrollWidth).toBeLessThanOrEqual(doc.clientWidth + 1);
  });
});
