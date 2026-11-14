/**
 * app.js
 * Controller ระบบคำนวณเงินเดือนครู (Standalone - ทำงานได้ทันทีทั้งบน file:// และ Web Server)
 */

// ==========================================================================
// 1. Core Salary Rules & Criteria (ก.ค.ศ. ว 20/2561)
// ==========================================================================
const SALARY_CRITERIA = {
  k5: {
    key: 'k5',
    name: 'คศ. 5',
    title: 'ครูเชี่ยวชาญพิเศษ',
    minSalary: 29980,
    maxSalary: 76800,
    cutOff: 60840,
    baseHigh: 68560,
    baseLow: 60830,
    allowance: 15600,
    special: 15600,
    badge: 'เชี่ยวชาญพิเศษ'
  },
  k4: {
    key: 'k4',
    name: 'คศ. 4',
    title: 'ครูเชี่ยวชาญ',
    minSalary: 24400,
    maxSalary: 69040,
    cutOff: 50330,
    baseHigh: 59630,
    baseLow: 50320,
    allowance: 9900,
    special: 9900,
    badge: 'เชี่ยวชาญ'
  },
  k3: {
    key: 'k3',
    name: 'คศ. 3',
    title: 'ครูชำนาญการพิเศษ',
    minSalary: 19860,
    maxSalary: 58390,
    cutOff: 40280,
    baseHigh: 49330,
    baseLow: 37200,
    allowance: 5600,
    special: 5600,
    badge: 'ชำนาญการพิเศษ'
  },
  k2: {
    key: 'k2',
    name: 'คศ. 2',
    title: 'ครูชำนาญการ',
    minSalary: 16190,
    maxSalary: 41620,
    cutOff: 30210,
    baseHigh: 35270,
    baseLow: 30200,
    allowance: 3500,
    special: 0,
    badge: 'ชำนาญการ'
  },
  k1: {
    key: 'k1',
    name: 'คศ. 1',
    title: 'ครู คศ. 1',
    minSalary: 15440,
    maxSalary: 34310,
    cutOff: 24890,
    baseHigh: 29600,
    baseLow: 22780,
    allowance: 0,
    special: 0,
    badge: 'ครูผู้สอน'
  },
  assistant: {
    key: 'assistant',
    name: 'ครูผู้ช่วย',
    title: 'ครูผู้ช่วย',
    minSalary: 15050,
    maxSalary: 24750,
    cutOff: 19910,
    baseHigh: 22330,
    baseLow: 17480,
    allowance: 0,
    special: 0,
    badge: 'แรกเริ่ม'
  }
};

function checkSalaryBounds(rankKey, salary) {
  const criteria = SALARY_CRITERIA[rankKey];
  if (!criteria) return { isValid: true, warning: null };

  const num = typeof salary === 'number' ? salary : 0;
  const isBelowMin = num < criteria.minSalary;
  const isAboveMax = num > criteria.maxSalary;

  let warning = null;
  if (isBelowMin) {
    warning = `เงินเดือนต่ำกว่าขั้นต่ำของ ${criteria.name} (${criteria.minSalary.toLocaleString()} บ.)`;
  } else if (isAboveMax) {
    warning = `เงินเดือนสูงกว่าเพดานของ ${criteria.name} (${criteria.maxSalary.toLocaleString()} บ.)`;
  }

  return {
    isValid: !isBelowMin && !isAboveMax,
    minSalary: criteria.minSalary,
    maxSalary: criteria.maxSalary,
    warning
  };
}

function getCalculationBase(rankKey, currentSalary) {
  const criteria = SALARY_CRITERIA[rankKey];
  if (!criteria) return { base: 0, isUpper: false, cutOff: 0 };
  const isUpper = currentSalary >= criteria.cutOff;
  return {
    base: isUpper ? criteria.baseHigh : criteria.baseLow,
    isUpper,
    cutOff: criteria.cutOff
  };
}

function calculateIncrement(baseSalary, percent) {
  const safePercent = Math.max(0, Math.min(6.0, Number(percent) || 0));
  const rawIncrease = Math.round(((baseSalary * safePercent) / 100) * 100) / 100;
  const roundedIncrease = Math.ceil(rawIncrease / 10) * 10;
  return { safePercent, rawIncrease, roundedIncrease };
}

function calculateSalaryResult({ rankKey, currentSalary, percent }) {
  const criteria = SALARY_CRITERIA[rankKey];
  if (!criteria) return null;

  const bounds = checkSalaryBounds(rankKey, currentSalary);
  const { base: baseSalary, isUpper, cutOff } = getCalculationBase(rankKey, currentSalary);
  const { safePercent, rawIncrease, roundedIncrease } = calculateIncrement(baseSalary, percent);

  const rawNewSalary = currentSalary + roundedIncrease;
  const isCapped = rawNewSalary > criteria.maxSalary;
  const newSalaryBase = isCapped ? criteria.maxSalary : rawNewSalary;
  const spilloverCompensation = isCapped ? rawNewSalary - criteria.maxSalary : 0;

  const allowance = criteria.allowance;
  const special = criteria.special;
  const totalAllowance = allowance + special;
  const grandTotal = newSalaryBase + totalAllowance + spilloverCompensation;

  return {
    rankKey,
    rankName: criteria.name,
    rankTitle: criteria.title,
    currentSalary,
    percent: safePercent,
    baseSalary,
    isUpper,
    cutOff,
    minSalary: criteria.minSalary,
    maxSalary: criteria.maxSalary,
    boundsWarning: bounds.warning,
    rawIncrease,
    roundedIncrease,
    newSalaryBase,
    isCapped,
    spilloverCompensation,
    allowance,
    special,
    totalAllowance,
    grandTotal
  };
}

function simulateAnnualIncrements({ rankKey, startingSalary, percentRound1, percentRound2 }) {
  const round1 = calculateSalaryResult({
    rankKey,
    currentSalary: startingSalary,
    percent: percentRound1
  });
  const round2 = calculateSalaryResult({
    rankKey,
    currentSalary: round1.newSalaryBase,
    percent: percentRound2
  });
  return {
    rankKey,
    startingSalary,
    round1,
    round2,
    annualIncrease: round1.roundedIncrease + round2.roundedIncrease,
    finalSalaryBase: round2.newSalaryBase,
    finalGrandTotal: round2.grandTotal
  };
}

// ==========================================================================
// 2. Safe Storage Utility
// ==========================================================================
function safeGetStorage(key, fallback) {
  try {
    const val = localStorage.getItem(key);
    return val !== null ? val : fallback;
  } catch (e) {
    return fallback;
  }
}

function safeSetStorage(key, val) {
  try {
    localStorage.setItem(key, val);
  } catch (e) {}
}

