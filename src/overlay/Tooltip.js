/**
 * @module overlay/Tooltip
 * Frosted-glass tooltip following the pointer. Content comes from the
 * chart (`getTooltipHTML`) or a user `tooltip.format` callback.
 */

import { el } from '../core/utils.js';

export class Tooltip {
  /** @param {import('../core/BaseChart.js').BaseChart} chart */
  constructor(chart) {
    this.chart = chart;
    this.node = el('div', { className: 'lustre-tooltip' }, chart.root);
    this.visible = false;
  }

  /**
   * @param {string | Node} content
   * @param {{x: number, y: number} | null} pos
   */
  show(content, pos) {
    if (content instanceof Node) this.node.replaceChildren(content);
    else this.node.innerHTML = content;
    this.node.classList.add('visible');
    this.visible = true;
    if (pos) this.move(pos);
  }

  /** @param {{x: number, y: number} | null} pos */
  move(pos) {
    if (!this.visible || !pos) return;
    const { w } = this.chart._size;
    const r = this.node.getBoundingClientRect();
    // keep inside the container
    const x = Math.min(Math.max(pos.x, r.width / 2 + 6), w - r.width / 2 - 6);
    const flip = pos.y - r.height - 20 < 0;
    this.node.style.left = `${x}px`;
    this.node.style.top = `${pos.y}px`;
    this.node.style.transform = flip
      ? 'translate(-50%, 18px)'
      : 'translate(-50%, calc(-100% - 16px))';
  }

  hide() {
    if (!this.visible) return;
    this.visible = false;
    this.node.classList.remove('visible');
  }
}

/**
 * Build the library's default tooltip without interpolating data into HTML.
 * Custom formatter strings remain HTML for backward compatibility.
 *
 * @param {{ title: any, color: string, value: any, sub?: any }} content
 * @returns {DocumentFragment}
 */
export function createTooltipContent({ title, color, value, sub }) {
  const fragment = document.createDocumentFragment();
  const titleNode = el('div', { className: 'lustre-tt-title' }, fragment);
  const dot = el('span', { className: 'lustre-tt-dot' }, titleNode);
  dot.style.background = color;
  dot.style.color = color;
  titleNode.appendChild(document.createTextNode(String(title)));
  el('div', { className: 'lustre-tt-value', textContent: String(value) }, fragment);
  if (sub !== undefined && sub !== null) {
    el('div', { className: 'lustre-tt-sub', textContent: String(sub) }, fragment);
  }
  return fragment;
}
