/**
 * app.js
 * Controller สำหรับจัดการ State, Event Listeners, Animation และการ Export ภาพ
 */

import {
  SALARY_CRITERIA,
  calculateSalaryResult,
  simulateAnnualIncrements
} from './salary-rules.js';

// ==========================================================================
// Application State
// ==========================================================================
const state = {
  rankKey: 'k3',
  salary: 42000,
  percent: 3.0,
  annualMode: false,
  annualR1: 3.0,
  annualR2: 3.0,
  theme: localStorage.getItem('teacher_salary_theme') || 'warm',
  lastResult: null
};

// ==========================================================================
// DOM Elements
// ==========================================================================
const DOM = {
  html: document.documentElement,
  themeBtn: document.getElementById('themeToggleBtn'),
  themeIcon: document.getElementById('themeIcon'),
  themeLabel: document.getElementById('themeLabel'),
  
  rankCards: document.querySelectorAll('.rank-card'),
  salaryInput: document.getElementById('salaryInput'),
  baseSalaryDisplay: document.getElementById('baseSalaryDisplay'),
  bracketBadge: document.getElementById('bracketBadge'),
  bracketText: document.getElementById('bracketText'),

  chips: document.querySelectorAll('.chip-btn'),
  percentSlider: document.getElementById('percentSlider'),
  percentInput: document.getElementById('percentInput'),

  modeSingleBtn: document.getElementById('modeSingleBtn'),
  modeAnnualBtn: document.getElementById('modeAnnualBtn'),
  annualControls: document.getElementById('annualControls'),
  annualR1Input: document.getElementById('annualR1Input'),
  annualR2Input: document.getElementById('annualR2Input'),
  annualSummarySection: document.getElementById('annualSummarySection'),

  // Payslip Displays
  slipRankTitle: document.getElementById('slipRankTitle'),
  slipBase: document.getElementById('slipBase'),
  slipPercent: document.getElementById('slipPercent'),
  slipIncrement: document.getElementById('slipIncrement'),
  slipNewBase: document.getElementById('slipNewBase'),
  slipAllowance: document.getElementById('slipAllowance'),
  slipSpecial: document.getElementById('slipSpecial'),
  slipTotalAllowance: document.getElementById('slipTotalAllowance'),
  slipGrandTotal: document.getElementById('slipGrandTotal'),

  slipAnnualR1: document.getElementById('slipAnnualR1'),
  slipAnnualR2: document.getElementById('slipAnnualR2'),
  slipAnnualTotalInc: document.getElementById('slipAnnualTotalInc'),

  // Buttons & Toast
  btnExportImage: document.getElementById('btnExportImage'),
  btnCopySummary: document.getElementById('btnCopySummary'),
  toastNotice: document.getElementById('toastNotice'),
  exportCanvas: document.getElementById('exportCanvas')
};

