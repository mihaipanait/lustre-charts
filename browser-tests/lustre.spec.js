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
  const errors = collectPageErrors(page);
  await page.goto('/demo/');

  await expect(page.getByRole('heading', { name: 'Lustre', level: 1 })).toBeVisible();
  const pieTab = page.getByRole('tab', { name: 'Pie / Donut' });
  const barTab = page.getByRole('tab', { name: 'Bar' });
  await expect(pieTab).toHaveAttribute('aria-selected', 'true');
  await pieTab.press('ArrowRight');
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
  expect(errors).toEqual([]);
});

test.describe('mobile sizing', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('pie callouts and grouped bars remain within the stage', async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.goto('/demo/');
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
