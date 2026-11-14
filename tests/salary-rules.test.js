import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SALARY_CRITERIA,
  getCalculationBase,
  checkSalaryBounds,
  calculateIncrement,
  calculateSalaryResult,
  simulateAnnualIncrements
} from '../js/salary-rules.js';

test('SALARY_CRITERIA contains all 6 teacher ranks with min/max ceilings', () => {
  const expectedKeys = ['assistant', 'k1', 'k2', 'k3', 'k4', 'k5'];
  for (const key of expectedKeys) {
    const c = SALARY_CRITERIA[key];
    assert.ok(c, `Criteria should contain key ${key}`);
    assert.ok(typeof c.name === 'string');
    assert.ok(typeof c.minSalary === 'number' && c.minSalary > 0);
    assert.ok(typeof c.maxSalary === 'number' && c.maxSalary > c.minSalary);
    assert.ok(typeof c.cutOff === 'number');
    assert.ok(typeof c.baseHigh === 'number');
    assert.ok(typeof c.baseLow === 'number');
  }
});

test('checkSalaryBounds correctly warns when salary is out of rank bounds', () => {
  // assistant min: 15050, max: 24750
  const valid = checkSalaryBounds('assistant', 18000);
  assert.equal(valid.isValid, true);
  assert.equal(valid.warning, null);

  const tooLow = checkSalaryBounds('assistant', 12000);
  assert.equal(tooLow.isValid, false);
  assert.equal(tooLow.isBelowMin, true);

  const tooHigh = checkSalaryBounds('assistant', 42000);
  assert.equal(tooHigh.isValid, false);
  assert.equal(tooHigh.isAboveMax, true);
  assert.ok(tooHigh.warning.includes('สูงกว่าเพดาน'));
});

test('getCalculationBase selects baseHigh when salary >= cutOff', () => {
  const upper = getCalculationBase('k3', 40280);
  assert.equal(upper.base, 49330);
  assert.equal(upper.isUpper, true);

  const lower = getCalculationBase('k3', 40270);
  assert.equal(lower.base, 37200);
  assert.equal(lower.isUpper, false);
});

test('calculateIncrement clamps percentage and rounds up to nearest 10 Baht', () => {
  // 49330 * 2.8% = 1381.24 -> rounds up to 1390
  const result = calculateIncrement(49330, 2.8);
  assert.equal(result.rawIncrease, 1381.24);
  assert.equal(result.roundedIncrease, 1390);

  // Negative percent clamped to 0
  const neg = calculateIncrement(49330, -2.0);
  assert.equal(neg.safePercent, 0);
  assert.equal(neg.roundedIncrease, 0);

  // Over 6% clamped to 6%
  const high = calculateIncrement(49330, 10.0);
  assert.equal(high.safePercent, 6.0);
});

test('calculateSalaryResult calculates grand total and handles ceiling spillover', () => {
  // Normal case: k3: allowance = 5600, special = 5600
  const res = calculateSalaryResult({ rankKey: 'k3', currentSalary: 42000, percent: 3.0 });
  assert.equal(res.baseSalary, 49330);
  assert.equal(res.isUpper, true);
  assert.equal(res.roundedIncrease, 1480);
  assert.equal(res.newSalaryBase, 43480);
  assert.equal(res.allowance, 5600);
  assert.equal(res.special, 5600);
  assert.equal(res.totalAllowance, 11200);
  assert.equal(res.grandTotal, 54680);
  assert.equal(res.isCapped, false);

  // Capped case: k1 maxSalary is 34310
  // Salary 34000 + inc 900 -> raw 34900 -> capped at 34310, spillover = 590
  const capped = calculateSalaryResult({ rankKey: 'k1', currentSalary: 34000, percent: 3.0 });
  assert.equal(capped.isCapped, true);
  assert.equal(capped.newSalaryBase, 34310);
  assert.equal(capped.spilloverCompensation, 580);
  assert.equal(capped.grandTotal, 34310 + 580);
});

test('simulateAnnualIncrements cascades Round 1 into Round 2', () => {
  const sim = simulateAnnualIncrements({
    rankKey: 'k2',
    startingSalary: 30000,
    percentRound1: 3.0,
    percentRound2: 3.0
  });
  assert.equal(sim.round1.newSalaryBase, 30910);
  assert.equal(sim.round2.baseSalary, 35270);
});
