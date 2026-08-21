import pptxgen from 'pptxgenjs';
import path from 'path';
import fs from 'fs';

const SCREENSHOTS_DIR = path.join(__dirname, '../docs/screenshots');
const OUTPUT_PATH = path.join(__dirname, '../docs/issue-tracker-manual.pptx');

const DARK_BG = '0f1117';
const SURFACE = '1a1d27';
const ACCENT = '6366f1';
const ACCENT_LIGHT = '818cf8';
const TEXT = 'e2e4f0';
const MUTED = '8b91aa';
const BORDER = '2e3348';
const GREEN = '4ade80';

function imgPath(filename: string): string {
  return path.join(SCREENSHOTS_DIR, filename);
}

const pptx = new pptxgen();
pptx.layout = 'LAYOUT_WIDE'; // 16:9

// Master slide defaults
pptx.defineSlideMaster({
  title: 'DARK',
  background: { color: DARK_BG },
  objects: [
    // Bottom bar
    { rect: { x: 0, y: 6.8, w: '100%', h: 0.2, fill: { color: '1a1d27' } } },
    { text: {
        text: 'Issue Tracker — คู่มือการใช้งาน',
        options: { x: 0.3, y: 6.82, w: 6, h: 0.18, fontSize: 8, color: MUTED, fontFace: 'Tahoma' }
      }
    },
    { text: {
        text: 'SCG | Internal Use Only',
        options: { x: 7, y: 6.82, w: 2.7, h: 0.18, fontSize: 8, color: MUTED, fontFace: 'Tahoma', align: 'right' }
      }
    },
  ],
});

// Helper: add standard slide with title + content area
function addTitleSlide(title: string, subtitle: string) {
  const slide = pptx.addSlide({ masterName: 'DARK' });

  // Accent line
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 0.06, h: 6.8, fill: { color: ACCENT },
  });

  // Title
  slide.addText(title, {
    x: 0.3, y: 2.2, w: 9.4, h: 1.2,
    fontSize: 36, bold: true, color: TEXT,
    fontFace: 'Tahoma',
  });

  // Subtitle
  slide.addText(subtitle, {
    x: 0.3, y: 3.5, w: 9.4, h: 0.6,
    fontSize: 16, color: MUTED, fontFace: 'Tahoma',
  });

  return slide;
}

// Helper: split slide (text left | image right)
function addSplitSlide(
  badge: string,
  title: string,
  subtitle: string,
  bullets: string[],
  screenshotFile: string,
) {
  const slide = pptx.addSlide({ masterName: 'DARK' });

  // Left accent bar
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 0.05, h: 6.8, fill: { color: ACCENT },
  });

  // Surface panel left
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.05, y: 0, w: 3.9, h: 6.8,
    fill: { color: SURFACE },
    line: { color: BORDER, width: 0 },
  });

  // Badge
  slide.addText(badge, {
    x: 0.2, y: 0.3, w: 3.5, h: 0.25,
    fontSize: 9, bold: true, color: ACCENT_LIGHT, fontFace: 'Tahoma',
    charSpacing: 2,
  });

  // Title
  slide.addText(title, {
    x: 0.2, y: 0.65, w: 3.5, h: 1.1,
    fontSize: 22, bold: true, color: TEXT, fontFace: 'Tahoma',
    breakLine: true,
  });

  // Subtitle
  slide.addText(subtitle, {
    x: 0.2, y: 1.85, w: 3.5, h: 0.45,
    fontSize: 11, color: MUTED, fontFace: 'Tahoma',
  });

  // Divider
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.2, y: 2.38, w: 3.4, h: 0.02,
    fill: { color: BORDER },
  });

  // Bullets
  const bulletItems = bullets.map((b) => ({
    text: b,
    options: { bullet: { code: '25CF', color: ACCENT, indent: 10 }, color: TEXT, fontSize: 11, fontFace: 'Tahoma' },
  }));
  slide.addText(bulletItems, {
    x: 0.2, y: 2.5, w: 3.5, h: 4.0,
    paraSpaceAfter: 6,
  });

  // Screenshot image
  const imgFile = imgPath(screenshotFile);
  if (fs.existsSync(imgFile)) {
    slide.addImage({
      path: imgFile,
      x: 4.2, y: 0.2, w: 5.6, h: 6.3,
      rounding: true,
    });
  }

  return slide;
}

