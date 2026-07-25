import {
  BarChart,
  LustreChart,
  LustrePalettes,
  LustreThemes,
  type BarData,
  type LustreOptions,
  type PieData,
} from 'lustre-charts';

const pieData: PieData = [
  { label: 'Alpha', value: 60, material: 'glass' },
  { label: 'Beta', value: 40, color: '#ff00aa' },
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
