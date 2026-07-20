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
   * @param {string | HTMLElement} content
   * @param {{x: number, y: number} | null} pos
   */
  show(content, pos) {
    if (content instanceof HTMLElement) this.node.replaceChildren(content);
    else this.node.innerHTML = content;
    this.node.classList.add('visible');
    this.visible = true;
    if (pos) this.move(pos);
  }

  /** @param {{x: number, y: number} | null} pos */
  move(pos) {
    if (!this.visible || !pos) return;
    const { w, h } = this.chart._size;
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