// ==========================================================================
// 3. Application State & Formatters (ค่าเริ่มต้น: ครูชำนาญการ คศ.2 เงินเดือนเต็มขั้นล่าง 30,200 บ.)
// ==========================================================================
const savedTheme = safeGetStorage('teacher_salary_theme', 'warm');
const validTheme = ['warm', 'nordic'].includes(savedTheme) ? savedTheme : 'warm';

const state = {
  rankKey: 'k2',
  salary: 30200,
  percent: 3.0,
  annualMode: false,
  annualR1: 3.0,
  annualR2: 3.0,
  theme: validTheme,
  lastResult: null,
  activeShareBlob: null
};

const STORAGE_KEY_SAVED_STATE = 'teacher_salary_saved_state';

function loadSavedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SAVED_STATE);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data && typeof data === 'object') {
      if (data.rankKey && SALARY_CRITERIA[data.rankKey]) {
        state.rankKey = data.rankKey;
      }
      if (typeof data.salary === 'number' && data.salary > 0) {
        state.salary = data.salary;
      }
      if (typeof data.percent === 'number' && data.percent >= 0.5 && data.percent <= 6.0) {
        state.percent = data.percent;
      }
      if (typeof data.annualMode === 'boolean') {
        state.annualMode = data.annualMode;
      }
      if (typeof data.annualR1 === 'number' && data.annualR1 >= 0 && data.annualR1 <= 6.0) {
        state.annualR1 = data.annualR1;
      }
      if (typeof data.annualR2 === 'number' && data.annualR2 >= 0 && data.annualR2 <= 6.0) {
        state.annualR2 = data.annualR2;
      }
    }
  } catch (e) {}
}

function saveStateToStorage() {
  try {
    const payload = {
      rankKey: state.rankKey,
      salary: state.salary,
      percent: state.percent,
      annualMode: state.annualMode,
      annualR1: state.annualR1,
      annualR2: state.annualR2
    };
    localStorage.setItem(STORAGE_KEY_SAVED_STATE, JSON.stringify(payload));
  } catch (e) {}
}

const currencyFormatter = new Intl.NumberFormat('th-TH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const integerFormatter = new Intl.NumberFormat('th-TH', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});

function formatCurrency(num, decimals = 2) {
  if (isNaN(num)) return '0.00';
  return decimals === 0 ? integerFormatter.format(num) : currencyFormatter.format(num);
}

// Toast Timer reference
let toastTimer = null;
function showToast(msg) {
  const toast = document.getElementById('toastNotice');
  if (!toast) return;
  if (toastTimer) clearTimeout(toastTimer);
  toast.textContent = msg;
  toast.classList.add('show');
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2400);
}

// ==========================================================================
// 4. Number Ticker Animation
// ==========================================================================
const animatedValues = new Map();

function animateNumber(element, targetNum) {
  if (!element) return;
  const currentNum = animatedValues.get(element) ?? targetNum;
  if (Math.abs(currentNum - targetNum) < 1) {
    element.textContent = formatCurrency(targetNum);
    animatedValues.set(element, targetNum);
    return;
  }

  const duration = 200;
  const startTime = performance.now();

  function update(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    const val = currentNum + (targetNum - currentNum) * ease;
    element.textContent = formatCurrency(val);

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      element.textContent = formatCurrency(targetNum);
      animatedValues.set(element, targetNum);
    }
  }
  requestAnimationFrame(update);
}

// ==========================================================================
// 5. Theme Management
// ==========================================================================
function applyTheme(theme) {
  const valid = ['warm', 'nordic'].includes(theme) ? theme : 'warm';
  state.theme = valid;
  document.documentElement.setAttribute('data-theme', valid);
  safeSetStorage('teacher_salary_theme', valid);

  const meta = document.getElementById('metaThemeColor');
  if (meta) {
    meta.setAttribute('content', valid === 'nordic' ? '#0A1612' : '#F2F6F4');
  }

  const icon = document.getElementById('themeIcon');
  const label = document.getElementById('themeLabel');
  if (icon && label) {
    if (valid === 'warm') {
      icon.textContent = '🌿';
      label.textContent = 'ธาราหมอกเช้า';
    } else {
      icon.textContent = '🌲';
      label.textContent = 'สนเขาสนธยา';
    }
  }
}

function toggleTheme() {
  applyTheme(state.theme === 'warm' ? 'nordic' : 'warm');
}

// ==========================================================================
// 5.1 Custom Modern Rank Picker UI Sync
// ==========================================================================
function updateRankPickerUI(rankKey) {
  const criteria = SALARY_CRITERIA[rankKey];
  if (!criteria) return;

  const pill = document.getElementById('selectedRankPill');
  const title = document.getElementById('selectedRankTitle');
  const allowance = document.getElementById('selectedRankAllowance');

  if (pill) pill.textContent = criteria.name;
  if (title) {
    const rawTitle = criteria.title.replace(criteria.name, '').trim();
    title.textContent = rawTitle || criteria.title;
  }
  if (allowance) {
    const totalAllow = criteria.allowance + criteria.special;
    allowance.textContent = totalAllow > 0 ? `+${integerFormatter.format(totalAllow)} บ.` : 'ไม่มีเงินประจำตำแหน่ง';
  }

  const items = document.querySelectorAll('.rank-sheet-item');
  items.forEach(item => {
    if (item.dataset.rank === rankKey) {
      item.classList.add('active');
      item.setAttribute('aria-selected', 'true');
    } else {
      item.classList.remove('active');
      item.removeAttribute('aria-selected');
    }
  });

  updateParamsSummaryBadge();
}

function updateParamsSummaryBadge() {
  const badge = document.getElementById('paramsSummaryBadge');
  if (!badge) return;
  const criteria = SALARY_CRITERIA[state.rankKey];
  const rName = criteria ? criteria.name : '';
  badge.textContent = `${rName} • ${integerFormatter.format(state.salary)} บ. • ${state.percent.toFixed(1)}%`;
}

function toggleParams(force) {
  const body = document.getElementById('paramsCardBody');
  const toggleBtn = document.getElementById('btnToggleParams');
  const toggleHead = document.getElementById('paramsCardHead');
  const toggleText = document.getElementById('paramsToggleText');
  const toggleIcon = document.getElementById('paramsToggleIcon');
  const badge = document.getElementById('paramsSummaryBadge');
  const titleEl = document.getElementById('sectionParamsTitle');
  if (!body) return;

  const willCollapse = typeof force === 'boolean' ? !force : !body.classList.contains('collapsed');
  if (willCollapse) {
    body.classList.add('collapsed');
    if (toggleHead) toggleHead.setAttribute('aria-expanded', 'false');
    if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');
    if (toggleText) toggleText.textContent = 'ปรับข้อมูล';
    if (toggleIcon) toggleIcon.textContent = '▼';
    if (titleEl) titleEl.style.display = 'none';
    if (badge) {
      updateParamsSummaryBadge();
      badge.style.display = 'inline-flex';
    }
  } else {
    body.classList.remove('collapsed');
    if (toggleHead) toggleHead.setAttribute('aria-expanded', 'true');
    if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'true');
    if (toggleText) toggleText.textContent = 'ซ่อน';
    if (toggleIcon) toggleIcon.textContent = '▲';
    if (titleEl) titleEl.style.display = '';
    if (badge) badge.style.display = 'none';
  }
}

