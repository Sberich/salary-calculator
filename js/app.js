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
      if (bracketIcon) bracketIcon.textContent = '⛰️';
    } else {
      bracketBadge.className = 'hero-pill-bracket lower';
      bracketText.textContent = 'ฐานล่าง';
      if (bracketIcon) bracketIcon.textContent = '🌱';
    }
  }
  if (ledgerIncIcon) {
    ledgerIncIcon.textContent = result.isUpper ? '⛰️' : '🌱';
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
// 9. High-Res Canvas Generator & Export
// ==========================================================================
async function handleExportImage() {
  if (!state.lastResult) return;
  showToast('กำลังสร้างรูปสลิป...');

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
  const logicalWidth = 800;
  const logicalHeight = state.annualMode ? 980 : 840;

  canvas.width = logicalWidth * scale;
  canvas.height = logicalHeight * scale;
  ctx.scale(scale, scale);

  const isWarm = state.theme === 'warm';
  const bgColor = isWarm ? '#F2F6F4' : '#0A1612';
  const cardColor = isWarm ? '#FFFFFF' : '#12231D';
  const headerBg = isWarm ? '#064E3B' : '#0D261E';
  const primaryText = isWarm ? '#122B22' : '#F0F7F4';
  const secondaryText = isWarm ? '#3B584C' : '#A3C5B7';
  const accentColor = isWarm ? '#059669' : '#10B981';
  const totalNumColor = isWarm ? '#6EE7B7' : '#34D399';

  // 1. พื้นหลัง
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, logicalWidth, logicalHeight);

  // 2. การ์ดสีขาว/เข้ม
  const pad = 32;
  const cardW = logicalWidth - (pad * 2);
  const cardH = logicalHeight - (pad * 2);
  const r = 20;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 6;
  roundRect(ctx, pad, pad, cardW, cardH, r);
  ctx.fillStyle = cardColor;
  ctx.fill();
  ctx.restore();

  // 3. หัวการ์ดธรรมชาติ
  ctx.save();
  roundRect(ctx, pad, pad, cardW, 110, { tl: r, tr: r, br: 0, bl: 0 });
  ctx.fillStyle = headerBg;
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 25px "Prompt", sans-serif';
  ctx.fillText(`ธาราคำนวณ • ${res.rankName} ${res.rankTitle}`, pad + 28, pad + 48);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.font = '15px "Sarabun", sans-serif';
  ctx.fillText(`สรุปประมาณการเงินเดือนครู • เกณฑ์ ก.ค.ศ. (ว 20/2561)`, pad + 28, pad + 80);

  // ตรา ก.ค.ศ.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
  roundRect(ctx, pad + cardW - 110, pad + 35, 84, 32, 16);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 15px "Prompt", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ก.ค.ศ.', pad + cardW - 68, pad + 56);
  ctx.restore();

  // 4. รายการข้อมูล
  let y = pad + 150;
  const colL = pad + 28;
  const colR = pad + cardW - 28;

  function drawRow(label, value, isHighlight = false) {
    if (isHighlight) {
      ctx.fillStyle = isWarm ? '#D1FAE5' : 'rgba(16, 185, 129, 0.18)';
      roundRect(ctx, colL - 6, y - 24, cardW - 44, 40, 8);
      ctx.fill();

      ctx.fillStyle = accentColor;
      ctx.font = 'bold 18px "Prompt", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(label, colL, y + 3);

      ctx.font = 'bold 20px "SF Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(value, colR, y + 3);
    } else {
      ctx.fillStyle = secondaryText;
      ctx.font = '18px "Sarabun", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(label, colL, y);

      ctx.fillStyle = primaryText;
      ctx.font = '600 18px "SF Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(value, colR, y);
    }
    y += 44;
  }

  drawRow('ฐานคำนวณ:', `${formatCurrency(res.baseSalary)} บ. (${res.isUpper ? 'ฐานบน' : 'ฐานล่าง'})`);
  drawRow(`▲ เงินเลื่อนขั้น (${res.percent.toFixed(2)}%):`, `+${formatCurrency(res.roundedIncrease)} บ.`, true);

  // เส้นแบ่งสายน้ำ
  y += 4;
  ctx.strokeStyle = isWarm ? '#E1EBE5' : '#1F3D32';
  ctx.beginPath();
  ctx.moveTo(colL, y);
  ctx.lineTo(colR, y);
  ctx.stroke();
  y += 30;

  drawRow('เงินเดือนเนื้อแท้ใหม่:', `${formatCurrency(res.newSalaryBase)} บ.`);
  drawRow('เงินวิทยฐานะ:', `${formatCurrency(res.allowance)} บ.`);
  drawRow('ค่าตอบแทนพิเศษ:', `${formatCurrency(res.special)} บ.`);
  drawRow('รวมเงินประจำตำแหน่ง:', `${formatCurrency(res.totalAllowance)} บ.`);

  y += 12;

  // 5. กล่องยอดรวม
  const bannerH = 110;
  ctx.save();
  roundRect(ctx, colL, y, cardW - 56, bannerH, 14);
  ctx.fillStyle = isWarm ? '#064E3B' : '#0D261E';
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.font = '15px "Prompt", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('รวมรับรายเดือนโดยประมาณ', logicalWidth / 2, y + 32);

  ctx.fillStyle = totalNumColor;
  ctx.font = 'bold 36px "Prompt", monospace';
  ctx.fillText(`${formatCurrency(res.grandTotal)}`, logicalWidth / 2, y + 72);
  ctx.font = '13px "Sarabun", sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.fillText('บาท / เดือน', logicalWidth / 2, y + 94);
  ctx.restore();

  y += bannerH + 24;

  // 6. ส่วนข้อมูล 2 รอบถ้าเปิดโหมดไว้
  if (state.annualMode) {
    const annual = simulateAnnualIncrements({
      rankKey: state.rankKey,
      startingSalary: state.salary,
      percentRound1: state.annualR1,
      percentRound2: state.annualR2
    });

    ctx.fillStyle = isWarm ? '#F6F1EA' : '#E2E8F0';
    roundRect(ctx, colL, y, cardW - 56, 100, 10);
    ctx.fill();

    ctx.fillStyle = primaryText;
    ctx.font = 'bold 15px "Prompt", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('📈 ผลจำลองทั้งปี 2 รอบ:', colL + 14, y + 24);

    ctx.fillStyle = secondaryText;
    ctx.font = '15px "Sarabun", sans-serif';
    ctx.fillText(`• เม.ย. (${state.annualR1}%): ${formatCurrency(annual.round1.newSalaryBase)} บ.`, colL + 14, y + 50);
    ctx.fillText(`• ต.ค. (${state.annualR2}%): ${formatCurrency(annual.round2.newSalaryBase)} บ.`, colL + 14, y + 76);

    ctx.fillStyle = accentColor;
    ctx.font = 'bold 16px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`รวมทั้งปี +${formatCurrency(annual.annualIncrease)} บ.`, colR - 14, y + 62);

    y += 120;
  }

  // 7. ท้ายสลิป
  const today = new Date().toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  ctx.fillStyle = '#718096';
  ctx.font = '13px "Sarabun", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`ประมาณการ ณ วันที่ ${today} • อ้างอิงเกณฑ์ ก.ค.ศ. (ว 20/2561)`, logicalWidth / 2, y);

  // ส่งออกรูป
  canvas.toBlob((blob) => {
    if (!blob) return;
    state.activeShareBlob = blob;

    // อัปเดตพรีวิวใน Modal เสมอ
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
        title: 'สลิปประมาณการเงินเดือนครู ก.ค.ศ.'
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

    // ถ้าเป็น In-App browser หรืออุปกรณ์ที่อาจไม่เริ่มดาวน์โหลด ให้เปิด Modal ไว้สำรอง
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
  // 1. ลงทะเบียน Service Worker เมื่อรันบน HTTPS หรือ Localhost
  if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }

  // 2. ดักจับ beforeinstallprompt เพื่อเชื่อมปุ่มติดตั้งแอป
  const btnInstall = document.getElementById('btnInstallApp');
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
  });

  if (btnInstall) {
    btnInstall.onclick = async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
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
