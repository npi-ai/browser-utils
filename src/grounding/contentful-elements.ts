// import { isVisibleForUser } from './dom';
import { isDisabled, isInaccessible } from 'dom-accessibility-api';

export function isContentlessEl(el: Element) {
  if (
    /^body|head|html|script|noscript|style|select|form|iframe$/i.test(
      el.tagName,
    )
  ) {
    return true;
  }

  if (el.scrollWidth === 0 || el.scrollHeight === 0) {
    return true;
  }

  // if (!isVisibleForUser(el)) {
  //   return true;
  // }

  return isDisabled(el) || isInaccessible(el);
}

export type MostFrequentChildren = {
  tagName: string | null;
  count: number;
};

export function getMostContentfulElements(
  topN: number = 3,
): [Element, MostFrequentChildren][] {
  const childrenCountMap = new Map<Element, MostFrequentChildren>();

  [...document.body.querySelectorAll('*')].forEach(el => {
    if (isContentlessEl(el)) {
      console.log('contentless', el);
      return;
    }

    const tagCount = new Map<string, number>();

    for (const child of el.children) {
      if (isContentlessEl(child)) {
        console.log('contentless', child);
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

    childrenCountMap.set(
      el,
      mostCommonTag
        ? { tagName: mostCommonTag[0], count: mostCommonTag[1] }
        : { tagName: null, count: 0 },
    );
  });

  return (
    [...childrenCountMap.entries()]
      // sort by children count
      .sort((a, b) => b[1].count - a[1].count)
      .filter(([el, counter], _, candidates) => {
        // if the parent has more common children, ignore the child
        return !candidates.some(([parent, parentCounter]) => {
          return (
            parent !== el &&
            parent.contains(el) &&
            parentCounter.count > counter.count
          );
        });
      })
      .filter(([_, counter]) => {
        return counter.count > 1;
      })
      .slice(0, topN)
  );
}