// ────────────────────────────────────────────────────
// SLIDE 1 — Cover
// ────────────────────────────────────────────────────
{
  const slide = pptx.addSlide({ masterName: 'DARK' });

  // Background gradient effect (two rects)
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: '100%', h: '100%',
    fill: { color: DARK_BG },
  });
  slide.addShape(pptx.ShapeType.ellipse, {
    x: 1, y: -1, w: 5, h: 5,
    fill: { color: '2d1b69' }, line: { color: '2d1b69' },
  });

  // Accent circle
  slide.addShape(pptx.ShapeType.ellipse, {
    x: 4.2, y: 1.0, w: 1.1, h: 1.1,
    fill: { color: ACCENT },
    line: { color: ACCENT },
  });
  slide.addText('🐞', {
    x: 4.2, y: 1.0, w: 1.1, h: 1.1,
    fontSize: 28, align: 'center', valign: 'middle',
  });

  // Title
  slide.addText('Issue Tracker', {
    x: 1, y: 2.3, w: 8, h: 1.4,
    fontSize: 48, bold: true, color: TEXT, fontFace: 'Tahoma', align: 'center',
  });

  // Subtitle
  slide.addText('คู่มือการใช้งานระบบติดตามปัญหา Odoo SCG', {
    x: 1, y: 3.7, w: 8, h: 0.5,
    fontSize: 16, color: MUTED, fontFace: 'Tahoma', align: 'center',
  });

  // Meta pills
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 1.5, y: 5.0, w: 2.8, h: 0.35,
    fill: { color: '1a1d27' }, line: { color: BORDER }, rectRadius: 0.1,
  });
  slide.addText('🌐  odoo-issue-log.scg.com', {
    x: 1.5, y: 5.0, w: 2.8, h: 0.35,
    fontSize: 10, color: MUTED, fontFace: 'Tahoma', align: 'center',
  });

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 4.6, y: 5.0, w: 2.0, h: 0.35,
    fill: { color: '1a1d27' }, line: { color: BORDER }, rectRadius: 0.1,
  });
  slide.addText('Next.js + PostgreSQL', {
    x: 4.6, y: 5.0, w: 2.0, h: 0.35,
    fontSize: 10, color: MUTED, fontFace: 'Tahoma', align: 'center',
  });

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 6.9, y: 5.0, w: 2.0, h: 0.35,
    fill: { color: '1a1d27' }, line: { color: BORDER }, rectRadius: 0.1,
  });
  slide.addText('สิงหาคม 2026', {
    x: 6.9, y: 5.0, w: 2.0, h: 0.35,
    fontSize: 10, color: MUTED, fontFace: 'Tahoma', align: 'center',
  });
}

// ────────────────────────────────────────────────────
// SLIDE 2 — Overview (5 modules)
// ────────────────────────────────────────────────────
{
  const slide = pptx.addSlide({ masterName: 'DARK' });

  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 0.06, h: 6.8, fill: { color: ACCENT },
  });

  slide.addText('ภาพรวมระบบ', {
    x: 0.3, y: 0.3, w: 9, h: 0.3,
    fontSize: 9, bold: true, color: ACCENT_LIGHT, fontFace: 'Tahoma', charSpacing: 2,
  });
  slide.addText('ระบบมี 5 โมดูลหลัก', {
    x: 0.3, y: 0.65, w: 9, h: 0.7,
    fontSize: 28, bold: true, color: TEXT, fontFace: 'Tahoma',
  });

  const modules = [
    { icon: '📋', name: 'Issues', desc: 'บันทึกและติดตามปัญหา', x: 0.3 },
    { icon: '📁', name: 'Projects', desc: 'จัดกลุ่ม Issue ตาม Project', x: 2.2 },
    { icon: '👥', name: 'Users', desc: 'จัดการสมาชิกทีม', x: 4.1 },
    { icon: '🗄️', name: 'Master Data', desc: 'ข้อมูลพื้นฐาน, Dropdown', x: 6.0 },
    { icon: '⚙️', name: 'Config', desc: 'ตั้งค่าระบบ, Roles, SMTP', x: 7.9 },
  ];

  modules.forEach((m) => {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: m.x, y: 1.8, w: 1.75, h: 4.7,
      fill: { color: SURFACE }, line: { color: BORDER, width: 0.5 }, rectRadius: 0.1,
    });
    slide.addText(m.icon, { x: m.x, y: 2.1, w: 1.75, h: 0.7, fontSize: 28, align: 'center' });
    slide.addText(m.name, {
      x: m.x, y: 2.95, w: 1.75, h: 0.4,
      fontSize: 13, bold: true, color: TEXT, fontFace: 'Tahoma', align: 'center',
    });
    slide.addText(m.desc, {
      x: m.x + 0.05, y: 3.45, w: 1.65, h: 0.6,
      fontSize: 9, color: MUTED, fontFace: 'Tahoma', align: 'center', breakLine: true,
    });
  });
}

