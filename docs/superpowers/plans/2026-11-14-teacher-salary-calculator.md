# Teacher Salary Calculator (ครูไทย ยุคใหม่) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a modern, bespoke Thai Teacher Salary Calculator web application with dual themes (Warm Editorial & Nordic Mint), real-time calculation based on official ก.ค.ศ. rules, digital payslip visualization, and image export, ready for GitHub + Cloudflare Pages deployment.

**Architecture:** Pure static web application (HTML5, Custom CSS Design Tokens, Modular Vanilla ES6 JavaScript) with zero runtime dependencies. Client-side reactive calculation engine and canvas-based digital payslip card generator.

**Tech Stack:** HTML5, Modern CSS (Design Tokens, Custom Properties, Glassmorphism, Micro-elevation), Vanilla JavaScript (ES6+ Modules), Node.js native test runner (`node --test`), HTML5 Canvas API.

**Spec:** Based on krunut.com salary calculation logic and user-approved blueprint:
- Ranks: ครูผู้ช่วย, คศ.1, คศ.2 (ชำนาญการ), คศ.3 (ชำนาญการพิเศษ), คศ.4 (เชี่ยวชาญ), คศ.5 (เชี่ยวชาญพิเศษ)
- Upper/Lower calculation base thresholds (ก.ค.ศ. Cut-off criteria)
- Round-up to nearest 10 Baht: `Math.ceil((base * percent) / 1000) * 10`
- Professional allowances (เงินวิทยฐานะ) + Special compensation (ค่าตอบแทนพิเศษ)
- Dual-theme toggle: Warm Editorial (Default) & Nordic Mint, persisted in `localStorage`
- Digital Payslip Card with real-time reactive updates and downloadable image card

## Global Constraints
- Single-page application runnable locally and directly deployable on Cloudflare Pages.
- No bulky third-party UI framework dependencies; bespoke design system avoiding generic "AI slop" patterns.
- Accessible keyboard navigation and mobile-first responsive layout.
- All financial calculations must strictly follow ก.ค.ศ. rounding and criteria.

## Review Focus
1. Current salary below, at, and above the cut-off boundary switches base correctly.
2. Percentage calculation rounding always rounds up to the nearest multiple of 10 Baht.
3. Theme switching preserves active values and re-renders smoothly without layout shift.
4. Exported canvas image renders crisp typography with Thai font support and correct layout.
5. Annual 2-cycle projection correctly cascades April increment into October base calculation.

---

### Task 1: Core Calculation Engine & Unit Tests (TDD)

**Files:**
- Create: `js/salary-rules.js`
- Test: `tests/salary-rules.test.js`

**Interfaces:**
- Produces:
  - `SALARY_CRITERIA`: Record of rank configs (cutOff, baseHigh, baseLow, allowance, special)
  - `getCalculationBase(rankKey: string, currentSalary: number) -> { base: number, isUpper: boolean }`
  - `calculateIncrement(baseSalary: number, percent: number) -> { rawIncrease: number, roundedIncrease: number }`
  - `calculateSalaryResult(params: { rankKey: string, currentSalary: number, percent: number }) -> SalaryResult`
  - `simulateAnnualIncrements(params: { rankKey: string, startingSalary: number, percentRound1: number, percentRound2: number }) -> AnnualSimulation`

- [x] **Step 1: Write the failing unit tests**

```javascript
// tests/salary-rules.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SALARY_CRITERIA,
  getCalculationBase,
  calculateIncrement,
  calculateSalaryResult,
  simulateAnnualIncrements
} from '../js/salary-rules.js';

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
  assert.equal(res.roundedIncrease, 1480);
  assert.equal(res.newSalaryBase, 43480);
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
  // Round 2 salary is 30910 >= 30210 -> base switches to baseHigh 35270!
  assert.equal(sim.round2.baseSalary, 35270);
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test tests/salary-rules.test.js`
Expected: FAIL (Cannot find module `../js/salary-rules.js`)

- [x] **Step 3: Implement `js/salary-rules.js`**

Implement complete criteria table, base resolver, rounding logic, and annual simulation.

- [x] **Step 4: Run test to verify it passes**

Run: `node --test tests/salary-rules.test.js`
Expected: PASS (All tests pass)

