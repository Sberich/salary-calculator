import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('verify HTML structure and element presence', () => {
  const html = fs.readFileSync('D:/Code/X/salary-pj/index.html', 'utf8');

  // Check critical interactive elements
  const requiredElements = [
    'id="rankSelect"',
    'id="salaryInput"',
    'id="percentSlider"',
    'id="percentInput"',
    'id="modeSingleBtn"',
    'id="modeAnnualBtn"',
    'id="btnOpenCriteria"',
    'id="themeToggleBtn"',
    'id="btnExportImage"',
    'id="btnCopySummary"',
    'id="criteriaModal"',
    'id="btnCloseCriteria"',
    'id="imageModal"',
    'id="btnCloseImageModal"',
    'id="btnModalDownloadDirect"',
    'id="btnModalShare"',
    'id="toastNotice"'
  ];

  for (const elem of requiredElements) {
    assert.ok(html.includes(elem), `index.html must include ${elem}`);
  }

  // Check that quick chips are 2.5, 3.0, 3.5
  assert.ok(html.includes('data-val="2.5"'));
  assert.ok(html.includes('data-val="3.0"'));
  assert.ok(html.includes('data-val="3.5"'));
  assert.ok(!html.includes('data-val="4.0"'), '4.0% chip should be removed for minimalism');
  assert.ok(!html.includes('data-val="2.0"'), '2.0% chip should be removed for minimalism');
});