// ────────────────────────────────────────────────────
// SLIDES 3–11 — Feature slides
// ────────────────────────────────────────────────────
addSplitSlide(
  'ขั้นตอนที่ 1', 'การเข้าสู่ระบบ',
  'เข้าผ่าน URL ที่กำหนด กรอก Email และ Password',
  [
    'กรอก Email และ Password ที่ได้รับจากผู้ดูแล',
    'กด เข้าสู่ระบบ — ระบบตรวจสอบสิทธิ์อัตโนมัติ',
    'Session หมดอายุ → ระบบแจ้งเตือนให้ login ใหม่',
    'ล็อกอินผิดพลาดหลายครั้ง → ระบบ lock 15 นาที',
    'เปลี่ยน Password ได้ที่เมนูโปรไฟล์',
  ],
  '01-login.png',
);

addSplitSlide(
  'โมดูลหลัก', 'Dashboard ภาพรวมสถิติ',
  'แสดงสรุปสถานะ Issue และรายงานประจำวัน',
  [
    'Stats Cards — จำนวน Issue แยกตาม Status',
    'Donut Chart — สัดส่วน Issue แต่ละ Status',
    'Daily Report — Issue ที่อัปเดตวันนี้',
    'Filter ตาม Project และช่วงวันที่',
    'Export รายงานเป็น Excel ได้',
  ],
  '02-dashboard.png',
);

addSplitSlide(
  'โมดูล Issues', 'รายการ Issues',
  'ดูและค้นหา Issue ทั้งหมดที่มีสิทธิ์เข้าถึง',
  [
    'Filter ตาม Project, Client, Status, Priority',
    'Filter ตาม Assignee, ประเภทปัญหา, Module',
    'Filter ตามวันที่สร้าง และ Due Date',
    'ค้นหาด้วย Keyword',
    'จัดกลุ่ม (Group By) ตาม Status หรือ Field',
    'Export เป็น CSV ได้',
  ],
  '03-issues-list.png',
);

addSplitSlide(
  'โมดูล Issues', 'สร้าง Issue ใหม่',
  'บันทึกปัญหาใหม่พร้อมรายละเอียดครบถ้วน',
  [
    'เลือก Project — โหลด Fields เฉพาะ Project นั้น',
    'ระบุ Client, Department, ประเภทปัญหา, Module',
    'กำหนด Priority และ Assignee',
    'เขียนรายละเอียดปัญหา (รองรับ Markdown)',
    'แนบไฟล์ได้ (PDF, รูปภาพ, Excel, Word, ZIP)',
    'บันทึกแล้วระบบ redirect ไปหน้ารายละเอียด',
  ],
  '04-issue-new.png',
);

addSplitSlide(
  'โมดูล Issues', 'รายละเอียด Issue',
  'ดู แก้ไข และติดตาม Issue แต่ละรายการ',
  [
    'ดูรายละเอียดครบ: Status, Priority, Assignee, วันที่',
    'แก้ไข Fields ได้ (กด Edit)',
    'เปลี่ยน Status ผ่าน Dropdown Workflow',
    'เพิ่ม Comment แจ้งความคืบหน้า',
    'อัปโหลดและดาวน์โหลด Attachment',
    'แสดง Solution Fields เมื่อ Issue ถูกปิด',
  ],
  '05-issue-detail.png',
);

addSplitSlide(
  'โมดูล Projects', 'จัดการ Projects',
  'จัดกลุ่ม Issue ตาม Project และ Project Group',
  [
    'แสดงทุก Project จัดกลุ่มตาม Project Group',
    'ดูจำนวน Issue และสมาชิกของแต่ละ Project',
    'กรอง Active / Closed Projects',
    'สร้าง Project ใหม่ (Admin/PM เท่านั้น)',
    'สร้าง Project Group ใหม่ (Admin เท่านั้น)',
  ],
  '06-projects.png',
);

addSplitSlide(
  'โมดูล Projects', 'ตั้งค่า Project',
  'กำหนด Fields, สมาชิก และ Workflow ของแต่ละ Project',
  [
    'เพิ่ม/ลบ/แก้ไข Custom Fields เฉพาะ Project',
    'จัดการสมาชิกและกำหนด Role (PM/Developer/Viewer)',
    'ตั้ง Dropdown Options เฉพาะ Project',
    'ตั้ง Status Workflow — แต่ละ Status ต้องกรอก Field ใด',
    'ลบ Project ได้ (Admin เท่านั้น)',
  ],
  '07-project-settings.png',
);

