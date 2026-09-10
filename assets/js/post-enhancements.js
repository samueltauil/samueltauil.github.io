// Progressive enhancements for article pages: copy buttons on code blocks and a
// zoomable lightbox for screenshots. Both are additive. Without JavaScript the
// code is still selectable and every screenshot is still a link to the full
// resolution file, so nothing here is load bearing.

const article = document.querySelector('.post-content');

/* ------------------------------------------------------------------ copy --- */

const COPY_ICON =
  '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">' +
  '<path fill="currentColor" d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"/>' +
  '<path fill="currentColor" d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"/>' +
  '</svg>';

const DONE_ICON =
  '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">' +
  '<path fill="currentColor" d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"/>' +
  '</svg>';

async function copyText(text) {
  // The async Clipboard API needs a secure context. Fall back for file:// and
  // for browsers that reject the permission.
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      /* fall through */
    }
  }

  const staging = document.createElement('textarea');
  staging.value = text;
  staging.setAttribute('readonly', '');
  staging.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0';
  document.body.appendChild(staging);

  // Safari, and iOS in particular, ignores `select()` on a readonly textarea.
  // It needs an explicit range selection to put anything on the clipboard.
  staging.contentEditable = 'true';
  const range = document.createRange();
  range.selectNodeContents(staging);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  staging.setSelectionRange(0, text.length);

  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  selection.removeAllRanges();
  staging.remove();
  return ok;
}

function addCopyButtons() {
  const blocks = article.querySelectorAll(':scope > div.highlighter-rouge, :scope > pre');

  blocks.forEach((block) => {
    const source = block.querySelector('code') || block;

    // The block scrolls horizontally, so an absolutely positioned button inside
    // it would scroll away with the code. Wrap it in a non-scrolling parent.
    const wrapper = document.createElement('div');
    wrapper.className = 'code-block';
    block.parentNode.insertBefore(wrapper, block);
    wrapper.appendChild(block);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'copy-button';
    button.setAttribute('aria-label', 'Copy code to clipboard');
    button.innerHTML = `${COPY_ICON}<span class="copy-button__label">Copy</span>`;

    let resetTimer;
    button.addEventListener('click', async () => {
      const copied = await copyText(source.innerText.replace(/\n$/, ''));
      button.classList.toggle('is-copied', copied);
      button.classList.toggle('is-failed', !copied);
      button.innerHTML =
        (copied ? DONE_ICON : COPY_ICON) +
        `<span class="copy-button__label">${copied ? 'Copied' : 'Press Ctrl+C'}</span>`;
      // Announce to screen readers, which do not see the visual state change.
      button.setAttribute('aria-label', copied ? 'Code copied to clipboard' : 'Copy failed');

      clearTimeout(resetTimer);
      resetTimer = setTimeout(() => {
        button.classList.remove('is-copied', 'is-failed');
        button.innerHTML = `${COPY_ICON}<span class="copy-button__label">Copy</span>`;
        button.setAttribute('aria-label', 'Copy code to clipboard');
      }, 2000);
    });

    wrapper.appendChild(button);
  });
}

/* -------------------------------------------------------------- lightbox --- */

async function addLightbox() {
  // Tag qualifying links with a class rather than relying on `:has()` in the
  // selector PhotoSwipe runs internally.
  const links = [...article.querySelectorAll('a > img')].map((img) => img.parentElement);
  if (!links.length) return;
  links.forEach((link) => link.classList.add('pswp-item'));

  const { default: PhotoSwipeLightbox } = await import(
    '../vendor/photoswipe/photoswipe-lightbox.esm.min.js'
  );

  const lightbox = new PhotoSwipeLightbox({
    gallery: '.post-content',
    children: 'a.pswp-item',
    pswpModule: () => import('../vendor/photoswipe/photoswipe.esm.min.js'),
    bgOpacity: 0.92,
    padding: { top: 24, bottom: 24, left: 16, right: 16 },
    wheelToZoom: true,
    // Screenshots are wide, so start zoomed to fit rather than at 100%.
    initialZoomLevel: 'fit',
    secondaryZoomLevel: 1.6,
    maxZoomLevel: 4,
    errorMsg: 'This image could not be loaded.',
  });

  // The screenshots are remote and have no intrinsic size in the markup. The
  // rendered thumbnail is the same file, so read its real dimensions from the
  // decoded image instead of hardcoding any.
  lightbox.addFilter('domItemData', (itemData, element) => {
    const img = element.querySelector('img');
    if (img && img.naturalWidth) {
      itemData.width = img.naturalWidth;
      itemData.height = img.naturalHeight;
    }
    itemData.alt = img ? img.alt : '';
    return itemData;
  });

  lightbox.init();
}

if (article) {
  addCopyButtons();
  addLightbox();
}
