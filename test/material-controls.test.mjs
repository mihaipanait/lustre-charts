import assert from 'node:assert/strict';
import test from 'node:test';

import { MATERIAL_CONTROLS, controlDefault } from '../demo/material-controls.js';
import { MATERIAL_PRESETS } from '../src/materials/materials.js';

test('the demo exposes valid curated controls for every material preset', () => {
  assert.deepEqual(Object.keys(MATERIAL_CONTROLS), MATERIAL_PRESETS);
  for (const preset of MATERIAL_PRESETS) {
    const controls = MATERIAL_CONTROLS[preset];
    assert.ok(controls.length > 0, preset);
    assert.equal(new Set(controls.map((control) => control.path)).size, controls.length, preset);
    for (const control of controls) {
      assert.ok(control.group && control.label && control.description, `${preset}:${control.path}`);
      assert.match(control.path, /^[a-z][a-zA-Z]*(\.[a-z][a-zA-Z]*)*$/);
      if (control.type === 'range') {
        assert.ok(control.min < control.max, `${preset}:${control.path}`);
        assert.ok(control.step > 0, `${preset}:${control.path}`);
        assert.ok(controlDefault(control, 'dark') >= control.min, `${preset}:${control.path}`);
        assert.ok(controlDefault(control, 'dark') <= control.max, `${preset}:${control.path}`);
        assert.ok(controlDefault(control, 'light') >= control.min, `${preset}:${control.path}`);
        assert.ok(controlDefault(control, 'light') <= control.max, `${preset}:${control.path}`);
        for (const theme of ['dark', 'light']) {
          const ticks = (controlDefault(control, theme) - control.min) / control.step;
          assert.ok(Math.abs(ticks - Math.round(ticks)) < 1e-7, `${preset}:${control.path}:${theme}`);
        }
      } else if (control.type === 'color') {
        assert.match(controlDefault(control, 'dark'), /^#[0-9a-f]{6}$/i);
        assert.match(controlDefault(control, 'light'), /^#[0-9a-f]{6}$/i);
      } else {
        assert.equal(control.type, 'select', `${preset}:${control.path}`);
        assert.ok(control.options.length >= 2, `${preset}:${control.path}`);
        assert.ok(control.options.some((option) => option.value === controlDefault(control, 'dark')));
        assert.ok(control.options.some((option) => option.value === controlDefault(control, 'light')));
      }
    }
  }
});
