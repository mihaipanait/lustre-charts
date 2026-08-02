import { expect, test } from '@playwright/test';

function collectPageErrors(page) {
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

test('runtime option and lifecycle regression harness passes', async ({ page }) => {
  const errors = collectPageErrors(page);
  await page.goto('/tools/browser-runtime.html');
  await page.locator('body[data-status="pass"], body[data-status="fail"]').waitFor();
  await expect(page.locator('body')).toHaveAttribute('data-status', 'pass');
  await expect(page.getByRole('status')).toContainText('grouped bars fit a narrow camera frustum');
  expect(errors).toEqual([]);
});

test('demo exposes operable chart, material, palette, and theme controls', async ({ page }) => {
  test.slow(); // A 1024px PMREM rebuild can exceed the base timeout on software-rendered CI.
  const errors = collectPageErrors(page);
  await page.goto('/demo/?quality=balanced');

  await expect(page.getByRole('heading', { name: 'Lustre', level: 1 })).toBeVisible();
  const pieTab = page.getByRole('tab', { name: 'Pie / Donut' });
  const radialTab = page.getByRole('tab', { name: 'Radial' });
  const barTab = page.getByRole('tab', { name: 'Bar' });
  await expect(pieTab).toHaveAttribute('aria-selected', 'true');
  await pieTab.press('ArrowRight');
  await expect(radialTab).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('img', { name: /Radial chart/ })).toBeVisible();
  await radialTab.press('ArrowRight');
  await expect(barTab).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('img', { name: /Bar chart/ })).toBeVisible();

  const materialGroup = page.getByRole('group', { name: 'Material preset' });
  await materialGroup.getByRole('button', { name: 'metal', exact: true }).click();
  await expect(materialGroup.getByRole('button', { name: 'metal', exact: true }))
    .toHaveAttribute('aria-pressed', 'true');

  const paletteGroup = page.getByRole('group', { name: 'Color palette' });
  await paletteGroup.getByRole('button', { name: 'ocean', exact: true }).click();
  await expect(paletteGroup.getByRole('button', { name: 'ocean', exact: true }))
    .toHaveAttribute('aria-pressed', 'true');

  const theme = page.getByRole('button', { name: 'Switch to light theme' });
  await theme.click();
  await expect(page.getByRole('button', { name: 'Switch to dark theme' }))
    .toHaveAttribute('aria-pressed', 'true');

  const quality = page.getByRole('combobox', { name: 'Rendering quality' });
  await expect(quality).toHaveValue('balanced');
  await page.getByRole('combobox', { name: 'PMREM cube face size' }).selectOption('1024');
  await page.getByRole('slider', { name: 'Angular segments' }).fill('512');
  await expect(page.locator('#codeView')).toContainText('"environmentSize": 1024');
  await expect(page.locator('#codeView')).toContainText('"radialResolution": 512');
  expect(await page.evaluate(() => window.chart.quality.environmentSize)).toBe(1024);
  expect(await page.evaluate(() => window.chart.quality.radialResolution)).toBe(512);
  expect(await page.evaluate(() => ({
    width: window.chart._envTarget.width,
    height: window.chart._envTarget.height,
  }))).toEqual({ width: 3072, height: 4096 });
  expect(errors).toEqual([]);
});

