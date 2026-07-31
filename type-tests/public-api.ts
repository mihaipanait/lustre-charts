import {
  BarChart,
  LustreChart,
  LustrePalettes,
  LustreThemes,
  RadialChart,
  type BarData,
  type LustreOptions,
  type PieData,
  type RadialData,
} from 'lustre-charts';

const pieData: PieData = [
  { label: 'Alpha', value: 60, material: 'glass' },
  { label: 'Beta', value: 40, color: '#ff00aa' },
];

const radialData: RadialData = [
  { label: 'Complete', value: 100, material: 'metal' },
  { label: 'Progress', value: 72, color: '#00e5ff' },
];

const options: LustreOptions = {
  theme: LustreThemes.dark,
  palette: LustrePalettes.aurora,
  material: { preset: 'metal', roughness: 0.25 },
  camera: {
    fov: 42,
    controls: { enableZoom: false, damping: 0.1 },
  },
  interaction: {
    onHover: (item, event) => {
      item?.value.toFixed(1);
      event?.preventDefault();
    },
  },
};

const chart = new LustreChart('#chart', {
  type: 'donut',
  data: pieData,
  options,
});
chart.applyOptions({ labels: { show: false } });
chart.update({ data: [{ label: 'Gamma', value: 1 }] });
chart.toDataURL();
chart.destroy();

const barData: BarData = {
  categories: ['Q1', 'Q2'],
  series: [{ name: 'Revenue', values: [10, 20] }],
};

declare const container: HTMLElement;
const bars = new BarChart(container, { type: 'bar', data: barData });
bars.setData(barData, false);

const radial = new RadialChart(container, {
  type: 'radial',
  data: radialData,
  options: {
    radial: { maxValue: 100, ringGap: 0.08, track: { color: 'auto', opacity: 0.4 } },
  },
});
radial.update({ data: [{ label: 'Updated', value: 88 }] });
