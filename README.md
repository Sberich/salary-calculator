# 🎓 ระบบคำนวณเงินเดือนครูและวิทยฐานะ (ครูไทย ยุคใหม่)

เว็บแอปพลิเคชันสำหรับคำนวณเงินเดือนครู การเลื่อนขั้น และเงินวิทยฐานะตามเกณฑ์มาตรฐาน ก.ค.ศ. ออกแบบอย่างประณีต ไม่ซ้ำซาก หลีกเลี่ยง AI Slop พร้อมระบบสลับ 2 ธีม (Warm Editorial & Nordic Mint) และออกสลิปจำลองความละเอียดสูง

---

## ✨ จุดเด่นและฟีเจอร์หลัก

1. **ระบบ 2 ธีมในตัว (Dual Themes):**
   - **☀️ Warm Editorial:** สไตล์นิตยสารการเงิน ครีมกระดาษอุ่น + Slate + Amber สบายตา
   - **🌿 Nordic Mint:** สไตล์แอป FinTech สมัยใหม่ คลีน มิ้นต์สดชื่น
   - สลับธีมได้ทันทีเพียง 1 คลิก และบันทึกค่าลง `localStorage` อัตโนมัติ

2. **คำนวณแบบ Real-time ตามเกณฑ์ ก.ค.ศ. เป๊ะ 100%:**
   - ตรวจสอบอัตราเงินเดือนเปรียบเทียบกับ Cut-off เพื่อเลือก **ฐานช่วงบน / ช่วงล่าง** ให้อัตโนมัติ
   - คำนวณร้อยละการเลื่อนขั้น พร้อม **ปัดเศษขึ้นเป็นจำนวนเต็มสิบบาท** ตามระเบียบราชการ (`Math.ceil((base * %) / 10) * 10`)
   - รวมเงินวิทยฐานะและค่าตอบแทนพิเศษรายเดือนตามแต่ละอันดับ (ครูผู้ช่วย ถึง คศ.5)

3. **Digital Payslip & Image Export:**
   - แสดงการ์ดสลิปเงินเดือนดิจิทัลอย่างชัดเจน สวยงาม
   - **📷 ปุ่มบันทึกรูปภาพสลิป:** เรนเดอร์เป็นภาพ `.png` ความละเอียดสูง 2x Retina เหมาะสำหรับแชร์ใน LINE หรือบันทึกไว้ดูย้อนหลัง
   - **📋 ปุ่มคัดลอกข้อความสรุป:** จัดรูปแบบข้อความพร้อมอีโมจิสวยงาม สำหรับส่งเข้าแชท

4. **โหมดจำลองเลื่อนขั้นทั้งปี (2 รอบ):**
   - จำลองการเลื่อนเงินเดือนทั้งรอบ 1 เม.ย. และ 1 ต.ค. แบบ Cascade สะท้อนฐานเงินเดือนจริง

5. **สถาปัตยกรรมไร้ Dependency (Zero Runtime Overhead):**
   - เขียนด้วย Pure Vanilla HTML5 + Modern CSS Design Tokens + Modular ES6 JavaScript
   - โหลดเร็วในระดับเสี้ยววินาที รองรับการแสดงผลทุกขนาดหน้าจอ (Responsive Mobile-first)

---

## 📁 โครงสร้างโปรเจ็ค

```
salary-pj/
├── index.html               # โครงสร้างหน้าเว็บหลักและ Semantic Elements
├── css/
│   └── style.css            # ระบบ Design Tokens 2 ธีม, Layout, Typography
├── js/
│   ├── salary-rules.js      # Core Logic คำนวณเงินเดือนตามเกณฑ์ ก.ค.ศ.
│   └── app.js               # UI Controller, State, Event Listeners, Canvas Image Generator
├── tests/
│   └── salary-rules.test.js # Unit Tests ครอบคลุมการคำนวณทุกกรณี (Node.js Test Runner)
├── README.md                # คู่มือการใช้งานและวิธี Deploy
└── .gitignore
```

---

## 🧪 การทดสอบระบบ (Automated Tests)

รันคำสั่งทดสอบ Unit Test ผ่าน Node.js ในเครื่อง:

```bash
node --test tests/salary-rules.test.js
```

---

## 🚀 วิธีการ Deploy ขึ้น GitHub และ Cloudflare Pages

### ขั้นตอนที่ 1: นำโค้ดขึ้น GitHub
1. สร้าง New Repository บน [GitHub](https://github.com/new) ตั้งชื่อตามต้องการ เช่น `salary-pj` หรือ `teacher-salary-calculator`
2. เปิด Terminal เข้ามาที่โฟลเดอร์ `salary-pj` แล้วทำการ Commit และ Push โค้ด:
   ```bash
   cd salary-pj
   git init
   git add .
   git commit -m "feat: initial commit of modern teacher salary calculator"
   git branch -M main
   git remote add origin https://github.com/<your-username>/salary-pj.git
   git push -u origin main
   ```

### ขั้นตอนที่ 2: เชื่อมต่อไปยัง Cloudflare Pages
1. เข้าสู่ระบบ [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. ไปที่เมนู **Workers & Pages** > คลิก **Create application** > เลือกแท็บ **Pages**
3. คลิก **Connect to Git** แล้วเลือก Repository GitHub ที่เพิ่งสร้าง (`teacher-salary-calculator`)
4. ในหน้าตั้งค่าโปรเจ็ค:
   - **Project name:** ตั้งชื่อตามต้องการ (จะเป็นชื่อโดเมนย่อย เช่น `teacher-salary.pages.dev`)
   - **Production branch:** `main`
   - **Framework preset:** เลือก **None** (เพราะเป็น Static Web แท้)
   - **Build command:** ปล่อยว่างไว้
   - **Build output directory:** ปล่อยว่างไว้ (หรือใส่ `/`)
5. คลิก **Save and Deploy**
6. ภายในเวลาไม่เกิน 30 วินาที เว็บไซต์ของคุณจะออนไลน์ทันทีทั่วโลก พร้อม SSL ฟรี, CDN ทั่วโลก และ Custom Domain ได้ฟรี!

---

## 📜 กฎเกณฑ์อ้างอิง
- อ้างอิงตามหลักเกณฑ์และวิธีการเลื่อนเงินเดือนข้าราชการครูและบุคลากรทางการศึกษา ตามหนังสือสำนักงาน ก.ค.ศ.
