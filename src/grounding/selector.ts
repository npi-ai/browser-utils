import { finder } from '@medv/finder';

export function queryAncestor(el: Element, selector: string) {
  let ancestor: Element | null = el;

  while (ancestor) {
    if (ancestor.matches(selector)) {
      return ancestor;
    }

    ancestor = ancestor.parentElement;
  }

  return null;
}

export function isChildOf(el: Element, ancestorSelector: string) {
  return el.matches(`${ancestorSelector}, ${ancestorSelector} *`);
}

export function getClosestElement(
  el: Element,
  selector: string,
): Element | null {
  return el.closest(selector) || el.querySelector(selector);
}

export function getCommonAncestor(...els: Element[]): Element | null {
  if (els.length === 0) {
    return null;
  }

  if (els.length === 1) {
    return els[0].parentElement;
  }

  const [el0, ...restEls] = els;

  const ancestors = new Set<Element>();
  let ancestor: Element | null = el0;

  while (ancestor) {
    ancestors.add(ancestor);
    ancestor = ancestor.parentElement;
  }

  let candidate: Element | null = null;

  for (const el of restEls) {
    let commonAncestor: Element | null = null;
    ancestor = el;

    while (ancestor) {
      // if (ancestors.has(ancestor)) {
      //   return ancestor
      // }

      if (ancestors.has(ancestor)) {
        commonAncestor = ancestor;
        break;
      }

      ancestor = ancestor.parentElement;
    }

    if (!commonAncestor) {
      return null;
    }

    // set candidate to the common ancestor if it's higher in the tree
    if (!candidate || commonAncestor.contains(candidate)) {
      candidate = commonAncestor;
    }
  }

  return candidate;
}

export function getOutermostSelector(root: Element, selector: string): string {
  const nestedChildren = root.querySelectorAll(`${selector} ${selector}`);

  if (nestedChildren.length) {
    // find elements that DO NOT have children matching the selector = innermost matches
    return `${selector}:not(${selector} ${selector})`;
  }

  // no nested children = all elements are outermost
  return selector;
}

export function getCommonSelector(
  root: Element,
  ...els: Element[]
): string | null {
  if (els.length === 0) {
    return null;
  }

  const [el0, ...restEls] = els;

  const selectors: string[] = [];

  // class selectors
  for (const cls of el0.classList) {
    const matched = restEls.every(el => el.classList.contains(cls));

    if (matched) {
      selectors.push(`.${CSS.escape(cls)}`);
    }
  }

  // attribute selectors
  for (const attr of el0.attributes) {
    if (/^class|id|style|src|alt|href$/.test(attr.name)) {
      continue;
    }

    const matched = restEls.every(
      el => el.getAttribute(attr.name) === attr.value,
    );

    if (matched) {
      selectors.push(`[${CSS.escape(attr.name)}="${CSS.escape(attr.value)}"]`);
    }
  }

  // fallback to tag name
  if (selectors.length === 0) {
    const allSameTag = restEls.every(el => el.tagName === el0.tagName);

    if (!allSameTag) {
      return null;
    }

    const tagNameSelector = el0.tagName.toLowerCase();

    const parents = [el0.parentElement, ...restEls.map(el => el.parentElement)];

    if (parents.some(p => !p)) {
      return null;
    }

    if (parents.some(p => p === root)) {
      const p0 = parents[0];

      if (parents.every(p => p === p0)) {
        return '> ' + tagNameSelector;
      }

      return tagNameSelector;
    }

    const parentSelector = getCommonSelector(root, ...(parents as Element[]));

    if (!parentSelector) {
      return null;
    }

    return parentSelector + ' > ' + tagNameSelector;
  }

  let lastMatchedCount = 0;

  // simplify selectors
  for (let i = selectors.length - 1; i >= 0; i--) {
    const selector = getOutermostSelector(
      root,
      selectors.slice(0, i + 1).join(''),
    );
    const matched = root.querySelectorAll(selector);

    if (!lastMatchedCount) {
      lastMatchedCount = matched.length;
    }

    if (!matched.length || matched.length !== lastMatchedCount) {
      // use the last valid selector
      return lastMatchedCount
        ? getOutermostSelector(root, selectors.slice(0, i + 2).join(''))
        : null;
    }
  }

  // return the first selector as it is enough to identify the element
  return getOutermostSelector(root, selectors[0]);
}

export type ElementFeatures = {
  ancestor: string;
  items: string;
};

export function getCommonItemsAndAncestor(
  ...els: Element[]
): ElementFeatures | null {
  const ancestor = getCommonAncestor(...els);

  if (!ancestor) {
    return null;
  }

  const ancestorSelector = finder(ancestor);
  const commonSelector = getCommonSelector(ancestor, ...els) || '> *';

  return {
    items: `${ancestorSelector} ${commonSelector}`,
    ancestor: ancestorSelector,
  };
}

export function expandAnchorFrom(fromElem: Element): [Element, Element] | null {
  let anchor: Element | null = fromElem;
  let maxMatches = 0;
  let bestItemSelector: string | null = null;
  let bestMatches: Set<Element> | null = null;

  while (anchor) {
    const selectors = getCommonItemsAndAncestor(anchor);
    const currentAnchor = anchor;
    anchor = anchor.parentElement;

    if (selectors?.items) {
      const lastSelector = selectors.items.split(' ').at(-1);

      if (
        !lastSelector ||
        !(lastSelector.startsWith('.') || lastSelector.startsWith('['))
      ) {
        // avoid using tagname selector here
        continue;
      }

      const matches = document.querySelectorAll(selectors.items);
      const outerMostMatches = new Set(matches);

      if (currentAnchor !== fromElem) {
        const originalElemSelector = finder(fromElem, {
          root: currentAnchor,
          idName() {
            return false;
          },
        });

        for (const el of outerMostMatches) {
          // must contain elements similar to the original anchor
          if (!el.querySelector(originalElemSelector)) {
            outerMostMatches.delete(el);
          }
        }
      }

      for (const el1 of matches) {
        for (const el2 of outerMostMatches) {
          // only keep the outermost elements
          if (el1 !== el2 && el1.contains(el2)) {
            outerMostMatches.delete(el2);
          }
        }
      }

      if (outerMostMatches.size > maxMatches) {
        maxMatches = outerMostMatches.size;
        bestItemSelector = selectors.items;
        bestMatches = outerMostMatches;
      }
    }
  }

  if (bestItemSelector && bestMatches && bestMatches.size > 1) {
    const matches = [...bestMatches];
    const index = matches.findIndex(el => el.contains(fromElem));

    return [matches[index], matches[(index + 1) % matches.length]];
  }

  return null;
}