test('demo edits custom palettes and every chart data shape', async ({ page }) => {
  test.slow();
  const errors = collectPageErrors(page);
  await page.goto('/demo/?quality=balanced');

  const data = page.getByRole('region', { name: 'Data' });
  await data.getByRole('textbox', { name: 'Slice 1 name', exact: true }).fill('Revenue');
  await expect(page.getByRole('img', { name: /Pie chart\. Revenue/ })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.chart._entranceProgress)).toBe(1);
  expect(await page.evaluate(() => window.chart.items.every((item) =>
    (item.mesh?.geometry?.attributes?.position?.count || 0) > 0
  ))).toBe(true);
  await page.getByRole('combobox', { name: 'Entrance' }).selectOption('none');

  const palette = page.getByRole('region', { name: 'Palette' });
  await palette.getByRole('button', { name: 'custom', exact: true }).click();
  await palette.getByRole('textbox', { name: 'Custom palette color 1 hex', exact: true })
    .fill('#ff3355');
  await palette.getByRole('button', { name: '＋ Add color', exact: true }).click();
  await expect(palette).toContainText('Custom · 7');
  await expect(page.locator('#codeView')).toContainText('"palette": [');
  await expect(page.locator('#codeView')).toContainText('"#ff3355"');
  expect(await page.evaluate(() => window.chart.options.palette[0])).toBe('#ff3355');

  await data.getByRole('spinbutton', { name: 'Slice 1 value', exact: true }).fill('61');
  await data.getByRole('button', { name: '＋ Slice', exact: true }).click();
  await expect(data).toContainText('6 slices');
  await expect(page.getByRole('img', { name: /Pie chart\. Revenue/ })).toBeVisible();
  await expect(page.locator('#codeView')).toContainText('"label": "Revenue"');
  await expect(page.locator('#codeView')).toContainText('"value": 61');

  await page.getByRole('tab', { name: 'Radial', exact: true }).click();
  await data.getByRole('textbox', { name: 'Ring 1 name', exact: true }).fill('Engagement');
  await data.getByRole('spinbutton', { name: 'Ring 1 value', exact: true }).fill('73');
  await data.getByRole('button', { name: '＋ Ring', exact: true }).click();
  await expect(data).toContainText('6 rings');
  await expect(page.getByRole('img', { name: /Radial chart\. Engagement/ })).toBeVisible();

  await page.getByRole('tab', { name: 'Bar', exact: true }).click();
  await data.getByRole('textbox', { name: 'Series 1 name', exact: true }).fill('Baseline');
  await data.getByRole('textbox', { name: 'Category 1 name', exact: true }).fill('North');
  await data.getByRole('spinbutton', { name: 'Baseline, North value', exact: true }).fill('88');
  await data.getByRole('button', { name: '＋ Series', exact: true }).click();
  await data.getByRole('button', { name: '＋ Category', exact: true }).click();
  await expect(data).toContainText('4 × 5');
  await expect(data.getByRole('textbox', { name: 'Series 4 name', exact: true })).toHaveValue('Series 4');
  await expect(page.locator('#codeView')).toContainText('"Baseline"');
  await expect(page.locator('#codeView')).toContainText('"North"');
  await expect(page.locator('#codeView')).toContainText('88');
  expect(await page.evaluate(() => ({
    category: window.chart._data.categories[0],
    series: window.chart._data.series[0].name,
    value: window.chart._data.series[0].values[0],
  }))).toEqual({ category: 'North', series: 'Baseline', value: 88 });

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.locator('.data-card').evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  expect(errors).toEqual([]);
});

test('material editor applies, retains, resets, and exports preset-specific overrides', async ({ page }) => {
  const errors = collectPageErrors(page);
  await page.goto('/demo/?quality=balanced');
  const materialGroup = page.getByRole('group', { name: 'Material preset' });
  const editor = page.getByRole('region', { name: 'Material settings' });
  await page.getByRole('combobox', { name: 'Entrance' }).selectOption('none');
  const presets = ['glass', 'toon', 'halftone', 'iridescent', 'inset'];

  for (const preset of presets) {
    await materialGroup.getByRole('button', { name: preset, exact: true }).click();
    await expect(page.locator('#materialEditor')).toHaveAttribute('data-preset', preset);
    expect(await editor.locator('input').count()).toBeGreaterThan(0);
  }

  await materialGroup.getByRole('button', { name: 'toon', exact: true }).click();
  await editor.getByRole('textbox', { name: 'Outline color', exact: true }).fill('#ffffff');
  await editor.getByRole('slider', { name: 'Outline width', exact: true }).fill('4.2');
  await expect(editor).toContainText('2 customized');
  await expect(page.locator('#codeView')).toContainText('"color": "#ffffff"');
  await expect(page.locator('#codeView')).toContainText('"widthPx": 4.2');

  await materialGroup.getByRole('button', { name: 'inset', exact: true }).click();
  await editor.getByRole('textbox', { name: 'Face color', exact: true }).fill('#f6c945');
  await editor.getByRole('slider', { name: 'Face inset', exact: true }).fill('0.18');
  await expect(page.locator('#codeView')).toContainText('"layer"');
  await expect(page.locator('#codeView')).toContainText('"inset": 0.18');

  await materialGroup.getByRole('button', { name: 'toon', exact: true }).click();
  const retained = await page.evaluate(() => window.chart.options.material);
  expect(retained).toEqual({
    preset: 'toon',
    outline: { color: '#ffffff', widthPx: 4.2 },
  });
  await editor.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(editor).toContainText('Defaults');
  await expect(page.locator('#codeView')).toContainText('"material": "toon"');
  expect(await page.evaluate(() => window.chart.options.material)).toBe('toon');
  expect(errors).toEqual([]);
});

test('drag gestures suppress segment hover until the pointer moves intentionally again', async ({ page }) => {
  const errors = collectPageErrors(page);
  await page.goto('/demo/?quality=balanced');
  await page.getByRole('img', { name: /Pie chart/ }).waitFor();

  const interaction = await page.evaluate(() => {
    const chart = window.chart;
    const event = (clientX, clientY) => ({ clientX, clientY });

    chart._applyHover(0, event(100, 100));
    chart._onPointerDown(event(100, 100));
    const clearedOnPress = chart.hoveredIndex === null;

    chart._onPointerMove(event(130, 115));
    const suppressedDuringDrag = chart._pickPending === false && chart.hoveredIndex === null;

    let picks = 0;
    const doPick = chart._doPick;
    chart._doPick = () => { picks += 1; };
    chart._onPointerUp(event(130, 115));
    const suppressedOnDragRelease = picks === 0 && chart.hoveredIndex === null;

    chart._onPointerMove(event(131, 115));
    const freshMoveRequestsHover = chart._pickPending === true;
    chart._pickPending = false;

    chart._onPointerDown(event(140, 120));
    chart._onPointerUp(event(140, 120));
    const clickStillPicks = picks === 1;

    chart._doPick = doPick;

    return {
      clearedOnPress,
      suppressedDuringDrag,
      suppressedOnDragRelease,
      freshMoveRequestsHover,
      clickStillPicks,
    };
  });

  expect(interaction).toEqual({
    clearedOnPress: true,
    suppressedDuringDrag: true,
    suppressedOnDragRelease: true,
    freshMoveRequestsHover: true,
    clickStillPicks: true,
  });
  expect(errors).toEqual([]);
});

