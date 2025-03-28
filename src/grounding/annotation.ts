import { getPageBrightness, isDark, randomBrightness } from './screenshot';
import { getScrollTop } from './scroll';
import { bboxClassName, markerAttr } from './constants';

function ensureStyle() {
  if (document.querySelector('style#lc-style')) {
    return;
  }

  const style = document.createElement('style');
  style.textContent = `
    .lc-marker {
      position: absolute;
      border: 2px solid var(--bg-color);
      pointer-events: none;
      box-sizing: border-box;
      z-index: 1073741825;
      opacity: 0.9;
    }

    .lc-marker::before {
      content: attr(data-element-id);
      position: absolute;
      top: 0;
      left: 0;
      padding: 0px 1px;
      color: var(--text-color);
      background-color: var(--bg-color);
      font-size: 8px;
    }

    .lc-marker::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: var(--bg-color);
      opacity: 0.15;
    }
  `;
  document.head.append(style);
}

function getZindex(el: Element | null) {
  let zIndex = -Infinity;

  while (el && el !== document.body) {
    const z = parseInt(window.getComputedStyle(el).zIndex, 10);

    if (z > zIndex) {
      zIndex = z;
    }

    el = el.parentElement;
  }

  return isFinite(zIndex) ? zIndex.toString() : 'auto';
}

export function markElement({
  el,
  id,
  pageBrightness,
  bgColor,
  textColor,
}: {
  el: Element;
  id: number;
  pageBrightness: number;
  bgColor?: string;
  textColor?: string;
}) {
  ensureStyle();

  const scrollTop = getScrollTop();
  const rects = el.getClientRects();

  const brightness = randomBrightness(pageBrightness);
  // const bgColor = 'red';
  // const textColor = '#fff';
  const zIndex = getZindex(el);

  if (!bgColor) {
    bgColor = `hsl(${(Math.random() * 360) | 0}, ${
      (Math.random() * 100) | 0
    }%, ${brightness}%)`;
  }

  if (!textColor) {
    textColor = isDark(pageBrightness) ? '#000' : '#fff';
  }

  for (const rect of rects) {
    if (rect.width === 0 || rect.height === 0) {
      continue;
    }

    const marker = document.createElement('div');
    marker.className = bboxClassName;
    marker.style.top = `${scrollTop + rect.top - 2}px`;
    marker.style.left = `${rect.left - 2}px`;
    marker.style.width = `${rect.width + 4}px`;
    marker.style.height = `${rect.height + 4}px`;
    marker.style.zIndex = zIndex;

    el.setAttribute(markerAttr, id.toString());
    marker.setAttribute('data-element-id', id.toString());

    marker.style.setProperty('--bg-color', bgColor);
    marker.style.setProperty('--text-color', textColor);

    document.body.appendChild(marker);
  }
}

export function addMask(elements: Element[]) {
  const canvas = document.createElement('canvas');
  canvas.id = 'lc-mask';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const ctx = canvas.getContext('2d')!;

  ctx.fillRect(0, 0, canvas.width, canvas.height);

  elements.forEach(el => {
    const rects = el.getClientRects();

    for (const rect of rects) {
      ctx.clearRect(rect.x, rect.y, rect.width, rect.height);
    }
  });

  document.body.appendChild(canvas);
}

export async function addBboxes(elements: Element[], screenshot?: string) {
  const pageBrightness = await getPageBrightness(screenshot);

  elements.forEach((el, i) => {
    markElement({
      id: i,
      el,
      pageBrightness,
    });
  });

  return elements;
}

export function clearBboxes() {
  document.querySelector('#lc-mask')?.remove();

  [...document.querySelectorAll(`.${bboxClassName}`)].forEach(el =>
    el.remove(),
  );

  [...document.querySelectorAll(`[${markerAttr}]`)].forEach(el => {
    el.removeAttribute(markerAttr);
  });
}
