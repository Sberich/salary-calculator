import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('verify HTML structure and element presence', () => {
  const html = fs.readFileSync('D:/Code/X/salary-pj/index.html', 'utf8');

  // Check critical interactive elements
  const requiredElements = [
    'id="rankPickerBtn"',
    'id="rankSheetModal"',
    'id="btnCloseRankSheet"',
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
    'id="toastNotice"',
    'id="btnInstallApp"',
    'id="heroIncrement"',
    'id="slipIncrement"',
    'id="heroNewBase"',
    'id="slipNewBase"',
    'id="heroTotalAllowance"',
    'id="slipTotalAllowance"',
    'id="bracketIcon"',
    'id="bracketText"',
    'id="btnToggleLedger"',
    'id="ledgerCardBody"',
    'id="sectionLedgerTitle"'
  ];

  for (const elem of requiredElements) {
    assert.ok(html.includes(elem), `index.html must include ${elem}`);
  }

  // Check section name updated to บัญชีแจกแจงเงินเดือน
  assert.ok(html.includes('บัญชีแจกแจงเงินเดือน'), 'must include บัญชีแจกแจงเงินเดือน');
  assert.ok(!html.includes('โครงสร้างรายรับ'), 'โครงสร้างรายรับ should be replaced');

  // Check PWA tags
  assert.ok(html.includes('rel="manifest"'), 'must include manifest link');
  assert.ok(html.includes('apple-mobile-web-app-capable'), 'must include apple-mobile-web-app-capable');
  assert.ok(html.includes('mobile-web-app-capable'), 'must include mobile-web-app-capable');

  // Check that quick chips are 2.5, 2.9, 3.0, 3.2, 3.5
  assert.ok(html.includes('data-val="2.5"'));
  assert.ok(html.includes('data-val="2.9"'));
  assert.ok(html.includes('data-val="3.0"'));
  assert.ok(html.includes('data-val="3.2"'));
  assert.ok(html.includes('data-val="3.5"'));
  assert.ok(!html.includes('data-val="4.0"'), '4.0% chip should be removed for minimalism');
  assert.ok(!html.includes('data-val="2.0"'), '2.0% chip should be removed for minimalism');
});
