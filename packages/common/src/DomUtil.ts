/**
 * @Author: Caven
 * @Date: 2021-04-27 13:04:34
 */

/**
 * Creates an HTML element with `tagName`, sets its class to `className`, and optionally appends it to `container` element.
 * @param tagName
 * @param className
 * @param container
 * @returns {HTMLElement}
 */
export function createDom(
  tagName: string,
  className: string,
  container: Element | null = null,
): HTMLElement {
  const el = document.createElement(tagName);
  el.className = className || '';
  if (container) {
    container.appendChild(el);
  }
  return el;
}

/**
 * Parses string to Dom
 * @param domStr
 * @param className
 * @returns {HTMLDivElement}
 */
export function parseDom(domStr: string, className: string): HTMLDivElement {
  const el = document.createElement('div');
  el.className = className || '';
  el.innerHTML = domStr;
  return el;
}