function toggleLedger(force) {
  const body = document.getElementById('ledgerCardBody');
  const toggleBtn = document.getElementById('btnToggleLedger');
  const toggleHead = document.getElementById('ledgerCardHead');
  const toggleText = document.getElementById('ledgerToggleText');
  const toggleIcon = document.getElementById('ledgerToggleIcon');
  if (!body) return;

  const isCurrentlyOpen = body.style.display !== 'none' && !body.classList.contains('collapsed');
  const willOpen = typeof force === 'boolean' ? force : !isCurrentlyOpen;

  if (willOpen) {
    body.classList.remove('collapsed');
    body.style.display = 'block';
    if (toggleHead) toggleHead.setAttribute('aria-expanded', 'true');
    if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'true');
    if (toggleText) toggleText.textContent = 'ซ่อน';
    if (toggleIcon) toggleIcon.textContent = '▲';
  } else {
    body.classList.add('collapsed');
    body.style.display = 'none';
    if (toggleHead) toggleHead.setAttribute('aria-expanded', 'false');
    if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');
    if (toggleText) toggleText.textContent = 'แสดง';
    if (toggleIcon) toggleIcon.textContent = '▼';
  }
}

// ==========================================================================
// 6. Reactive Calculation
// ==========================================================================
function recalculate() {
  const criteria = SALARY_CRITERIA[state.rankKey];
  if (!criteria) return;

  updateParamsSummaryBadge();

  // 1. ตรวจสอบเพดานเงินเดือน
  const bounds = checkSalaryBounds(state.rankKey, state.salary);
  const warnBanner = document.getElementById('salaryWarningBanner');
  const warnText = document.getElementById('salaryWarningText');
  if (warnBanner && warnText) {
    if (bounds.warning) {
      warnBanner.style.display = 'flex';
      warnText.textContent = bounds.warning;
    } else {
      warnBanner.style.display = 'none';
    }
  }

  const boundInfo = document.getElementById('rankBoundInfo');
  if (boundInfo) {
    boundInfo.textContent = `เพดาน: ${criteria.minSalary.toLocaleString()} – ${criteria.maxSalary.toLocaleString()} บ.`;
  }

  // 2. คำนวณผลลัพธ์
  const result = calculateSalaryResult({
    rankKey: state.rankKey,
    currentSalary: state.salary,
    percent: state.percent
  });
  state.lastResult = result;

  // 3. ปรับฐานและแท็กฐานบน/ฐานล่าง
  const BRACKET_ICONS = {
    // ฐานบน: ยอดเขาสูงสง่า (Mountain Summit Peak)
    upper: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="m8 3 4 8 5-5 5 15H2L8 3z"></path></svg>`,
    // ฐานล่าง: ลำธารสายน้ำธรรมชาติ (Natural River Wave)
    lower: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12c3-2 6-2 9 0s6 2 9 0"></path><path d="M2 17c3-2 6-2 9 0s6 2 9 0"></path></svg>`
  };

  const LEDGER_INC_ICONS = {
    upper: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>`,
    lower: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>`
  };

  const baseSalaryDisplay = document.getElementById('baseSalaryDisplay');
  const bracketBadge = document.getElementById('bracketBadge');
  const bracketText = document.getElementById('bracketText');
  const bracketIcon = document.getElementById('bracketIcon');
  const ledgerIncIcon = document.getElementById('ledgerIncIcon');

  if (baseSalaryDisplay) baseSalaryDisplay.textContent = formatCurrency(result.baseSalary, 0);
  if (bracketBadge && bracketText) {
    if (result.isUpper) {
      bracketBadge.className = 'hero-pill-bracket upper';
      bracketText.textContent = 'ฐานบน';
      if (bracketIcon) bracketIcon.innerHTML = BRACKET_ICONS.upper;
    } else {
      bracketBadge.className = 'hero-pill-bracket lower';
      bracketText.textContent = 'ฐานล่าง';
      if (bracketIcon) bracketIcon.innerHTML = BRACKET_ICONS.lower;
    }
  }
  if (ledgerIncIcon) {
    ledgerIncIcon.innerHTML = result.isUpper ? LEDGER_INC_ICONS.upper : LEDGER_INC_ICONS.lower;
  }

  // 4. อัปเดตข้อมูลบนสลิปและโครงสร้างรายรับ (อัปเดตพร้อมกันทั้งแผงสรุปและบัญชีแจกแจง)
  const setEl = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  setEl('slipRankTitle', `${result.rankName} ${result.rankTitle}`);
  setEl('slipBase', `${formatCurrency(result.baseSalary)} บ.`);
  setEl('slipPercent', state.percent.toFixed(2));

  const incFormatted = `+${formatCurrency(result.roundedIncrease)} บ.`;
  setEl('slipIncrement', incFormatted);
  setEl('heroIncrement', incFormatted);

  const newBaseFormatted = `${formatCurrency(result.newSalaryBase)} บ.`;
  setEl('slipNewBase', newBaseFormatted);
  setEl('heroNewBase', newBaseFormatted);

  const totalAllowFormatted = `${formatCurrency(result.totalAllowance)} บ.`;
  setEl('slipTotalAllowance', totalAllowFormatted);
  setEl('heroTotalAllowance', totalAllowFormatted);

  const slipCappedRow = document.getElementById('slipCappedRow');
  if (slipCappedRow) {
    if (result.isCapped) {
      slipCappedRow.style.display = 'flex';
      setEl('slipSpillover', `+${formatCurrency(result.spilloverCompensation)} บ.`);
    } else {
      slipCappedRow.style.display = 'none';
    }
  }

  setEl('slipAllowance', `${formatCurrency(result.allowance)} บ.`);
  setEl('slipSpecial', `${formatCurrency(result.special)} บ.`);

  const slipGrandTotal = document.getElementById('slipGrandTotal');
  if (slipGrandTotal) {
    animateNumber(slipGrandTotal, result.grandTotal);
  }

  // บันทึกสถานะล่าสุดลงเครื่องผู้ใช้ (LocalStorage)
  saveStateToStorage();

  // 5. จำลองผลทั้งปี 2 รอบ
  if (state.annualMode) {
    const annual = simulateAnnualIncrements({
      rankKey: state.rankKey,
      startingSalary: state.salary,
      percentRound1: state.annualR1,
      percentRound2: state.annualR2
    });
    setEl('slipAnnualR1', `${formatCurrency(annual.round1.newSalaryBase)} บ.`);
    setEl('slipAnnualR2', `${formatCurrency(annual.round2.newSalaryBase)} บ.`);
    setEl('slipAnnualTotalInc', `+${formatCurrency(annual.annualIncrease)} บ.`);
  }
}

