import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const route = new URL('../app/transparency/page.tsx', import.meta.url);
const page = readFileSync(route, 'utf8');
const home = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
const dashboard = readFileSync(new URL('../app/dashboard/page.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');

test('transparency centre exists and is linked from primary entry points', () => {
  assert.ok(existsSync(route));
  assert.match(home, /href="\/transparency">Transparency centre/);
  assert.match(dashboard, /href="\/transparency">◉ <span>Transparency centre/);
});

test('transparency copy clearly separates demo from live financial services', () => {
  assert.match(page, /NO LIVE FINANCIAL SERVICES/);
  assert.match(page, /not live quotes/);
  assert.match(page, /approved fee schedule/);
  assert.match(page, /not financial, investment, tax or legal advice/);
  assert.match(page, /substantial risk/);
});

test('transparency layout includes responsive styles', () => {
  assert.match(css, /\.transparency-grid/);
  assert.match(css, /@media\(max-width:760px\)/);
});