// ==========================================================================
// Formatters & Utility Functions
// ==========================================================================
function formatCurrency(num, decimals = 2) {
  if (isNaN(num)) return '0.00';
  return num.toLocaleString('th-TH', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

function parseCurrency(str) {
  if (!str) return 0;
  const cleaned = String(str).replace(/[^0-9.]/g, '');
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

function showToast(msg) {
  DOM.toastNotice.textContent = msg;
  DOM.toastNotice.classList.add('show');
  setTimeout(() => {
    DOM.toastNotice.classList.remove('show');
  }, 2400);
}

// ==========================================================================
// Theme Management
// ==========================================================================
function applyTheme(theme) {
  state.theme = theme;
  DOM.html.setAttribute('data-theme', theme);
  localStorage.setItem('teacher_salary_theme', theme);

  if (theme === 'warm') {
    DOM.themeIcon.textContent = '☀️';
    DOM.themeLabel.textContent = 'ธีม: Warm Editorial';
  } else {
    DOM.themeIcon.textContent = '🌿';
    DOM.themeLabel.textContent = 'ธีม: Nordic Mint';
  }
}

function toggleTheme() {
  const nextTheme = state.theme === 'warm' ? 'nordic' : 'warm';
  applyTheme(nextTheme);
}

// ==========================================================================
// Reactive Calculation & UI Update
// ==========================================================================
function recalculate() {
  const result = calculateSalaryResult({
    rankKey: state.rankKey,
    currentSalary: state.salary,
    percent: state.percent
  });
  state.lastResult = result;

  // 1. Update Base & Bracket
  DOM.baseSalaryDisplay.textContent = formatCurrency(result.baseSalary, 0);
  if (result.isUpper) {
    DOM.bracketBadge.className = 'badge-tag upper';
    DOM.bracketText.textContent = `ช่วงบน (>= ${result.cutOff.toLocaleString()} บ.)`;
  } else {
    DOM.bracketBadge.className = 'badge-tag lower';
    DOM.bracketText.textContent = `ช่วงล่าง (< ${result.cutOff.toLocaleString()} บ.)`;
  }

  // 2. Update Payslip Rows
  DOM.slipRankTitle.textContent = `${result.rankTitle} (${result.rankName})`;
  DOM.slipBase.textContent = `${formatCurrency(result.baseSalary)} บ.`;
  DOM.slipPercent.textContent = state.percent.toFixed(2);
  DOM.slipIncrement.textContent = `+${formatCurrency(result.roundedIncrease)} บ.`;
  DOM.slipNewBase.textContent = `${formatCurrency(result.newSalaryBase)} บ.`;
  DOM.slipAllowance.textContent = `${formatCurrency(result.allowance)} บ.`;
  DOM.slipSpecial.textContent = `${formatCurrency(result.special)} บ.`;
  DOM.slipTotalAllowance.textContent = `${formatCurrency(result.totalAllowance)} บ.`;

  // Grand Total Ticker
  DOM.slipGrandTotal.textContent = formatCurrency(result.grandTotal);

  // 3. Annual Simulation if enabled
  if (state.annualMode) {
    const annual = simulateAnnualIncrements({
      rankKey: state.rankKey,
      startingSalary: state.salary,
      percentRound1: state.annualR1,
      percentRound2: state.annualR2
    });
    DOM.slipAnnualR1.textContent = `${formatCurrency(annual.round1.newSalaryBase)} บ.`;
    DOM.slipAnnualR2.textContent = `${formatCurrency(annual.round2.newSalaryBase)} บ.`;
    DOM.slipAnnualTotalInc.textContent = `+${formatCurrency(annual.annualIncrease)} บ.`;
  }
}

// ==========================================================================
// Event Listeners Setup
// ==========================================================================
function setupEventListeners() {
  // Theme Switcher
  DOM.themeBtn.addEventListener('click', toggleTheme);

  // Rank Cards Selection
  DOM.rankCards.forEach(card => {
    const handleSelect = () => {
      DOM.rankCards.forEach(c => {
        c.classList.remove('active');
        c.setAttribute('aria-checked', 'false');
      });
      card.classList.add('active');
      card.setAttribute('aria-checked', 'true');
      state.rankKey = card.dataset.rank;
      recalculate();
    };

    card.addEventListener('click', handleSelect);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleSelect();
      }
    });
  });

  // Salary Input
  DOM.salaryInput.addEventListener('input', (e) => {
    const rawVal = e.target.value.replace(/[^0-9]/g, '');
    const num = parseInt(rawVal, 10) || 0;
    state.salary = num;
    recalculate();
  });

  DOM.salaryInput.addEventListener('blur', (e) => {
    e.target.value = formatCurrency(state.salary, 0);
  });

  DOM.salaryInput.addEventListener('focus', (e) => {
    if (state.salary > 0) {
      e.target.value = state.salary;
    }
  });

  // Quick Chips Selection
  DOM.chips.forEach(chip => {
    chip.addEventListener('click', () => {
      DOM.chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const val = parseFloat(chip.dataset.val);
      state.percent = val;
      DOM.percentSlider.value = val;
      DOM.percentInput.value = val.toFixed(2);
      recalculate();
    });
  });

  // Range Slider
  DOM.percentSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    state.percent = val;
    DOM.percentInput.value = val.toFixed(2);
    updateChipActiveState(val);
    recalculate();
  });

  // Percent Numeric Input
  DOM.percentInput.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value) || 0;
    state.percent = val;
    DOM.percentSlider.value = val;
    updateChipActiveState(val);
    recalculate();
  });

  function updateChipActiveState(val) {
    DOM.chips.forEach(c => {
      const chipVal = parseFloat(c.dataset.val);
      if (Math.abs(chipVal - val) < 0.01) {
        c.classList.add('active');
      } else {
        c.classList.remove('active');
      }
    });
  }

  // Mode Tabs (Single vs Annual)
  DOM.modeSingleBtn.addEventListener('click', () => {
    state.annualMode = false;
    DOM.modeSingleBtn.classList.add('active');
    DOM.modeAnnualBtn.classList.remove('active');
    DOM.annualControls.classList.remove('active');
    DOM.annualSummarySection.style.display = 'none';
    recalculate();
  });

  DOM.modeAnnualBtn.addEventListener('click', () => {
    state.annualMode = true;
    DOM.modeAnnualBtn.classList.add('active');
    DOM.modeSingleBtn.classList.remove('active');
    DOM.annualControls.classList.add('active');
    DOM.annualSummarySection.style.display = 'block';
    recalculate();
  });

  DOM.annualR1Input.addEventListener('input', (e) => {
    state.annualR1 = parseFloat(e.target.value) || 0;
    recalculate();
  });

  DOM.annualR2Input.addEventListener('input', (e) => {
    state.annualR2 = parseFloat(e.target.value) || 0;
    recalculate();
  });

  // Copy Summary Action
  DOM.btnCopySummary.addEventListener('click', copySummaryToClipboard);

  // Export Slip Image Action
  DOM.btnExportImage.addEventListener('click', exportPayslipImage);
}