// ==========================================================================
// 7. Event Listeners (ตรวจทานทุกปุ่มและเมนู 100%)
// ==========================================================================
function setupEventListeners() {
  // เปิด/ปิด แผงข้อมูลการประเมิน (Collapsible)
  const btnToggleParams = document.getElementById('btnToggleParams');
  const paramsCardHead = document.getElementById('paramsCardHead');

  if (btnToggleParams) {
    btnToggleParams.onclick = (e) => {
      e.stopPropagation();
      toggleParams();
    };
  }
  if (paramsCardHead) {
    paramsCardHead.onclick = () => {
      toggleParams();
    };
    paramsCardHead.onkeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleParams();
      }
    };
  }

  // เปิด/ปิด บัญชีแจกแจงเงินเดือน (Collapsible)
  const btnToggleLedger = document.getElementById('btnToggleLedger');
  const ledgerCardHead = document.getElementById('ledgerCardHead');

  if (btnToggleLedger) {
    btnToggleLedger.onclick = (e) => {
      e.stopPropagation();
      toggleLedger();
    };
  }
  if (ledgerCardHead) {
    ledgerCardHead.onclick = () => {
      toggleLedger();
    };
    ledgerCardHead.onkeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleLedger();
      }
    };
  }

  // สลับธีมสี
  const themeBtn = document.getElementById('themeToggleBtn');
  if (themeBtn) {
    themeBtn.onclick = toggleTheme;
  }

  // เปิด-ปิด ตารางเกณฑ์ ก.ค.ศ.
  const btnOpenCriteria = document.getElementById('btnOpenCriteria');
  const criteriaModal = document.getElementById('criteriaModal');
  const btnCloseCriteria = document.getElementById('btnCloseCriteria');

  if (btnOpenCriteria && criteriaModal) {
    btnOpenCriteria.onclick = () => {
      criteriaModal.style.display = 'flex';
    };
  }
  if (btnCloseCriteria && criteriaModal) {
    btnCloseCriteria.onclick = () => {
      criteriaModal.style.display = 'none';
    };
  }
  if (criteriaModal) {
    criteriaModal.onclick = (e) => {
      if (e.target === criteriaModal) {
        criteriaModal.style.display = 'none';
      }
    };
  }

  // ดรอปดาวน์ / บอร์ดเลือกวิทยฐานะแบบโมเดิร์น
  const rankPickerBtn = document.getElementById('rankPickerBtn');
  const rankSheetModal = document.getElementById('rankSheetModal');
  const btnCloseRankSheet = document.getElementById('btnCloseRankSheet');
  const rankSheetItems = document.querySelectorAll('.rank-sheet-item');
  const rankSelect = document.getElementById('rankSelect');

  if (rankPickerBtn && rankSheetModal) {
    rankPickerBtn.onclick = () => {
      rankSheetModal.style.display = 'flex';
    };
    rankPickerBtn.onkeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        rankSheetModal.style.display = 'flex';
      }
    };
  }

  if (btnCloseRankSheet && rankSheetModal) {
    btnCloseRankSheet.onclick = () => {
      rankSheetModal.style.display = 'none';
    };
  }

  if (rankSheetModal) {
    rankSheetModal.onclick = (e) => {
      if (e.target === rankSheetModal) {
        rankSheetModal.style.display = 'none';
      }
    };
  }

  rankSheetItems.forEach(item => {
    item.onclick = () => {
      const rankKey = item.dataset.rank;
      if (SALARY_CRITERIA[rankKey]) {
        state.rankKey = rankKey;
        if (rankSelect) rankSelect.value = rankKey;
        updateRankPickerUI(rankKey);
        if (rankSheetModal) rankSheetModal.style.display = 'none';
        recalculate();
      }
    };
  });

  if (rankSelect) {
    rankSelect.onchange = (e) => {
      state.rankKey = e.target.value;
      updateRankPickerUI(state.rankKey);
      recalculate();
    };
  }

  // ช่องกรอกเงินเดือน
  const salaryInput = document.getElementById('salaryInput');
  if (salaryInput) {
    salaryInput.oninput = (e) => {
      const rawVal = e.target.value.replace(/[^0-9]/g, '');
      const num = parseInt(rawVal, 10) || 0;
      state.salary = num;
      recalculate();
    };
    salaryInput.onblur = (e) => {
      e.target.value = formatCurrency(state.salary, 0);
    };
    salaryInput.onfocus = (e) => {
      if (state.salary > 0) {
        e.target.value = state.salary;
      }
    };
  }

  // ปุ่มลัดร้อยละ (2.5%, 3.0%, 3.5%)
  const chips = document.querySelectorAll('.chip-btn');
  const percentSlider = document.getElementById('percentSlider');
  const percentInput = document.getElementById('percentInput');
  const annualR1Input = document.getElementById('annualR1Input');
  const annualR2Input = document.getElementById('annualR2Input');

  function setPercentage(val) {
    const clamped = Math.max(0, Math.min(6.0, Math.round(val * 100) / 100));
    state.percent = clamped;
    state.annualR1 = clamped;

    if (percentSlider) percentSlider.value = clamped;
    if (percentInput) percentInput.value = clamped.toFixed(2);
    if (annualR1Input) annualR1Input.value = clamped.toFixed(2);

    chips.forEach(c => {
      const chipVal = parseFloat(c.dataset.val);
      if (Math.abs(chipVal - clamped) < 0.01) {
        c.classList.add('active');
      } else {
        c.classList.remove('active');
      }
    });

    recalculate();
  }

  chips.forEach(chip => {
    chip.onclick = () => {
      const val = parseFloat(chip.dataset.val);
      setPercentage(val);
    };
  });

  if (percentSlider) {
    percentSlider.oninput = (e) => {
      setPercentage(parseFloat(e.target.value));
    };
  }

  if (percentInput) {
    percentInput.oninput = (e) => {
      let val = parseFloat(e.target.value);
      if (isNaN(val)) val = 0;
      setPercentage(val);
    };
  }

  // โหมดรอบเดียว vs ทั้งปี (2 รอบ)
  const modeSingleBtn = document.getElementById('modeSingleBtn');
  const modeAnnualBtn = document.getElementById('modeAnnualBtn');
  const annualControls = document.getElementById('annualControls');
  const annualSummarySection = document.getElementById('annualSummarySection');

  if (modeSingleBtn && modeAnnualBtn) {
    modeSingleBtn.onclick = () => {
      state.annualMode = false;
      modeSingleBtn.classList.add('active');
      modeAnnualBtn.classList.remove('active');
      if (annualControls) annualControls.classList.remove('active');
      if (annualSummarySection) annualSummarySection.style.display = 'none';
      recalculate();
    };

    modeAnnualBtn.onclick = () => {
      state.annualMode = true;
      modeAnnualBtn.classList.add('active');
      modeSingleBtn.classList.remove('active');
      if (annualControls) annualControls.classList.add('active');
      if (annualSummarySection) annualSummarySection.style.display = 'block';
      recalculate();
    };
  }

  if (annualR1Input) {
    annualR1Input.oninput = (e) => {
      const val = Math.max(0, Math.min(6.0, parseFloat(e.target.value) || 0));
      state.annualR1 = val;
      state.percent = val;
      if (percentSlider) percentSlider.value = val;
      if (percentInput) percentInput.value = val.toFixed(2);
      recalculate();
    };
  }

  if (annualR2Input) {
    annualR2Input.oninput = (e) => {
      const val = Math.max(0, Math.min(6.0, parseFloat(e.target.value) || 0));
      state.annualR2 = val;
      recalculate();
    };
  }

  // ปุ่มคัดลอกสรุปข้อความ
  const btnCopySummary = document.getElementById('btnCopySummary');
  if (btnCopySummary) {
    btnCopySummary.onclick = copySummaryToClipboard;
  }

  // ปุ่มบันทึกรูปภาพสลิป
  const btnExportImage = document.getElementById('btnExportImage');
  if (btnExportImage) {
    btnExportImage.onclick = handleExportImage;
  }

  // หน้าต่างพรีวิวรูปภาพ (Image Modal)
  const imageModal = document.getElementById('imageModal');
  const btnCloseImageModal = document.getElementById('btnCloseImageModal');
  const btnModalDownloadDirect = document.getElementById('btnModalDownloadDirect');
  const btnModalShare = document.getElementById('btnModalShare');

  if (btnCloseImageModal && imageModal) {
    btnCloseImageModal.onclick = () => {
      imageModal.style.display = 'none';
    };
  }
  if (imageModal) {
    imageModal.onclick = (e) => {
      if (e.target === imageModal) {
        imageModal.style.display = 'none';
      }
    };
  }

  if (btnModalDownloadDirect) {
    btnModalDownloadDirect.onclick = () => {
      if (state.activeShareBlob) {
        downloadBlob(state.activeShareBlob);
      }
    };
  }

  if (btnModalShare) {
    btnModalShare.onclick = async () => {
      if (state.activeShareBlob && navigator.canShare) {
        try {
          const file = new File([state.activeShareBlob], 'teacher-salary-slip.png', { type: 'image/png' });
          await navigator.share({
            files: [file],
            title: 'สลิปประมาณการเงินเดือนครู ก.ค.ศ.'
          });
        } catch (err) {}
      }
    };
  }
}

