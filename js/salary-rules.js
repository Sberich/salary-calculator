/**
 * salary-rules.js
 * เกณฑ์การคำนวณเงินเดือนครูตามมาตรฐาน ก.ค.ศ. (ประมาณการตามประกาศ ว 20/2561)
 */

export const SALARY_CRITERIA = {
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

/**
 * ตรวจสอบความถูกต้องของอัตราเงินเดือนเทียบกับเพดานขั้นต่ำ-ขั้นสูงของอันดับนั้น
 */
export function checkSalaryBounds(rankKey, salary) {
  const criteria = SALARY_CRITERIA[rankKey];
  if (!criteria) {
    throw new Error(`ไม่พบข้อมูลวิทยฐานะ: ${rankKey}`);
  }

  const num = typeof salary === 'number' ? salary : 0;
  const isBelowMin = num < criteria.minSalary;
  const isAboveMax = num > criteria.maxSalary;

  let warning = null;
  if (isBelowMin) {
    warning = `เงินเดือนต่ำกว่าขั้นต่ำของ ${criteria.name} (${criteria.minSalary.toLocaleString()} บ.)`;
  } else if (isAboveMax) {
    warning = `เงินเดือนสูงกว่าเพดานขั้นสูงของ ${criteria.name} (${criteria.maxSalary.toLocaleString()} บ.)`;
  }

  return {
    isValid: !isBelowMin && !isAboveMax,
    isBelowMin,
    isAboveMax,
    minSalary: criteria.minSalary,
    maxSalary: criteria.maxSalary,
    warning
  };
}

/**
 * ดึงฐานการคำนวณและระบุว่าเป็นช่วงบนหรือช่วงล่างอัตโนมัติ
 */
export function getCalculationBase(rankKey, currentSalary) {
  const criteria = SALARY_CRITERIA[rankKey];
  if (!criteria) {
    throw new Error(`ไม่พบข้อมูลวิทยฐานะ: ${rankKey}`);
  }
  const isUpper = currentSalary >= criteria.cutOff;
  const base = isUpper ? criteria.baseHigh : criteria.baseLow;
  return {
    base,
    isUpper,
    cutOff: criteria.cutOff
  };
}

/**
 * คำนวณเงินเลื่อนขั้นตามเกณฑ์ ก.ค.ศ. พร้อมปัดเศษขึ้นเป็นสิบบาท
 */
export function calculateIncrement(baseSalary, percent) {
  // Clamp percent between 0% and 6.00%
  const safePercent = Math.max(0, Math.min(6.0, Number(percent) || 0));
  const rawIncrease = Math.round(((baseSalary * safePercent) / 100) * 100) / 100;
  // ปัดเศษขึ้นเป็นจำนวนเต็มสิบบาทตามระเบียบราชการ
  const roundedIncrease = Math.ceil(rawIncrease / 10) * 10;
  return {
    safePercent,
    rawIncrease,
    roundedIncrease
  };
}

/**
 * คำนวณสรุปเงินเดือนแบบครบวงจร
 */
export function calculateSalaryResult({ rankKey, currentSalary, percent }) {
  const criteria = SALARY_CRITERIA[rankKey];
  if (!criteria) {
    throw new Error(`ไม่พบข้อมูลวิทยฐานะ: ${rankKey}`);
  }

  const bounds = checkSalaryBounds(rankKey, currentSalary);
  const { base: baseSalary, isUpper, cutOff } = getCalculationBase(rankKey, currentSalary);
  const { safePercent, rawIncrease, roundedIncrease } = calculateIncrement(baseSalary, percent);
  
  const rawNewSalary = currentSalary + roundedIncrease;
  const isCapped = rawNewSalary > criteria.maxSalary;
  // เงินเดือนใหม่จริง (หากชนเพดานขั้นสูง ส่วนที่เกินจะได้รับเป็นค่าตอบแทนพิเศษตามระเบียบ)
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
    rawNewSalary,
    newSalaryBase,
    isCapped,
    spilloverCompensation,
    allowance,
    special,
    totalAllowance,
    grandTotal
  };
}

/**
 * จำลองการเลื่อนขั้นประจำปี 2 รอบ (1 เม.ย. และ 1 ต.ค.)
 */
export function simulateAnnualIncrements({
  rankKey,
  startingSalary,
  percentRound1,
  percentRound2
}) {
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
