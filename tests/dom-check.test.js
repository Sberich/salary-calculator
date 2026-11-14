import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('every getElementById in app.js exists in index.html', () => {
  const html = fs.readFileSync('D:/Code/X/salary-pj/index.html', 'utf8');
  const js = fs.readFileSync('D:/Code/X/salary-pj/js/app.js', 'utf8');

  const regex = /getElementById\('([^']+)'\)/g;
  let match;
  const missing = [];
  const checked = new Set();

  while ((match = regex.exec(js)) !== null) {
    const id = match[1];
    if (!checked.has(id)) {
      checked.add(id);
      if (!html.includes(`id="${id}"`)) {
        missing.push(id);
      }
    }
  }

  assert.equal(missing.length, 0, `Missing IDs in index.html: ${missing.join(', ')}`);
});