// ==========================================================================
// 8. Clipboard Copy Logic
// ==========================================================================
function copySummaryToClipboard() {
  if (!state.lastResult) return;
  const res = state.lastResult;
  const dateStr = new Date().toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  let text = `🌿 ธาราคำนวณ • ประมาณการเงินเดือนครู (${res.rankName})\n`;
  text += `📅 ณ ${dateStr}\n`;
  text += `─────────────────────\n`;
  text += `• อันดับ / วิทยฐานะ: ${res.rankName} ${res.rankTitle}\n`;
  text += `• เงินเดือนเดิม: ${formatCurrency(res.currentSalary)} บ.\n`;
  text += `• ฐานคำนวณ: ${formatCurrency(res.baseSalary)} บ. (${res.isUpper ? 'ฐานบน' : 'ฐานล่าง'})\n`;
  text += `• ร้อยละที่เลื่อน: ${res.percent.toFixed(2)}%\n`;
  text += `• เงินที่ได้เลื่อน: +${formatCurrency(res.roundedIncrease)} บ.\n`;
  text += `• เงินเดือนใหม่: ${formatCurrency(res.newSalaryBase)} บ.\n`;
  if (res.isCapped) {
    text += `  (*ชนเพดาน ส่วนเกินเป็นค่าตอบแทนพิเศษ: +${formatCurrency(res.spilloverCompensation)} บ.)\n`;
  }
  if (res.totalAllowance > 0) {
    text += `• เงินวิทยฐานะ: ${formatCurrency(res.allowance)} บ.\n`;
    if (res.special > 0) {
      text += `• ค่าตอบแทนพิเศษ: ${formatCurrency(res.special)} บ.\n`;
    }
  }
  text += `─────────────────────\n`;
  text += `💰 รวมรับก่อนหัก: ${formatCurrency(res.grandTotal)} บ./เดือน`;

  if (state.annualMode) {
    const annual = simulateAnnualIncrements({
      rankKey: state.rankKey,
      startingSalary: state.salary,
      percentRound1: state.annualR1,
      percentRound2: state.annualR2
    });
    text += `\n\n📈 [จำลองทั้งปี 2 รอบ]\n`;
    text += `• เม.ย. (${state.annualR1}%): ${formatCurrency(annual.round1.newSalaryBase)} บ.\n`;
    text += `• ต.ค. (${state.annualR2}%): ${formatCurrency(annual.round2.newSalaryBase)} บ.\n`;
    text += `• รวมขึ้นทั้งปี: +${formatCurrency(annual.annualIncrease)} บ.`;
  }

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => {
      showToast('คัดลอกสรุปเรียบร้อยแล้ว');
    }).catch(() => {
      fallbackCopyText(text);
    });
  } else {
    fallbackCopyText(text);
  }
}

function fallbackCopyText(text) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand('copy');
    showToast('คัดลอกสรุปเรียบร้อยแล้ว');
  } catch (err) {
    showToast('คัดลอกไม่สำเร็จ กรุณาลองใหม่');
  }
  document.body.removeChild(textArea);
}

