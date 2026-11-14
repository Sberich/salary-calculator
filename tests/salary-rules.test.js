import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SALARY_CRITERIA,
  getCalculationBase,
  calculateIncrement,
  calculateSalaryResult,
  simulateAnnualIncrements
} from '../js/salary-rules.js';

test('SALARY_CRITERIA contains all 6 teacher ranks', () => {
  const expectedKeys = ['assistant', 'k1', 'k2', 'k3', 'k4', 'k5'];
  for (const key of expectedKeys) {
    assert.ok(SALARY_CRITERIA[key], `Criteria should contain key ${key}`);
    assert.ok(typeof SALARY_CRITERIA[key].name === 'string');
    assert.ok(typeof SALARY_CRITERIA[key].cutOff === 'number');
    assert.ok(typeof SALARY_CRITERIA[key].baseHigh === 'number');
    assert.ok(typeof SALARY_CRITERIA[key].baseLow === 'number');
  }
});

test('getCalculationBase selects baseHigh when salary >= cutOff', () => {
  // k3 cutOff is 40280
  const upper = getCalculationBase('k3', 40280);
  assert.equal(upper.base, 49330);
  assert.equal(upper.isUpper, true);

  const lower = getCalculationBase('k3', 40270);
  assert.equal(lower.base, 37200);
  assert.equal(lower.isUpper, false);
});

test('calculateIncrement rounds up to nearest 10 Baht', () => {
  // 49330 * 2.8% = 1381.24 -> rounds up to 1390
  const result = calculateIncrement(49330, 2.8);
  assert.equal(result.rawIncrease, 1381.24);
  assert.equal(result.roundedIncrease, 1390);

  // Exact multiple of 10 remains same
  const exact = calculateIncrement(10000, 2.0); // 200
  assert.equal(exact.roundedIncrease, 200);
});

test('calculateSalaryResult calculates grand total with allowances', () => {
  // k3: allowance = 5600, special = 5600 (total allowance = 11200)
  const res = calculateSalaryResult({ rankKey: 'k3', currentSalary: 42000, percent: 3.0 });
  // base = 49330; increment = Math.ceil((49330 * 0.03)/10)*10 = 1480
  // newSalaryBase = 42000 + 1480 = 43480
  // grandTotal = 43480 + 11200 = 54680
  assert.equal(res.baseSalary, 49330);
  assert.equal(res.isUpper, true);
  assert.equal(res.roundedIncrease, 1480);
  assert.equal(res.newSalaryBase, 43480);
  assert.equal(res.allowance, 5600);
  assert.equal(res.special, 5600);
  assert.equal(res.totalAllowance, 11200);
  assert.equal(res.grandTotal, 54680);
});

test('simulateAnnualIncrements cascades Round 1 into Round 2', () => {
  const sim = simulateAnnualIncrements({
    rankKey: 'k2',
    startingSalary: 30000, // below cutoff 30210 -> baseLow 30200
    percentRound1: 3.0,
    percentRound2: 3.0
  });
  // Round 1: base = 30200, inc = 910 -> new = 30910
  assert.equal(sim.round1.newSalaryBase, 30910);
  assert.equal(sim.round1.isUpper, false);
  // Round 2 salary is 30910 >= 30210 -> base switches to baseHigh 35270!
  assert.equal(sim.round2.baseSalary, 35270);
  assert.equal(sim.round2.isUpper, true);
  // Round 2 inc: Math.ceil((35270 * 0.03)/10)*10 = 1060
  assert.equal(sim.round2.roundedIncrease, 1060);
  assert.equal(sim.round2.newSalaryBase, 30910 + 1060);
});