// ==========================================================================
// Copy Summary Text
// ==========================================================================
function copySummaryToClipboard() {
  if (!state.lastResult) return;
  const res = state.lastResult;
  const dateStr = new Date().toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  let text = `📋 [สรุปผลการคำนวณเงินเดือนครู ก.ค.ศ.]\n`;
  text += `📅 ข้อมูล ณ วันที่: ${dateStr}\n`;
  text += `─────────────────────\n`;
  text += `• ตำแหน่ง/วิทยฐานะ: ${res.rankTitle} (${res.rankName})\n`;
  text += `• เงินเดือนเดิม: ${formatCurrency(res.currentSalary)} บาท\n`;
  text += `• ฐานที่ใช้คำนวณ: ${formatCurrency(res.baseSalary)} บาท (${res.isUpper ? 'ช่วงบน' : 'ช่วงล่าง'})\n`;
  text += `• ร้อยละที่ได้เลื่อน: ${res.percent.toFixed(2)}%\n`;
  text += `• เงินเลื่อนขั้นที่ได้เพิ่ม: +${formatCurrency(res.roundedIncrease)} บาท\n`;
  text += `• เงินเดือนใหม่: ${formatCurrency(res.newSalaryBase)} บาท\n`;
  if (res.totalAllowance > 0) {
    text += `• เงินวิทยฐานะ: ${formatCurrency(res.allowance)} บาท\n`;
    if (res.special > 0) {
      text += `• ค่าตอบแทนพิเศษ: ${formatCurrency(res.special)} บาท\n`;
    }
  }
  text += `─────────────────────\n`;
  text += `💰 รวมรายรับสุทธิต่อเดือน: ${formatCurrency(res.grandTotal)} บาท`;

  if (state.annualMode) {
    const annual = simulateAnnualIncrements({
      rankKey: state.rankKey,
      startingSalary: state.salary,
      percentRound1: state.annualR1,
      percentRound2: state.annualR2
    });
    text += `\n\n📈 [การจำลองเลื่อนขั้นทั้งปี (2 รอบ)]\n`;
    text += `• หลังรอบ เม.ย. (${state.annualR1}%): ${formatCurrency(annual.round1.newSalaryBase)} บ.\n`;
    text += `• หลังรอบ ต.ค. (${state.annualR2}%): ${formatCurrency(annual.round2.newSalaryBase)} บ.\n`;
    text += `• รวมเงินเดือนเพิ่มขึ้นตลอดทั้งปี: +${formatCurrency(annual.annualIncrease)} บ./เดือน`;
  }

  navigator.clipboard.writeText(text).then(() => {
    showToast('คัดลอกข้อความสรุปเรียบร้อยแล้ว');
  }).catch(() => {
    showToast('เกิดข้อผิดพลาดในการคัดลอก');
  });
}