// ==========================================================================
// 9. High-Res Luxury Canvas Generator & Export (ฉบับหรูหรา อลังการ พรีเมียม)
// ==========================================================================
async function handleExportImage() {
  if (!state.lastResult) return;
  showToast('กำลังสร้างรูปสลิปพรีเมียม...');

  try {
    if (document.fonts) {
      await document.fonts.ready;
    }
  } catch (e) {}

  const res = state.lastResult;
  const canvas = document.getElementById('exportCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const scale = 2;
  const logicalWidth = 920;
  const logicalHeight = state.annualMode ? 1340 : 1160;

  canvas.width = logicalWidth * scale;
  canvas.height = logicalHeight * scale;
  ctx.scale(scale, scale);

  // 1. พื้นหลังอลังการ Deep Alpine Obsidian Gradient
  const bgGrad = ctx.createLinearGradient(0, 0, logicalWidth, logicalHeight);
  bgGrad.addColorStop(0, '#04100B');
  bgGrad.addColorStop(0.5, '#0A231A');
  bgGrad.addColorStop(1, '#05140E');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, logicalWidth, logicalHeight);

  // ละอองแสงมรกตและประกายทอง Ambient Orbs
  const g1 = ctx.createRadialGradient(logicalWidth - 80, 80, 20, logicalWidth - 80, 80, 420);
  g1.addColorStop(0, 'rgba(16, 185, 129, 0.18)');
  g1.addColorStop(1, 'rgba(16, 185, 129, 0)');
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, logicalWidth, logicalHeight);

  const g2 = ctx.createRadialGradient(80, logicalHeight - 100, 20, 80, logicalHeight - 100, 400);
  g2.addColorStop(0, 'rgba(245, 158, 11, 0.12)');
  g2.addColorStop(1, 'rgba(245, 158, 11, 0)');
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, logicalWidth, logicalHeight);

  // 2. ขอบการ์ดใหญ่สไตล์พรีเมียม ขอบทองคำแชมเปญ
  const pad = 36;
  const cardW = logicalWidth - (pad * 2);
  const cardH = logicalHeight - (pad * 2);
  const r = 26;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 12;
  roundRect(ctx, pad, pad, cardW, cardH, r);
  ctx.fillStyle = 'rgba(11, 27, 21, 0.96)';
  ctx.fill();
  ctx.restore();

  // เส้นขอบทองคำคู่สุดหรู
  ctx.save();
  roundRect(ctx, pad, pad, cardW, cardH, r);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.65)'; // Metallic Gold
  ctx.stroke();

  roundRect(ctx, pad + 6, pad + 6, cardW - 12, cardH - 12, r - 4);
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.28)'; // Emerald Hairline
  ctx.stroke();
  ctx.restore();

  // 3. หัวกระดาษสง่างาม (Grand Header)
  const headerH = 130;
  ctx.save();
  const headGrad = ctx.createLinearGradient(pad, pad, pad + cardW, pad + headerH);
  headGrad.addColorStop(0, '#0F382B');
  headGrad.addColorStop(1, '#071F17');
  roundRect(ctx, pad, pad, cardW, headerH, { tl: r, tr: r, br: 0, bl: 0 });
  ctx.fillStyle = headGrad;
  ctx.fill();

  // เส้นคั่นทองใต้หัวกระดาษ
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(pad, pad + headerH);
  ctx.lineTo(pad + cardW, pad + headerH);
  ctx.stroke();

  // ตราสัญลักษณ์ภูเขาและสายน้ำ (Alpine Emblem)
  const embX = pad + 32;
  const embY = pad + 38;
  ctx.fillStyle = 'rgba(245, 158, 11, 0.9)'; // Golden peak
  ctx.beginPath();
  ctx.moveTo(embX + 22, embY + 8);
  ctx.lineTo(embX + 38, embY + 38);
  ctx.lineTo(embX + 6, embY + 38);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#10B981'; // Emerald peak
  ctx.beginPath();
  ctx.moveTo(embX + 34, embY + 16);
  ctx.lineTo(embX + 46, embY + 38);
  ctx.lineTo(embX + 22, embY + 38);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#38BDF8'; // River wave
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(embX + 6, embY + 44);
  ctx.bezierCurveTo(embX + 18, embY + 40, embX + 28, embY + 48, embX + 46, embY + 44);
  ctx.stroke();

  // ข้อความหัวกระดาษ
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 34px "Prompt", -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('ธาราคำนวณ', pad + 96, pad + 54);

  ctx.fillStyle = '#A7F3D0';
  ctx.font = '18px "Sarabun", -apple-system, sans-serif';
  ctx.fillText('สรุปประมาณการเงินเดือนข้าราชการครูและบุคลากรทางการศึกษา', pad + 96, pad + 90);

  // ป้ายเกณฑ์มาตรฐาน ก.ค.ศ.
  roundRect(ctx, pad + cardW - 200, pad + 44, 168, 42, 21);
  ctx.fillStyle = 'rgba(245, 158, 11, 0.16)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.65)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#FDE68A';
  ctx.font = 'bold 15px "Prompt", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ก.ค.ศ. ว 20 • ว 8', pad + cardW - 116, pad + 71);
  ctx.restore();

  // 4. The Crown Jewel: Hero Showcase Card (กล่องสรุปรายรับยักษ์สุดหรู)
  let y = pad + headerH + 28;
  const heroX = pad + 28;
  const heroW = cardW - 56;
  const heroH = 270;

  ctx.save();
  const heroGrad = ctx.createLinearGradient(heroX, y, heroX, y + heroH);
  heroGrad.addColorStop(0, '#133D2F');
  heroGrad.addColorStop(1, '#0B261D');
  roundRect(ctx, heroX, y, heroW, heroH, 22);
  ctx.fillStyle = heroGrad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(52, 211, 153, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // แถบวิทยฐานะ & ฐานบน/ล่าง (ภายใน Hero)
  ctx.textAlign = 'left';
  ctx.font = 'bold 22px "Prompt", sans-serif';
  const rankText = `${res.rankName} ${res.rankTitle}`;
  const rankW = ctx.measureText(rankText).width;

  roundRect(ctx, heroX + 24, y + 22, rankW + 28, 38, 19);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(rankText, heroX + 38, y + 49);

  // ข้อความ ฐานบน / ฐานล่าง แบบเรียบหรูไร้กรอบ
  const tierIcon = res.isUpper ? '⛰️' : '🌊';
  const tierText = res.isUpper ? 'ฐานบน' : 'ฐานล่าง';
  ctx.fillStyle = res.isUpper ? '#6EE7B7' : '#93C5FD';
  ctx.font = 'bold 20px "Prompt", sans-serif';
  ctx.fillText(`${tierIcon} ${tierText}`, heroX + rankW + 68, y + 49);

  // ป้ายคำอธิบาย
  ctx.fillStyle = '#94A3B8';
  ctx.font = '18px "Sarabun", sans-serif';
  ctx.fillText('ประมาณการรายรับรวมต่อเดือน (ก่อนหักภาษีและ กบข.)', heroX + 26, y + 96);

  // ตัวเลขยอดรวมรายเดือนขนาดมหึมา (HUGE 58px BOLD)
  ctx.font = '600 36px "Prompt", sans-serif';
  ctx.fillStyle = '#6EE7B7';
  ctx.fillText('฿', heroX + 26, y + 154);

  ctx.font = 'bold 56px "Prompt", "SF Mono", monospace';
  ctx.fillStyle = '#34D399';
  ctx.fillText(formatCurrency(res.grandTotal), heroX + 64, y + 156);

  const numW = ctx.measureText(formatCurrency(res.grandTotal)).width;
  ctx.font = '19px "Sarabun", sans-serif';
  ctx.fillStyle = '#CBD5E1';
  ctx.fillText('บาท / เดือน', heroX + 76 + numW, y + 152);

  // แถบไฮไลต์เงินเลื่อนขั้น (Emerald Highlight Ribbon)
  const ribbonY = y + 196;
  const ribbonH = 48;
  roundRect(ctx, heroX + 24, ribbonY, heroW - 48, ribbonH, 12);
  const ribGrad = ctx.createLinearGradient(heroX + 24, ribbonY, heroX + heroW - 24, ribbonY);
  ribGrad.addColorStop(0, '#059669');
  ribGrad.addColorStop(1, '#047857');
  ctx.fillStyle = ribGrad;
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 21px "Prompt", sans-serif';
  ctx.fillText(`▲ เงินเลื่อนขั้นรอบนี้ (+${state.percent.toFixed(2)}%):`, heroX + 44, ribbonY + 32);

  ctx.textAlign = 'right';
  ctx.font = 'bold 24px "SF Mono", monospace';
  ctx.fillText(`+${formatCurrency(res.roundedIncrease)} บาท`, heroX + heroW - 44, ribbonY + 33);
  ctx.restore();

  // 5. บัญชีแจกแจงเงินเดือน (Detailed Breakdown Cards)
  y += heroH + 28;
  const colL = pad + 32;
  const colR = pad + cardW - 32;

  ctx.fillStyle = '#F8FAFC';
  ctx.font = 'bold 24px "Prompt", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('🌿 บัญชีแจกแจงเงินเดือน', colL, y);
  y += 20;

  function drawLuxuryRow(label, value, isBold = false, isAccent = false) {
    y += 10;
    // พื้นหลังแถวสลับแสง
    if (isAccent) {
      roundRect(ctx, colL - 8, y - 24, cardW - 48, 48, 10);
      ctx.fillStyle = 'rgba(16, 185, 129, 0.16)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.textAlign = 'left';
    ctx.font = isBold ? 'bold 21px "Prompt", sans-serif' : '20px "Sarabun", sans-serif';
    ctx.fillStyle = isAccent ? '#6EE7B7' : (isBold ? '#FFFFFF' : '#CBD5E1');
    ctx.fillText(label, colL + (isAccent ? 12 : 0), y + 7);

    ctx.textAlign = 'right';
    ctx.font = isBold ? 'bold 24px "SF Mono", monospace' : '600 22px "SF Mono", monospace';
    ctx.fillStyle = isAccent ? '#FDE68A' : (isBold ? '#FFFFFF' : '#F1F5F9');
    ctx.fillText(value, colR - (isAccent ? 12 : 0), y + 7);
    y += 42;
  }

  drawLuxuryRow('ฐานคำนวณที่ใช้ในการประเมิน:', `${formatCurrency(res.baseSalary)} บ. (${res.isUpper ? 'ฐานบน' : 'ฐานล่าง'})`);
  drawLuxuryRow('เงินเดือนใหม่ (หลังเลื่อนขั้น):', `${formatCurrency(res.newSalaryBase)} บาท`, true);
  drawLuxuryRow('เงินวิทยฐานะ (เงินประจำตำแหน่ง):', `${formatCurrency(res.allowance)} บาท`);
  drawLuxuryRow('ค่าตอบแทนพิเศษ (คศ.3–คศ.5):', `${formatCurrency(res.special)} บาท`);
  drawLuxuryRow('รวมเงินวิทยฐานะและค่าตอบแทน:', `${formatCurrency(res.totalAllowance)} บาท`, true, true);

  if (res.isCapped) {
    drawLuxuryRow('⚠️ ส่วนเกินชนเพดานเงินเดือน (จ่ายชดเชย):', `+${formatCurrency(res.spilloverCompensation)} บาท`, true);
  }

  // 6. กรณีโหมด 2 รอบทั้งปี (Annual 2-Round Projection)
  if (state.annualMode) {
    y += 10;
    const annual = simulateAnnualIncrements({
      rankKey: state.rankKey,
      startingSalary: state.salary,
      percentRound1: state.annualR1,
      percentRound2: state.annualR2
    });

    const annW = cardW - 56;
    const annH = 126;
    roundRect(ctx, colL - 8, y, annW + 16, annH, 14);
    ctx.fillStyle = 'rgba(15, 38, 30, 0.85)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#38BDF8';
    ctx.font = 'bold 20px "Prompt", sans-serif';
    ctx.fillText('🌊 ผลการเลื่อนขั้นทั้งปีงบประมาณ (2 รอบต่อเนื่อง):', colL + 12, y + 32);

    ctx.fillStyle = '#CBD5E1';
    ctx.font = '18px "Sarabun", sans-serif';
    ctx.fillText(`• เม.ย. (${state.annualR1.toFixed(1)}%): +${annual.round1.roundedIncrease.toLocaleString()} บ.  ➔  เงินเดือน ${formatCurrency(annual.round1.newSalaryBase)} บ.`, colL + 12, y + 64);
    ctx.fillText(`• ต.ค. (${state.annualR2.toFixed(1)}%): +${annual.round2.roundedIncrease.toLocaleString()} บ.  ➔  เงินเดือน ${formatCurrency(annual.round2.newSalaryBase)} บ.`, colL + 12, y + 96);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#34D399';
    ctx.font = 'bold 21px "SF Mono", monospace';
    ctx.fillText(`รวมทั้งปี +${formatCurrency(annual.annualIncrease)} บ.`, colR - 12, y + 64);

    y += annH + 16;
  }

  // 7. ตราประทับและข้อความทางการด้านล่าง (Official Hallmark & Security Footer)
  y += 24;
  const today = new Date().toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  ctx.strokeStyle = 'rgba(212, 175, 55, 0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(colL + 40, y);
  ctx.lineTo(colR - 40, y);
  ctx.stroke();

  y += 28;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#94A3B8';
  ctx.font = '16px "Sarabun", sans-serif';
  ctx.fillText(`ประมาณการ ณ วันที่ ${today} • อ้างอิงตามหนังสือ ก.ค.ศ. ที่ ศธ 0206.7/ว 20 และ ว 8/2567`, logicalWidth / 2, y);

  y += 22;
  ctx.fillStyle = '#64748B';
  ctx.font = '14px "Sarabun", sans-serif';
  ctx.fillText('สูตรคำนวณ: ฐานคำนวณ × ร้อยละ ÷ 100 แล้วปัดเศษขึ้นเป็นจำนวนเต็มสิบบาทตามระเบียบทางราชการ', logicalWidth / 2, y);

  // ส่งออกรูปภาพความละเอียดสูง
  canvas.toBlob((blob) => {
    if (!blob) return;
    state.activeShareBlob = blob;

    const url = URL.createObjectURL(blob);
    const modalImg = document.getElementById('modalPreviewImg');
    const imageModal = document.getElementById('imageModal');
    if (modalImg) modalImg.src = url;

    // ถ้าเป็นมือถือและรองรับ Web Share ให้แชร์ตรงทันที
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const file = new File([blob], 'teacher-salary-slip.png', { type: 'image/png' });

    if (isMobile && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({
        files: [file],
        title: 'สลิปประมาณการเงินเดือนครู ก.ค.ศ. (ธาราคำนวณ)'
      }).then(() => {
        showToast('แชร์รูปสลิปเรียบร้อยแล้ว');
      }).catch((err) => {
        if (err.name !== 'AbortError' && imageModal) {
          imageModal.style.display = 'flex';
        }
      });
      return;
    }

    // บน Desktop: ทำการดาวน์โหลดไฟล์ตรงทันที
    downloadBlob(blob);
    showToast('ดาวน์โหลดรูปสลิปเรียบร้อยแล้ว');

    // ถ้าเป็น In-App browser หรือเปิดบนโมบายล์ ให้แสดงหน้าต่างพรีวิว
    if (isMobile && imageModal) {
      imageModal.style.display = 'flex';
    }
  }, 'image/png');
}

function downloadBlob(blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.download = 'teacher-salary-slip.png';
  a.href = url;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function roundRect(ctx, x, y, width, height, radius) {
  let r = radius;
  if (typeof r === 'number') {
    r = { tl: r, tr: r, br: r, bl: r };
  }
  ctx.beginPath();
  ctx.moveTo(x + r.tl, y);
  ctx.lineTo(x + width - r.tr, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r.tr);
  ctx.lineTo(x + width, y + height - r.br);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r.br, y + height);
  ctx.lineTo(x + r.bl, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r.bl);
  ctx.lineTo(x, y + r.tl);
  ctx.quadraticCurveTo(x, y, x + r.tl, y);
  ctx.closePath();
}

let deferredPrompt = null;
function setupPWA() {
  const btnInstall = document.getElementById('btnInstallApp');

  // ตรวจจับว่าอยู่ในโหมด Standalone หรือเคยติดตั้งแล้วหรือไม่
  let isInstalled = false;
  try {
    isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                  window.navigator.standalone === true ||
                  localStorage.getItem('pwa_app_installed') === 'true';
  } catch (e) {}

  if (isInstalled && btnInstall) {
    btnInstall.style.display = 'none';
  }

  // 1. ลงทะเบียน Service Worker เมื่อรันบน HTTPS หรือ Localhost
  if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then((reg) => {
        reg.update().catch(() => {});
      }).catch(() => {});
    });
  }

  // 2. ดักจับ beforeinstallprompt เพื่อเชื่อมปุ่มติดตั้งแอป
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (btnInstall && !isInstalled) {
      btnInstall.style.display = 'inline-flex';
    }
  });

  // 3. เมื่อผู้ใช้ติดตั้งแอปเสร็จสิ้น ให้ซ่อนปุ่มทันที
  window.addEventListener('appinstalled', () => {
    try {
      localStorage.setItem('pwa_app_installed', 'true');
    } catch (e) {}
    if (btnInstall) {
      btnInstall.style.display = 'none';
    }
    showToast('ติดตั้งแอปธาราคำนวณเรียบร้อยแล้ว');
  });

  if (btnInstall) {
    btnInstall.onclick = async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          try {
            localStorage.setItem('pwa_app_installed', 'true');
          } catch (e) {}
          btnInstall.style.display = 'none';
          showToast('ติดตั้งแอปธาราคำนวณเรียบร้อยแล้ว');
        }
        deferredPrompt = null;
      } else {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        if (isIOS) {
          showToast('บน iPhone/iPad: แตะปุ่มแชร์ ⎋ แล้วเลือก "เพิ่มไปยังหน้าจอโฮม" เพื่อเปิดแอปเต็มจอ');
        } else {
          showToast('บน Android Chrome: แตะเมนู ⋮ (3 จุด) ที่มุมบนขวา แล้วเลือก "ติดตั้งแอป" หรือ "เพิ่มลงในหน้าจอหลัก"');
        }
      }
    };
  }
}

