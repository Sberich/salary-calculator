/**
 * salary-rules.js
 * เกณฑ์การคำนวณเงินเดือนครูตามมาตรฐาน ก.ค.ศ.
 */

export const SALARY_CRITERIA = {
  k5: {
    name: 'คศ. 5',
    title: 'ครูเชี่ยวชาญพิเศษ',
    cutOff: 60840,
    baseHigh: 68560,
    baseLow: 60830,
    allowance: 15600,
    special: 15600,
    badge: 'ระดับสูงสุด'
  },
  k4: {
    name: 'คศ. 4',
    title: 'ครูเชี่ยวชาญ',
    cutOff: 50330,
    baseHigh: 59630,
    baseLow: 50320,
    allowance: 9900,
    special: 9900,
    badge: 'เชี่ยวชาญ'
  },
  k3: {
    name: 'คศ. 3',
    title: 'ครูชำนาญการพิเศษ',
    cutOff: 40280,
    baseHigh: 49330,
    baseLow: 37200,
    allowance: 5600,
    special: 5600,
    badge: 'ชำนาญการพิเศษ'
  },
  k2: {
    name: 'คศ. 2',
    title: 'ครูชำนาญการ',
    cutOff: 30210,
    baseHigh: 35270,
    baseLow: 30200,
    allowance: 3500,
    special: 0,
    badge: 'ชำนาญการ'
  },
  k1: {
    name: 'คศ. 1',
    title: 'ครู คศ. 1',
    cutOff: 24890,
    baseHigh: 29600,
    baseLow: 22780,
    allowance: 0,
    special: 0,
    badge: 'ครูผู้สอน'
  },
  assistant: {
    name: 'ครูผู้ช่วย',
    title: 'ครูผู้ช่วย (แรกบรรจุ)',
    cutOff: 19910,
    baseHigh: 22330,
    baseLow: 17480,
    allowance: 0,
    special: 0,
    badge: 'แรกเริ่ม'
  }
};

/**
 * ดึงฐานการคำนวณและระบุว่าเป็นช่วงบนหรือช่วงล่าง
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
 * คำนวณเงินเลื่อนขั้นตามเกณฑ์ ก.ค.ศ. ปัดเศษขึ้นเป็นสิบบาท
 */
export function calculateIncrement(baseSalary, percent) {
  const rawIncrease = Math.round(((baseSalary * percent) / 100) * 100) / 100;
  // ปัดเศษขึ้นเป็นจำนวนเต็มสิบบาทเสมอตามระเบียบราชการ
  const roundedIncrease = Math.ceil(rawIncrease / 10) * 10;
  return {
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

  const { base: baseSalary, isUpper, cutOff } = getCalculationBase(rankKey, currentSalary);
  const { rawIncrease, roundedIncrease } = calculateIncrement(baseSalary, percent);
  const newSalaryBase = currentSalary + roundedIncrease;
  const allowance = criteria.allowance;
  const special = criteria.special;
  const totalAllowance = allowance + special;
  const grandTotal = newSalaryBase + totalAllowance;

  return {
    rankKey,
    rankName: criteria.name,
    rankTitle: criteria.title,
    currentSalary,
    percent,
    baseSalary,
    isUpper,
    cutOff,
    rawIncrease,
    roundedIncrease,
    newSalaryBase,
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
  // รอบที่ 1: เมษายน
  const round1 = calculateSalaryResult({
    rankKey,
    currentSalary: startingSalary,
    percent: percentRound1
  });

  // รอบที่ 2: ตุลาคม (ใช้เงินเดือนใหม่จากรอบที่ 1 เป็นฐานตั้ง)
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