// ==========================================================================
// High-Resolution Digital Payslip Image Generator (HTML5 Canvas)
// ==========================================================================
function exportPayslipImage() {
  if (!state.lastResult) return;
  const res = state.lastResult;
  const canvas = DOM.exportCanvas;
  const ctx = canvas.getContext('2d');

  // 2x Retina Resolution
  const width = 840;
  const height = state.annualMode ? 1040 : 920;
  canvas.width = width;
  canvas.height = height;

  const isWarm = state.theme === 'warm';
  const bgColor = isWarm ? '#FAF7F2' : '#F0F4F8';
  const cardColor = '#FFFFFF';
  const headerBg = isWarm ? '#2B3442' : '#0F172A';
  const primaryText = isWarm ? '#1C2430' : '#0F172A';
  const secondaryText = isWarm ? '#576579' : '#475569';
  const accentColor = isWarm ? '#C26307' : '#059669';
  const totalNumColor = isWarm ? '#FBBF24' : '#34D399';

  // Background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  // Outer Card
  const pad = 40;
  const cardW = width - (pad * 2);
  const cardH = height - (pad * 2);
  const r = 24;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 12;
  roundRect(ctx, pad, pad, cardW, cardH, r);
  ctx.fillStyle = cardColor;
  ctx.fill();
  ctx.restore();

  // Header Box
  ctx.save();
  ctx.beginPath();
  roundRect(ctx, pad, pad, cardW, 130, { tl: r, tr: r, br: 0, bl: 0 });
  ctx.fillStyle = headerBg;
  ctx.fill();

  // Header Title
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 32px "Prompt", sans-serif';
  ctx.fillText(res.rankTitle, pad + 32, pad + 56);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.font = '20px "Sarabun", sans-serif';
  ctx.fillText(`สลิปจำลองการเลื่อนเงินเดือนข้าราชการครู (${res.rankName})`, pad + 32, pad + 92);

  // Official Seal Badge
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  roundRect(ctx, pad + cardW - 140, pad + 40, 100, 36, 18);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 18px "Prompt", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ก.ค.ศ.', pad + cardW - 90, pad + 65);
  ctx.restore();

  // Card Content
  let y = pad + 180;
  const colL = pad + 36;
  const colR = pad + cardW - 36;

  function drawRow(label, value, isHighlight = false) {
    if (isHighlight) {
      ctx.fillStyle = isWarm ? '#FEF3E7' : '#ECFDF5';
      roundRect(ctx, colL - 10, y - 28, cardW - 52, 48, 10);
      ctx.fill();

      ctx.fillStyle = accentColor;
      ctx.font = 'bold 22px "Prompt", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(label, colL, y + 4);

      ctx.font = 'bold 24px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(value, colR, y + 4);
    } else {
      ctx.fillStyle = secondaryText;
      ctx.font = '22px "Sarabun", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(label, colL, y);

      ctx.fillStyle = primaryText;
      ctx.font = '600 22px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(value, colR, y);
    }
    y += 52;
  }

  drawRow('ฐานที่ใช้คำนวณ:', `${formatCurrency(res.baseSalary)} บาท (${res.isUpper ? 'ช่วงบน' : 'ช่วงล่าง'})`);
  drawRow(`▲ เงินที่ได้เลื่อนขั้น (${res.percent.toFixed(2)}%):`, `+${formatCurrency(res.roundedIncrease)} บาท`, true);
  
  y += 10;
  // Dashed Divider
  ctx.strokeStyle = '#D9CEBE';
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(colL, y);
  ctx.lineTo(colR, y);
  ctx.stroke();
  ctx.setLineDash([]);
  y += 40;

  drawRow('เงินเดือนใหม่ (เลื่อนขั้นแล้ว):', `${formatCurrency(res.newSalaryBase)} บาท`);
  drawRow('เงินวิทยฐานะ:', `${formatCurrency(res.allowance)} บาท`);
  drawRow('ค่าตอบแทนพิเศษ:', `${formatCurrency(res.special)} บาท`);
  drawRow('รวมเงินประจำตำแหน่ง:', `${formatCurrency(res.totalAllowance)} บาท`);

  y += 20;

  // Grand Total Banner
  const bannerH = 130;
  ctx.save();
  roundRect(ctx, colL, y, cardW - 72, bannerH, 16);
  ctx.fillStyle = headerBg;
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.font = '18px "Prompt", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('รวมรายรับสุทธิโดยประมาณ', width / 2, y + 40);

  ctx.fillStyle = totalNumColor;
  ctx.font = 'bold 44px "JetBrains Mono", monospace';
  ctx.fillText(`${formatCurrency(res.grandTotal)}`, width / 2, y + 90);
  ctx.font = '16px "Sarabun", sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.fillText('บาท / เดือน', width / 2, y + 115);
  ctx.restore();

  y += bannerH + 40;

  // Footer inside card
  const today = new Date().toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  ctx.fillStyle = '#8E9BAE';
  ctx.font = '16px "Sarabun", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`คำนวณ ณ วันที่ ${today} • อ้างอิงตามระเบียบ ก.ค.ศ.`, width / 2, y);

  // Trigger Download
  const link = document.createElement('a');
  link.download = `สลิปเงินเดือนครู_${res.rankName}_${res.currentSalary}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
  showToast('ดาวน์โหลดรูปภาพสลิปเรียบร้อยแล้ว');
}

// Helper: Rounded Rectangle
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

// ==========================================================================
// Initialization
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  applyTheme(state.theme);
  setupEventListeners();
  recalculate();
});