---

### Task 2: Design System & Styling with Dual-Theme Support

**Files:**
- Create: `css/style.css`

**Interfaces:**
- Theme Tokens:
  - `[data-theme="warm"]`: Warm Paper background (`#FBF9F5`), Dark Ink text (`#19212C`), Amber accent (`#D97706`), Warm Card (`#FFFFFF`), Soft Border (`#E7E1D8`)
  - `[data-theme="nordic"]`: Cool Slate background (`#F1F5F9`), Deep Charcoal text (`#0F172A`), Mint accent (`#059669` / `#10B981`), Crisp Card (`#FFFFFF`), Slate Border (`#CBD5E1`)
- Custom Components:
  - Interactive Segmented Rank Cards with subtle active elevation
  - Currency Input with tabular font and range indicator badge
  - Stepped percentage slider with quick-select pills
  - Digital Payslip Card with official guilloche/watermark subtle pattern, clear visual hierarchy
  - Smooth theme transitions on all themed elements

- [x] **Step 1: Write `css/style.css`**
Define clean CSS custom properties, responsive grid layout, typography imports (Prompt & Sarabun & JetBrains Mono), tactile button micro-animations, and printable/exportable styles.

- [x] **Step 2: Verify CSS validity and linting**
Ensure responsive design rules (`@media (max-width: 640px)`) and seamless transition rules exist.

---

### Task 3: Semantic & Accessible HTML Structure

**Files:**
- Create: `index.html`

**Interfaces:**
- Consumes: `css/style.css`, Google Fonts (`Prompt`, `Sarabun`)
- Produces DOM Structure:
  - Top Navigation: App Logo / Title, Subtitle, and Theme Toggle Button (`data-theme-btn`)
  - Section 1: Rank Selector Cards (`#rankGrid`)
  - Section 2: Current Salary input (`#currentSalary`) & Live Base Badge (`#baseBadge`)
  - Section 3: Percentage Increment Selector (Quick Chips + Slider + Precise Input `#percentInput`)
  - Section 4: Mode Switcher (รอบเดียว / จำลอง 2 รอบ เม.ย. & ต.ค.)
  - Section 5: Digital Payslip Card (`#payslipCard`)
    - Header: ตราจำลอง / รายละเอียดวิทยฐานะ
    - Itemized rows: ฐานคำนวณ, เงินเพิ่มรอบนี้, เงินเดือนใหม่, เงินวิทยฐานะ, ค่าตอบแทนพิเศษ
    - Grand Total Banner: ยอดรับสุทธิต่อเดือน (Large prominent typography)
  - Section 6: Action Toolbar:
    - ปุ่ม "บันทึกรูปภาพสลิป" (`#btnExportImage`)
    - ปุ่ม "คัดลอกข้อความสรุป" (`#btnCopySummary`)
  - Section 7: Info Modal / Criteria Reference Table (`#criteriaModal`)

- [x] **Step 1: Write `index.html` with full semantic elements and ARIA attributes**
- [x] **Step 2: Validate HTML structure**

---

### Task 4: Interactive UI Controller & Digital Payslip Generator

**Files:**
- Create: `js/app.js`

**Interfaces:**
- Consumes: `js/salary-rules.js`
- Produces:
  - Reactive input state binding (recalculates immediately on any input change)
  - Number ticker count-up animation for smooth visual feedback
  - Theme switcher controller with `localStorage` persistence
  - Standalone HTML5 Canvas renderer for the Digital Payslip image export (renders high-DPI retina PNG with crisp Thai text and background styling)
  - Clipboard copy utility with feedback toast

- [x] **Step 1: Implement `js/app.js`**
- [x] **Step 2: Verify interactions and calculation sync in browser environment**

---

### Task 5: Documentation & Cloudflare Pages + GitHub Setup Guide

**Files:**
- Create: `README.md`
- Create: `.gitignore`

**Interfaces:**
- Document project structure, how to run locally, how to push to GitHub, and how to connect to Cloudflare Pages with zero build config.

- [x] **Step 1: Write `README.md` with step-by-step GitHub & Cloudflare Pages instructions**
- [x] **Step 2: Write `.gitignore`**