addSplitSlide(
  'โมดูล Users', 'จัดการผู้ใช้งาน',
  'เพิ่ม แก้ไข และกำหนดสิทธิ์ผู้ใช้ (Admin เท่านั้น)',
  [
    'ดูรายชื่อผู้ใช้ทั้งหมด กรองด้วย Role หรือ Search',
    'สร้างผู้ใช้ใหม่ทีละคน หรือ Import จาก CSV/Excel',
    'แก้ไขข้อมูล: ชื่อ, Email, Role, สถานะ Active',
    'Reset Password (Admin เท่านั้น)',
    'เพิ่ม/ลบผู้ใช้ออกจาก Projects',
    'Export รายชื่อผู้ใช้',
  ],
  '08-users.png',
);

addSplitSlide(
  'ตั้งค่าระบบ', 'Master Data & Config',
  'ข้อมูลพื้นฐานและการตั้งค่าระบบ (Admin เท่านั้น)',
  [
    'Master Data — จัดการ Dropdown global (Issue Type, Module, Dept)',
    'จัดการ Clients และ Project Groups',
    'App Settings — ชื่อระบบ, Logo',
    'Email/SMTP — ตั้งค่าส่ง Email แจ้งเตือน',
    'Roles & Permissions — สร้าง Role ใหม่, กำหนดสิทธิ์',
  ],
  '09-master-data.png',
);

// ────────────────────────────────────────────────────
// SLIDE 12 — Summary
// ────────────────────────────────────────────────────
{
  const slide = pptx.addSlide({ masterName: 'DARK' });

  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 0.06, h: 6.8, fill: { color: GREEN },
  });

  slide.addText('สรุป', {
    x: 0.3, y: 0.3, w: 9, h: 0.3,
    fontSize: 9, bold: true, color: GREEN, fontFace: 'Tahoma', charSpacing: 2,
  });
  slide.addText('พร้อมใช้งานแล้ว', {
    x: 0.3, y: 0.65, w: 9, h: 0.7,
    fontSize: 32, bold: true, color: TEXT, fontFace: 'Tahoma',
  });
  slide.addText('ข้อมูลสำคัญสำหรับเริ่มต้นใช้งานระบบ', {
    x: 0.3, y: 1.4, w: 9, h: 0.4,
    fontSize: 14, color: MUTED, fontFace: 'Tahoma',
  });

  const cards = [
    { label: 'URL ระบบ', value: 'odoo-issue-log.scg.com', x: 0.3, y: 2.1 },
    { label: 'Roles หลัก', value: 'admin, pm, member, rnao, co, gl', x: 3.6, y: 2.1 },
    { label: 'ผู้ดูแลระบบ', value: 'ติดต่อทีม IT เพื่อขอ account', x: 6.9, y: 2.1 },
    { label: 'Export ข้อมูล', value: 'Issues → CSV  ·  Users → Excel', x: 0.3, y: 4.0 },
    { label: 'Browser แนะนำ', value: 'Chrome / Edge เวอร์ชันล่าสุด', x: 3.6, y: 4.0 },
    { label: 'ขนาดไฟล์แนบ', value: 'สูงสุด 5 MB ต่อไฟล์', x: 6.9, y: 4.0 },
  ];

  cards.forEach((c) => {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: c.x, y: c.y, w: 3.1, h: 1.7,
      fill: { color: SURFACE }, line: { color: BORDER, width: 0.5 }, rectRadius: 0.1,
    });
    slide.addText(c.label, {
      x: c.x + 0.15, y: c.y + 0.15, w: 2.8, h: 0.3,
      fontSize: 8, bold: true, color: ACCENT_LIGHT, fontFace: 'Tahoma',
      charSpacing: 1,
    });
    slide.addText(c.value, {
      x: c.x + 0.15, y: c.y + 0.5, w: 2.8, h: 0.9,
      fontSize: 12, color: TEXT, fontFace: 'Tahoma', breakLine: true,
    });
  });
}

// ────────────────────────────────────────────────────
// Write file
// ────────────────────────────────────────────────────
pptx.writeFile({ fileName: OUTPUT_PATH }).then(() => {
  console.log(`✓ PPTX saved: ${OUTPUT_PATH}`);
}).catch((err: Error) => {
  console.error('Error:', err);
  process.exit(1);
});
