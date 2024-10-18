export function isContentlessEl(el: Element) {
  return /^body|head|html|script|noscript|style|select|form$/i.test(el.tagName);
}

export function getMostContentfulElements(
  topN: number = 3,
): [Element, number][] {
  const childrenCountMap = new Map();

  [...document.all].forEach(el => {
    if (isContentlessEl(el)) {
      return;
    }

    let count = 0;

    for (const child of el.children) {
      if (isContentlessEl(child)) {
        continue;
      }

      const textContent = child.textContent;

      if (
        child.querySelector('a[href], img[src]') ||
        (textContent && textContent.length > 20)
      ) {
        count++;
      }
    }

    childrenCountMap.set(el, count);
  });

  // sort by children count
  return [...childrenCountMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN);
}