test('layered inset builds and animates real plate geometry on every chart type', async ({ page }) => {
  const errors = collectPageErrors(page);
  await page.goto('/demo/?quality=balanced');
  await page.getByRole('group', { name: 'Material preset' })
    .getByRole('button', { name: 'inset', exact: true })
    .click();

  const expectLayerStack = async () => {
    const state = await page.evaluate(() => ({
      itemCount: window.chart.items.length,
      valid: window.chart.items.every((item) =>
        item.layers?.length === 1 &&
        item.layers.every((layer) =>
          Number.isFinite(layer.mesh.position.y) &&
          layer.mesh.geometry.attributes.position.count > 0
        )
      ),
    }));
    expect(state.itemCount).toBeGreaterThan(0);
    expect(state.valid).toBe(true);
  };

  await page.waitForTimeout(1_700);
  await expectLayerStack();

  await page.getByRole('tab', { name: 'Radial' }).click();
  await page.waitForTimeout(1_700);
  await expectLayerStack();

  await page.getByRole('tab', { name: 'Bar' }).click();
  await page.waitForTimeout(1_700);
  await expectLayerStack();

  await page.getByRole('button', { name: '⟲ Replay entrance' }).click();
  await page.waitForTimeout(320);
  const synchronized = await page.evaluate(() => window.chart.items.every((item) =>
    item.layers.every((layer) =>
      Math.abs(layer.mesh.scale.y - item.mesh.scale.y) < 1e-6 &&
      Number.isFinite(layer.mesh.position.y)
    )
  ));
  expect(synchronized).toBe(true);
  expect(errors).toEqual([]);
});

test.describe('mobile sizing', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('pie callouts and grouped bars remain within the stage', async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.goto('/demo/?quality=balanced');
    await page.getByRole('img', { name: /Pie chart/ }).waitFor();
    await page.waitForTimeout(1_800);

    const labelsFit = await page.locator('#stage').evaluate((stage) => {
      const stageRect = stage.getBoundingClientRect();
      return [...stage.querySelectorAll('.lustre-labels text')].every((text) => {
        const rect = text.getBoundingClientRect();
        return rect.left >= stageRect.left - 1 && rect.right <= stageRect.right + 1;
      });
    });
    expect(labelsFit).toBe(true);

    await page.getByRole('tab', { name: 'Radial' }).click();
    await page.getByRole('img', { name: /Radial chart/ }).waitFor();
    await page.waitForTimeout(1_800);
    const radialLabelsFit = await page.locator('#stage').evaluate((stage) => {
      const stageRect = stage.getBoundingClientRect();
      const labels = [...stage.querySelectorAll('.lustre-labels text')]
        .map((text) => text.getBoundingClientRect())
        .filter((rect) => rect.width > 0 && rect.height > 0);
      const inside = labels.every((rect) =>
        rect.left >= stageRect.left - 1 && rect.right <= stageRect.right + 1 &&
        rect.top >= stageRect.top - 1 && rect.bottom <= stageRect.bottom + 1
      );
      const overlaps = labels.some((rect, index) =>
        labels.slice(index + 1).some((other) =>
          rect.left < other.right && rect.right > other.left &&
          rect.top < other.bottom && rect.bottom > other.top
        )
      );
      return inside && !overlaps;
    });
    expect(radialLabelsFit).toBe(true);

    await page.getByRole('tab', { name: 'Bar' }).click();
    await page.getByRole('img', { name: /Bar chart/ }).waitFor();
    const barsFit = await page.locator('#stage').evaluate(() => {
      const chart = window.chart;
      chart.scene.updateMatrixWorld(true);
      return chart.items.every((item) => {
        item.mesh.geometry.computeBoundingBox();
        const box = item.mesh.geometry.boundingBox;
        return [box.min.x, box.max.x].every((x) =>
          [box.min.y, box.max.y].every((y) =>
            [box.min.z, box.max.z].every((z) => {
              const projected = item.mesh.position
                .clone()
                .set(x, y, z)
                .applyMatrix4(item.mesh.matrixWorld)
                .project(chart.camera);
              return Math.abs(projected.x) <= 1.02 && Math.abs(projected.y) <= 1.02;
            })
          )
        );
      });
    });
    expect(barsFit).toBe(true);
    expect(errors).toEqual([]);
  });
});