// ==========================================================================
// 10. Initialization
// ==========================================================================
function init() {
  // 1. โหลดข้อมูลเดิมล่าสุดที่เคยบันทึกไว้ในเครื่อง
  loadSavedState();

  // 2. ตั้งค่าธีม
  applyTheme(state.theme);

  // 3. ซิงค์ค่า UI ให้ตรงกับ state ที่กู้คืนมา
  const salaryInput = document.getElementById('salaryInput');
  if (salaryInput) {
    salaryInput.value = formatCurrency(state.salary, 0);
  }

  const percentSlider = document.getElementById('percentSlider');
  if (percentSlider) {
    percentSlider.value = state.percent;
  }

  const percentInput = document.getElementById('percentInput');
  if (percentInput) {
    percentInput.value = state.percent.toFixed(2);
  }

  const chips = document.querySelectorAll('.chip-btn');
  chips.forEach(chip => {
    const val = parseFloat(chip.dataset.val);
    if (Math.abs(val - state.percent) < 0.001) {
      chip.classList.add('active');
    } else {
      chip.classList.remove('active');
    }
  });

  const modeSingleBtn = document.getElementById('modeSingleBtn');
  const modeAnnualBtn = document.getElementById('modeAnnualBtn');
  const annualControls = document.getElementById('annualControls');
  const annualSummarySection = document.getElementById('annualSummarySection');
  if (modeSingleBtn && modeAnnualBtn) {
    if (state.annualMode) {
      modeAnnualBtn.classList.add('active');
      modeSingleBtn.classList.remove('active');
      if (annualControls) annualControls.classList.add('active');
      if (annualSummarySection) annualSummarySection.style.display = 'block';
    } else {
      modeSingleBtn.classList.add('active');
      modeAnnualBtn.classList.remove('active');
      if (annualControls) annualControls.classList.remove('active');
      if (annualSummarySection) annualSummarySection.style.display = 'none';
    }
  }

  const rankSelect = document.getElementById('rankSelect');
  if (rankSelect) {
    rankSelect.value = state.rankKey;
  }

  updateRankPickerUI(state.rankKey);
  setupEventListeners();
  setupPWA();
  recalculate();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
