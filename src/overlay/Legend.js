/**
 * @module overlay/Legend
 * Glassmorphism legend chips. Interactive by default: click toggles an
 * item's visibility (with an animated re-layout), hovering highlights the
 * matching slice/bar.
 */

import { el } from '../core/utils.js';

export class Legend {
  /** @param {import('../core/BaseChart.js').BaseChart} chart */
  constructor(chart) {
    this.chart = chart;
    this.node = null;
    /** @type {HTMLElement[]} */
    this.chips = [];
  }

  /**
   * @param {{ label: string, color: string, visible: boolean }[]} entries
   * @param {{ onToggle?: (i: number) => void, onHover?: (i: number | null) => void }} handlers
   */
  setEntries(entries, handlers = {}) {
    this.clear();
    const o = this.chart.options.legend;
    if (!o.show || entries.length === 0) return;

    this.node = el(
      'div',
      { className: `lustre-legend lustre-legend-${o.position === 'top' ? 'top' : 'bottom'}` },
      this.chart.root
    );

    entries.forEach((entry, i) => {
      const chip = el('button', {
        className: 'lustre-chip' + (o.interactive ? '' : ' lustre-chip-static') + (entry.visible ? '' : ' off'),
        type: 'button',
      }, this.node);
      chip.setAttribute('aria-pressed', String(entry.visible));
      const dot = el('span', { className: 'lustre-chip-dot' }, chip);
      dot.style.background = entry.color;
      dot.style.color = entry.color; // feeds the glow via currentColor
      const label = el('span', { className: 'lustre-chip-label' }, chip);
      label.textContent = entry.label;

      if (o.interactive) {
        chip.addEventListener('click', () => handlers.onToggle?.(i));
        chip.addEventListener('pointerenter', () => handlers.onHover?.(i));
        chip.addEventListener('pointerleave', () => handlers.onHover?.(null));
      }
      this.chips.push(chip);
    });
  }

  /** Update a chip's on/off look after a visibility toggle. */
  setVisible(i, visible) {
    const chip = this.chips[i];
    if (!chip) return;
    chip.classList.toggle('off', !visible);
    chip.setAttribute('aria-pressed', String(visible));
  }

  clear() {
    this.node?.remove();
    this.node = null;
    this.chips = [];
  }
}
