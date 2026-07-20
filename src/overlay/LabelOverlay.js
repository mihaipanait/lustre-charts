/**
 * @module overlay/LabelOverlay
 * SVG callout labels — the classic infographic "dot + elbow leader + text"
 * style. Crisp at any DPI, styleable, and animated alongside the chart.
 *
 * Charts own the projection math and call `place()` for every entry on each
 * rendered frame; this class only manages SVG nodes.
 */

import { svgEl } from '../core/utils.js';

export class LabelOverlay {
  /** @param {import('../core/BaseChart.js').BaseChart} chart */
  constructor(chart) {
    this.chart = chart;
    this.svg = svgEl('svg', { class: 'lustre-labels' }, chart.root);
    this.resize(chart._size.w, chart._size.h);
    /** @type {Map<number, {g: SVGGElement, path: SVGPathElement, dot: SVGCircleElement, text: SVGTextElement}>} */
    this.nodes = new Map();
    this._halo = 'rgba(0,0,0,0.5)';
  }

  resize(w, h) {
    this.svg.setAttribute('width', w);
    this.svg.setAttribute('height', h);
    this.svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  }

  onTheme() {
    const dark = this.chart.theme.kind === 'dark';
    this._halo = dark ? 'rgba(4, 7, 14, 0.65)' : 'rgba(255, 255, 255, 0.78)';
    const o = this.chart.options.labels;
    const lineColor = o.lineColor === 'auto' ? this.chart.theme.lineColor : o.lineColor;
    const textColor = o.color === 'auto' ? this.chart.theme.textColor : o.color;
    for (const n of this.nodes.values()) {
      n.path.setAttribute('stroke', lineColor);
      n.text.setAttribute('fill', textColor);
      n.text.setAttribute('stroke', this._halo);
    }
  }

  /**
   * (Re)create label nodes for the chart's items.
   * @param {{ color: string }[]} entries
   */
  setEntries(entries) {
    this.clear();
    const o = this.chart.options.labels;
    if (!o.show) return;
    const lineColor = o.lineColor === 'auto' ? this.chart.theme.lineColor : o.lineColor;
    const textColor = o.color === 'auto' ? this.chart.theme.textColor : o.color;

    entries.forEach((entry, i) => {
      const g = svgEl('g', { opacity: 0 }, this.svg);
      const path = svgEl('path', {
        fill: 'none',
        stroke: lineColor,
        'stroke-width': 1.3,
        'stroke-linejoin': 'round',
        'stroke-linecap': 'round',
      }, g);
      const dot = svgEl('circle', { r: 3.2, fill: entry.color }, g);
      const text = svgEl('text', {
        'font-size': o.fontSize,
        'font-family': o.fontFamily,
        'font-weight': 600,
        fill: textColor,
        stroke: this._halo,
        'stroke-width': 3,
        'paint-order': 'stroke',
        'dominant-baseline': 'middle',
        'letter-spacing': '0.015em',
      }, g);
      if (!o.dot) dot.setAttribute('r', 0);
      this.nodes.set(i, { g, path, dot, text });
    });
  }

  /**
   * Position one label. Called per rendered frame by the chart.
   * @param {number} index
   * @param {object} p
   * @param {number} p.ax  anchor x (px)   — point on the slice
   * @param {number} p.ay  anchor y (px)
   * @param {number} p.dx  outward direction x (normalized, screen space)
   * @param {number} p.dy  outward direction y
   * @param {string} p.textContent
   * @param {number} p.opacity 0–1
   */
  place(index, { ax, ay, dx, dy, textContent, opacity }) {
    const n = this.nodes.get(index);
    if (!n) return;
    if (opacity <= 0.01) {
      n.g.setAttribute('opacity', 0);
      return;
    }
    const o = this.chart.options.labels;
    const ex = ax + dx * o.offset;
    const ey = ay + dy * o.offset;
    const side = dx >= 0 ? 1 : -1;
    const tailLen = 16;
    const tx = ex + side * tailLen;

    n.g.setAttribute('opacity', opacity.toFixed(3));
    n.path.setAttribute('d', `M ${ax.toFixed(1)} ${ay.toFixed(1)} L ${ex.toFixed(1)} ${ey.toFixed(1)} L ${tx.toFixed(1)} ${ey.toFixed(1)}`);
    n.dot.setAttribute('cx', (tx + side * 7).toFixed(1));
    n.dot.setAttribute('cy', ey.toFixed(1));
    if (n.text.textContent !== textContent) n.text.textContent = textContent;
    n.text.setAttribute('x', (tx + side * (o.dot ? 15 : 6)).toFixed(1));
    n.text.setAttribute('y', ey.toFixed(1));
    n.text.setAttribute('text-anchor', side > 0 ? 'start' : 'end');
  }

  /** Hide one label without destroying it. */
  hide(index) {
    this.nodes.get(index)?.g.setAttribute('opacity', 0);
  }

  clear() {
    for (const n of this.nodes.values()) n.g.remove();
    this.nodes.clear();
  }
}
