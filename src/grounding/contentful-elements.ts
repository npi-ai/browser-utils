export function isContentlessEl(el: Element) {
  if (/^body|head|html|script|noscript|style|select|form$/i.test(el.tagName)) {
    return true;
  }

  const rect = el.getBoundingClientRect();

  return rect.width === 0 || rect.height === 0;
}

export function getMostContentfulElements(
  topN: number = 3,
): [Element, number][] {
  const childrenCountMap = new Map<Element, number>();

  [...document.all].forEach(el => {
    if (isContentlessEl(el)) {
      return;
    }

    const tagCount = new Map<string, number>();

    for (const child of el.children) {
      if (isContentlessEl(child)) {
        continue;
      }

      const tagName = child.tagName;
      const textContent = child.textContent;

      if (
        child.querySelector('a[href], img[src]') ||
        (textContent && textContent.length > 20)
      ) {
        tagCount.set(tagName, (tagCount.get(tagName) || 0) + 1);
      }
    }

    // get most common tag
    const mostCommonTag = [...tagCount.entries()].sort(
      (a, b) => b[1] - a[1],
    )[0];

    childrenCountMap.set(el, mostCommonTag ? mostCommonTag[1] : 0);
  });

  // sort by children count
  return [...childrenCountMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN);
}
