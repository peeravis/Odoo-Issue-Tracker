import pptxgen from 'pptxgenjs';
import path from 'path';

const OUT = path.join('/Users/peerobinz/Desktop/odoo-cad-presentation/odoo-cad-presentation.pptx');

// ── Colors (light theme) ──
const BG     = 'f5f6fa';
const WHITE  = 'ffffff';
const SURF2  = 'eef0f8';
const BORDER = 'd8dbe8';
const ACCENT = '4f46e5';
const A2     = '4338ca';
const TEXT   = '1e1f2e';
const MUTED  = '6b7280';
const GREEN  = '059669';
const ORANGE = 'd97706';
const RED    = 'dc2626';
const YELLOW = 'b45309';
const TEAL   = '0891b2';
const INDIGO_LIGHT = 'ede9fe';
const GREEN_LIGHT  = 'd1fae5';
const ORANGE_LIGHT = 'fef3c7';
const RED_LIGHT    = 'fee2e2';

const pptx = new pptxgen();
pptx.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 inches

// ── Helpers ──
const FF = 'Tahoma';

function bg(slide: pptxgen.Slide) {
  slide.background = { color: BG };
}

function leftBar(slide: pptxgen.Slide, color = ACCENT) {
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.08, h: 7.5, fill: { color } });
}

function eyebrow(slide: pptxgen.Slide, text: string, x = 0.25, y = 0.25, color = A2) {
  slide.addText(text.toUpperCase(), {
    x, y, w: 12, h: 0.3,
    fontSize: 9, bold: true, color, fontFace: FF, charSpacing: 2,
  });
}

function heading(slide: pptxgen.Slide, text: string, x = 0.25, y = 0.6, w = 12.8) {
  slide.addText(text, {
    x, y, w, h: 0.9,
    fontSize: 24, bold: true, color: TEXT, fontFace: FF, breakLine: true,
  });
}

function lead(slide: pptxgen.Slide, text: string, x = 0.25, y = 1.4, w = 12.8) {
  slide.addText(text, {
    x, y, w, h: 0.4,
    fontSize: 12, color: MUTED, fontFace: FF,
  });
}

function sectionCard(slide: pptxgen.Slide, x: number, y: number, w: number, h: number,
  title: string, desc: string, color = ACCENT) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.08,
    fill: { color: WHITE }, line: { color: BORDER, width: 0.5 },
  });
  slide.addText(title, { x: x+0.12, y: y+0.1, w: w-0.2, h: 0.3, fontSize: 12, bold: true, color, fontFace: FF });
  slide.addText(desc,  { x: x+0.12, y: y+0.42, w: w-0.2, h: h-0.55, fontSize: 10, color: MUTED, fontFace: FF, breakLine: true });
}

function bullet(slide: pptxgen.Slide, items: string[], x: number, y: number, w: number, color = ACCENT) {
  const rows = items.map(t => ({
    text: t,
    options: { bullet: { code: '25CF', color, indent: 10 }, color: TEXT, fontSize: 11, fontFace: FF },
  }));
  slide.addText(rows, { x, y, w, h: items.length * 0.38 + 0.1, paraSpaceAfter: 4 });
}

function tag(slide: pptxgen.Slide, text: string, x: number, y: number,
  fg = A2, bgc = INDIGO_LIGHT, border = 'c4b5fd') {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w: text.length * 0.075 + 0.24, h: 0.24, rectRadius: 0.12,
    fill: { color: bgc }, line: { color: border, width: 0.5 },
  });
  slide.addText(text, {
    x, y, w: text.length * 0.075 + 0.24, h: 0.24,
    fontSize: 9, bold: true, color: fg, fontFace: FF, align: 'center',
  });
}

// Flow node helper
function fnode(slide: pptxgen.Slide, x: number, y: number, icon: string, name: string, sub: string,
  borderColor = BORDER, bgColor = WHITE) {
  const W = 1.35, H = 0.88;
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w: W, h: H, rectRadius: 0.08,
    fill: { color: bgColor }, line: { color: borderColor, width: 1 },
  });
  slide.addText(icon, { x, y: y+0.05, w: W, h: 0.3, fontSize: 16, align: 'center' });
  slide.addText(name, { x, y: y+0.35, w: W, h: 0.28, fontSize: 10, bold: true, color: TEXT, fontFace: FF, align: 'center', breakLine: true });
  slide.addText(sub,  { x, y: y+0.64, w: W, h: 0.2, fontSize: 8, color: MUTED, fontFace: FF, align: 'center' });
}

function farrow(slide: pptxgen.Slide, x: number, y: number, label = '') {
  slide.addShape(pptx.ShapeType.line, {
    x, y: y + 0.44, w: 0.4, h: 0,
    line: { color: BORDER, width: 1 },
  });
  slide.addText('›', { x: x+0.28, y: y+0.36, w: 0.18, h: 0.2, fontSize: 12, color: MUTED, fontFace: FF });
  if (label) slide.addText(label, { x, y: y+0.58, w: 0.42, h: 0.15, fontSize: 7, color: MUTED, fontFace: FF, align: 'center' });
}

// ════════════════════════════════════════════
// SLIDE 1 — COVER
// ════════════════════════════════════════════
{
  const s = pptx.addSlide();
  s.background = { color: 'e8eaf6' };

  // gradient rect
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 7.5, fill: { color: 'e0e7ff' }, line: { color: 'e0e7ff' } });
  s.addShape(pptx.ShapeType.ellipse, { x: 1.5, y: -1.5, w: 5, h: 5, fill: { color: 'c7d2fe' }, line: { color: 'c7d2fe' } });

  // Logo circle
  s.addShape(pptx.ShapeType.ellipse, { x: 5.9, y: 0.9, w: 1.1, h: 1.1, fill: { color: ACCENT }, line: { color: ACCENT } });
  s.addText('🟣', { x: 5.9, y: 0.9, w: 1.1, h: 1.1, fontSize: 28, align: 'center', valign: 'middle' });

  // Eyebrow
  s.addText('CAD — INTERNAL KNOWLEDGE SHARING', {
    x: 1, y: 2.2, w: 11.33, h: 0.3,
    fontSize: 10, bold: true, color: ACCENT, fontFace: FF, align: 'center', charSpacing: 2,
  });

  // Title
  s.addText('Odoo Community ของ CAD', {
    x: 1, y: 2.6, w: 11.33, h: 0.9,
    fontSize: 34, bold: true, color: TEXT, fontFace: FF, align: 'center',
  });
  s.addText('ประสบการณ์ ข้อจำกัด Integration และแนวทางต่อยอด', {
    x: 1, y: 3.55, w: 11.33, h: 0.55,
    fontSize: 16, color: ACCENT, fontFace: FF, align: 'center',
  });
  s.addText('แชร์ประสบการณ์จากการใช้งานจริง สิ่งที่ Odoo ทำได้ดี ข้อจำกัด และแนวทางสู่ Data Platform กับ AI', {
    x: 1.5, y: 4.2, w: 10.33, h: 0.4,
    fontSize: 12, color: MUTED, fontFace: FF, align: 'center',
  });

  // Chips
  const chips = ['⏱ 25 นาที', '📦 Odoo Community Edition', '🔗 Integration · Data Platform · AI'];
  chips.forEach((c, i) => {
    const cx = 2.4 + i * 3.2;
    s.addShape(pptx.ShapeType.roundRect, { x: cx, y: 5.1, w: 3.0, h: 0.36, rectRadius: 0.18, fill: { color: WHITE }, line: { color: BORDER, width: 0.5 } });
    s.addText(c, { x: cx, y: 5.1, w: 3.0, h: 0.36, fontSize: 10, color: MUTED, fontFace: FF, align: 'center' });
  });
}

// ════════════════════════════════════════════
// SLIDE 2 — OVERVIEW
// ════════════════════════════════════════════
{
  const s = pptx.addSlide(); bg(s); leftBar(s);
  eyebrow(s, '01 · ภาพรวม');
  heading(s, 'Odoo ในมุมของ CAD');
  lead(s, 'ไม่ใช่ ERP สำเร็จรูป แต่เป็น Platform กลาง ที่เชื่อมกระบวนการภายในกับ Application บัญชีและการเงิน');

  // Left bullets
  s.addText('ทำไมถึงเลือก Community Edition?', { x: 0.25, y: 1.85, w: 6, h: 0.3, fontSize: 13, bold: true, color: A2, fontFace: FF });
  bullet(s, [
    'เข้าถึง Source Code — พัฒนาต่อยอดได้อิสระ',
    'ยืดหยุ่นสูง เหมาะกับ CAD ที่มีทั้ง Business + Dev team',
    'ควบคุม Deployment และ Infrastructure เอง',
    'ต่อยอดได้โดยไม่ติด Vendor Lock-in',
  ], 0.25, 2.2, 6.0);

  // Right cards
  s.addText('CAD มอง Odoo เป็น...', { x: 6.8, y: 1.85, w: 6, h: 0.3, fontSize: 13, bold: true, color: A2, fontFace: FF });
  const cards2 = [
    ['🏗️', 'Platform กลาง', 'เชื่อมกระบวนการ Business ทั้งหมด'],
    ['🔌', 'Integration Hub', 'เชื่อมกับ App บัญชี-การเงิน-Compliance'],
    ['📊', 'Data Source', 'ต้นทางข้อมูลสำหรับ Reporting & AI'],
    ['⚙️', 'Workflow Engine', 'Approval, Automation, Scheduling'],
  ];
  cards2.forEach(([icon, title, desc], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    sectionCard(s, 6.8 + col * 3.2, 2.2 + row * 1.55, 3.0, 1.4, `${icon} ${title}`, desc);
  });
}

// ════════════════════════════════════════════
// SLIDE 3 — USE CASES & CRITICAL PROCESSES
// ════════════════════════════════════════════
{
  const s = pptx.addSlide(); bg(s); leftBar(s, TEAL);
  eyebrow(s, '02 · Use Case & Business-Critical Process', 0.25, 0.25, TEAL);
  heading(s, 'Module ที่ใช้งาน และ Process ที่ Critical');

  // Module tags
  s.addText('Module หลักที่ CAD ศึกษาและใช้งาน', { x: 0.25, y: 1.5, w: 6, h: 0.3, fontSize: 12, bold: true, color: A2, fontFace: FF });
  const modules = ['Purchase','Sales','Inventory','Expense','Project / Job Cost','Accounting & Tax','Payment & Banking','Financial Reporting'];
  modules.forEach((m, i) => { tag(s, m, 0.25 + (i % 4) * 3.2, 1.88 + Math.floor(i / 4) * 0.38); });

  // Critical
  s.addText('Business-Critical Processes', { x: 0.25, y: 2.75, w: 6, h: 0.3, fontSize: 12, bold: true, color: A2, fontFace: FF });
  bullet(s, [
    'บัญชีและการเงิน — ต้นทางของ Financial Statement ทั้งหมด',
    'การจ่ายเงิน — ควบคุม ePayment, สิทธิ์ผู้ใช้, ป้องกันซ้ำ',
    'ภาษี & Compliance — WHT, เอกสาร, ข้อกำหนดไทย',
    'ปิดบัญชี & Reporting — ส่งต่อ BPC FI, Managerial Report',
  ], 0.25, 3.1, 6.2, RED);

  // Right card
  s.addShape(pptx.ShapeType.roundRect, { x: 6.9, y: 1.5, w: 6.1, h: 2.8, rectRadius: 0.1, fill: { color: WHITE }, line: { color: BORDER, width: 0.5 } });
  s.addText('วิธีประเมิน ERP ของ CAD', { x: 7.1, y: 1.65, w: 5.7, h: 0.3, fontSize: 12, bold: true, color: A2, fontFace: FF });
  s.addText('ไม่ใช่แค่ดูว่าระบบมีหน้าจอหรือฟังก์ชันหรือไม่\nแต่ต้องดูว่า Process ที่สำคัญสามารถ:', { x: 7.1, y: 2.0, w: 5.7, h: 0.55, fontSize: 11, color: TEXT, fontFace: FF, breakLine: true });
  ['• สามารถควบคุมได้', '• ตรวจสอบย้อนหลังได้', '• ทำงานร่วมกับระบบอื่นได้'].forEach((t, i) => {
    s.addText(t, { x: 7.1, y: 2.62 + i * 0.28, w: 5.7, h: 0.26, fontSize: 12, bold: true, color: ACCENT, fontFace: FF });
  });

  s.addShape(pptx.ShapeType.roundRect, { x: 6.9, y: 4.45, w: 6.1, h: 2.5, rectRadius: 0.1, fill: { color: ORANGE_LIGHT }, line: { color: 'fcd34d', width: 0.5 } });
  s.addText('สิ่งที่ต้องเตรียมสำหรับ Community', { x: 7.1, y: 4.6, w: 5.7, h: 0.3, fontSize: 11, bold: true, color: YELLOW, fontFace: FF });
  bullet(s, ['ทีม Business เข้าใจ Process', 'ทีม Development ดูแล Custom Module', 'ทีม Infrastructure & Support ระยะยาว'], 7.1, 4.95, 5.7, ORANGE);
}

// ════════════════════════════════════════════
// SLIDE 4 — PURCHASE FLOW
// ════════════════════════════════════════════
{
  const s = pptx.addSlide(); bg(s); leftBar(s, ORANGE);
  eyebrow(s, 'Business Flow · การจัดซื้อ', 0.25, 0.25, ORANGE);
  heading(s, 'Purchase Flow — จัดซื้อถึงชำระเงิน');
  lead(s, 'กระบวนการจัดซื้อแบบครบวงจรใน Odoo ตั้งแต่ขอซื้อจนถึงจ่ายเงิน');

  // Flow row y=2.2
  const fy = 2.2;
  const nodes: [string,string,string,string,string][] = [
    ['📝','Purchase\nRequest (PR)','ขอซื้อ', ACCENT, WHITE],
    ['✅','อนุมัติ PR','Approval Flow', ORANGE, ORANGE_LIGHT],
    ['🛒','Purchase\nOrder (PO)','ใบสั่งซื้อ', A2, WHITE],
    ['✅','อนุมัติ PO','Approval Flow', ORANGE, ORANGE_LIGHT],
    ['📦','GR\nรับสินค้า','Goods Receipt', TEAL, WHITE],
    ['🧾','Vendor Bill','ใบแจ้งหนี้ผู้ขาย', YELLOW, WHITE],
    ['💳','Payment','ชำระเงิน', GREEN, GREEN_LIGHT],
  ];
  const converts = [false, true, false, false, true, false];
  let fx = 0.3;
  nodes.forEach(([icon, name, sub, border, bgc], i) => {
    fnode(s, fx, fy, icon, name, sub, border, bgc);
    if (i < nodes.length - 1) {
      farrow(s, fx + 1.35, fy, converts[i] ? 'Convert' : '');
      fx += 1.35 + 0.42;
    }
  });

  // Bottom info cards
  const icards = [
    [ORANGE,'2 จุดอนุมัติ','PR และ PO ต้องผ่านการอนุมัติแยกกันก่อน Commit'],
    [TEAL,'Traceability','PR → PO → GR → Bill → Payment เชื่อมโยงครบ'],
    [GREEN,'ePayment Control','ตรวจสอบจำนวนเงิน ผู้รับ สิทธิ์ และป้องกันรายการซ้ำ'],
  ];
  icards.forEach(([color, title, desc], i) => {
    const ix = 0.3 + i * 4.36;
    s.addShape(pptx.ShapeType.roundRect, { x: ix, y: 3.7, w: 4.1, h: 1.15, rectRadius: 0.08, fill: { color: WHITE }, line: { color: color as string, width: 1 } });
    s.addText(title as string, { x: ix+0.12, y: 3.78, w: 3.8, h: 0.28, fontSize: 12, bold: true, color: color as string, fontFace: FF });
    s.addText(desc as string,  { x: ix+0.12, y: 4.1,  w: 3.8, h: 0.65, fontSize: 10, color: MUTED, fontFace: FF, breakLine: true });
  });

  // Key note box
  s.addShape(pptx.ShapeType.roundRect, { x: 0.3, y: 5.0, w: 12.7, h: 0.75, rectRadius: 0.08, fill: { color: INDIGO_LIGHT }, line: { color: 'c4b5fd', width: 0.5 } });
  s.addText('💡  ทุก Transaction มี Audit Trail ครบ — ติดตามย้อนกลับจาก Payment → Vendor Bill → GR → PO → PR ได้ในระบบเดียว', {
    x: 0.5, y: 5.05, w: 12.4, h: 0.6, fontSize: 11, color: A2, fontFace: FF,
  });
}

// ════════════════════════════════════════════
// SLIDE 5 — SALES FLOW
// ════════════════════════════════════════════
{
  const s = pptx.addSlide(); bg(s); leftBar(s, GREEN);
  eyebrow(s, 'Business Flow · การขาย', 0.25, 0.25, GREEN);
  heading(s, 'Sales Flow — ใบเสนอราคาถึงรับชำระ');
  lead(s, 'กระบวนการขายแบบครบวงจรใน Odoo ตั้งแต่ Quotation จนถึงรับเงิน');

  const fy = 2.2;
  const nodes: [string,string,string,string,string][] = [
    ['📋','Quotation','ใบเสนอราคา', ACCENT, WHITE],
    ['✅','อนุมัติ','Approval Flow', ORANGE, ORANGE_LIGHT],
    ['📄','Sales Order\n(SO)','ใบสั่งขาย', A2, WHITE],
    ['✅','อนุมัติ SO','Approval Flow', ORANGE, ORANGE_LIGHT],
    ['🚚','GI\nตัดของออก','Goods Issue', TEAL, WHITE],
    ['🧾','Invoice','ใบแจ้งหนี้ลูกค้า', YELLOW, WHITE],
    ['💰','Receipt','รับชำระเงิน', GREEN, GREEN_LIGHT],
  ];
  const converts = [false, true, false, false, true, false];
  let fx = 0.3;
  nodes.forEach(([icon, name, sub, border, bgc], i) => {
    fnode(s, fx, fy, icon, name, sub, border, bgc);
    if (i < nodes.length - 1) {
      farrow(s, fx + 1.35, fy, converts[i] ? 'Convert' : '');
      fx += 1.35 + 0.42;
    }
  });

  const icards = [
    [ORANGE,'2 จุดอนุมัติ','Quotation และ SO ผ่านอนุมัติก่อนดำเนินการต่อ'],
    [TEAL,'GI ตัด Stock','ส่งของออก → ระบบตัดสินค้าและบันทึก Journal Entry อัตโนมัติ'],
    [GREEN,'Invoice → AR','Invoice เชื่อมบัญชีลูกหนี้และรายได้โดยอัตโนมัติ'],
  ];
  icards.forEach(([color, title, desc], i) => {
    const ix = 0.3 + i * 4.36;
    s.addShape(pptx.ShapeType.roundRect, { x: ix, y: 3.7, w: 4.1, h: 1.15, rectRadius: 0.08, fill: { color: WHITE }, line: { color: color as string, width: 1 } });
    s.addText(title as string, { x: ix+0.12, y: 3.78, w: 3.8, h: 0.28, fontSize: 12, bold: true, color: color as string, fontFace: FF });
    s.addText(desc as string,  { x: ix+0.12, y: 4.1,  w: 3.8, h: 0.65, fontSize: 10, color: MUTED, fontFace: FF, breakLine: true });
  });

  s.addShape(pptx.ShapeType.roundRect, { x: 0.3, y: 5.0, w: 12.7, h: 0.75, rectRadius: 0.08, fill: { color: GREEN_LIGHT }, line: { color: '6ee7b7', width: 0.5 } });
  s.addText('💡  Quotation → SO → GI → Invoice เชื่อมต่อกันทุก Step — ลดการบันทึกซ้ำและมี Traceability ตลอด Chain', {
    x: 0.5, y: 5.05, w: 12.4, h: 0.6, fontSize: 11, color: GREEN, fontFace: FF,
  });
}

// ════════════════════════════════════════════
// SLIDE 6 — INVENTORY TRANSFER FLOW
// ════════════════════════════════════════════
{
  const s = pptx.addSlide(); bg(s); leftBar(s, TEAL);
  eyebrow(s, 'Business Flow · การจัดการสินค้า', 0.25, 0.25, TEAL);
  heading(s, 'Inventory Transfer — โอนสินค้าระหว่าง Location');
  lead(s, 'กระบวนการโอนสินค้าภายใน รองรับ 1-Step, 2-Step หรือ 3-Step Route ตามความซับซ้อน');

  const fy = 2.2;
  const nodes6: [string,string,string,string,string][] = [
    ['📋','สร้างใบโอน\nInternal Transfer','ระบุ Source → Dest', ACCENT, WHITE],
    ['✅','อนุมัติ','Approval Flow', ORANGE, ORANGE_LIGHT],
    ['🔍','Check\nAvailability','เช็กสต็อก', TEAL, WHITE],
    ['🔄','ปรับปรุง Stock','Update Qty', A2, WHITE],
    ['✓','Validate','ยืนยัน Transfer', YELLOW, WHITE],
    ['📦','Done','Stock ปรับอัตโนมัติ', GREEN, GREEN_LIGHT],
  ];
  let fx6 = 0.7;
  nodes6.forEach(([icon, name, sub, border, bgc], i) => {
    fnode(s, fx6, fy, icon, name, sub, border, bgc);
    if (i < nodes6.length - 1) {
      farrow(s, fx6 + 1.35, fy, '');
      fx6 += 1.35 + 0.42;
    }
  });

  const icards6 = [
    [TEAL, '1-Step / 2-Step / 3-Step', 'เลือก Route ตาม Complexity — ยิ่งซับซ้อน ยิ่งควบคุมและตรวจสอบได้มากขึ้น'],
    [A2, 'Lot / Serial / Package', 'ติดตามสินค้าได้ถึงระดับ Lot หรือ Serial Number ตลอด Chain'],
    [GREEN, 'Auto Journal Entry', 'Validate → ระบบสร้าง Journal Entry บัญชีสินค้าอัตโนมัติ (Inventory Valuation)'],
  ];
  icards6.forEach(([color, title, desc], i) => {
    const ix = 0.3 + i * 4.36;
    s.addShape(pptx.ShapeType.roundRect, { x: ix, y: 3.7, w: 4.1, h: 1.15, rectRadius: 0.08, fill: { color: WHITE }, line: { color: color as string, width: 1 } });
    s.addText(title as string, { x: ix+0.12, y: 3.78, w: 3.8, h: 0.28, fontSize: 12, bold: true, color: color as string, fontFace: FF });
    s.addText(desc as string,  { x: ix+0.12, y: 4.1,  w: 3.8, h: 0.65, fontSize: 10, color: MUTED, fontFace: FF, breakLine: true });
  });

  s.addShape(pptx.ShapeType.roundRect, { x: 0.3, y: 5.0, w: 12.7, h: 0.75, rectRadius: 0.08, fill: { color: 'e0f2fe' }, line: { color: '7dd3fc', width: 0.5 } });
  s.addText('💡  Inventory Transfer มี Audit Trail ครบ — ติดตาม Stock Move ย้อนกลับได้ถึง Request ต้นทาง พร้อม Journal Entry อัตโนมัติ', {
    x: 0.5, y: 5.05, w: 12.4, h: 0.6, fontSize: 11, color: TEAL, fontFace: FF,
  });
}

// ════════════════════════════════════════════
// SLIDE 7 — STOCK REQUEST FLOW
// ════════════════════════════════════════════
{
  const s = pptx.addSlide(); bg(s); leftBar(s, ACCENT);
  eyebrow(s, 'Business Flow · การขอสินค้า');
  heading(s, 'Stock Request — ขอสินค้าจาก Warehouse');
  lead(s, 'กระบวนการขอสินค้าภายในองค์กร จากหน่วยงานที่ต้องการสู่ Warehouse ที่เก็บของ');

  const fy = 2.2;
  const nodes7: [string,string,string,string,string][] = [
    ['📝','Stock\nRequest','ขอของ', ACCENT, WHITE],
    ['✅','อนุมัติ','Approval Flow', ORANGE, ORANGE_LIGHT],
    ['📋','Internal\nTransfer','สร้างอัตโนมัติ', A2, WHITE],
    ['🔍','Check\nAvailability','เช็กสต็อก', TEAL, WHITE],
    ['🔄','Pick / ยกของ','จัด Stock', ORANGE, WHITE],
    ['🤝','รับของ','Delivery / Done', GREEN, GREEN_LIGHT],
  ];
  const conv7 = [false, true, false, false, false];
  let fx7 = 0.7;
  nodes7.forEach(([icon, name, sub, border, bgc], i) => {
    fnode(s, fx7, fy, icon, name, sub, border, bgc);
    if (i < nodes7.length - 1) {
      farrow(s, fx7 + 1.35, fy, conv7[i] ? 'Auto Create' : '');
      fx7 += 1.35 + 0.42;
    }
  });

  const icards7 = [
    [ACCENT, 'Transfer อัตโนมัติ', 'เมื่ออนุมัติ Request → ระบบสร้าง Internal Transfer ให้อัตโนมัติ ไม่ต้องบันทึกซ้ำ'],
    [TEAL, 'ติดตามสถานะได้', 'ผู้ขอดูสถานะ Request ได้ตลอด — รออนุมัติ, กำลังจัด, ส่งแล้ว'],
    [GREEN, 'บันทึกย้อนหลัง', 'Request → Transfer → Stock Move เชื่อมกันครบ ตรวจสอบย้อนหลังได้'],
  ];
  icards7.forEach(([color, title, desc], i) => {
    const ix = 0.3 + i * 4.36;
    s.addShape(pptx.ShapeType.roundRect, { x: ix, y: 3.7, w: 4.1, h: 1.15, rectRadius: 0.08, fill: { color: WHITE }, line: { color: color as string, width: 1 } });
    s.addText(title as string, { x: ix+0.12, y: 3.78, w: 3.8, h: 0.28, fontSize: 12, bold: true, color: color as string, fontFace: FF });
    s.addText(desc as string,  { x: ix+0.12, y: 4.1,  w: 3.8, h: 0.65, fontSize: 10, color: MUTED, fontFace: FF, breakLine: true });
  });

  s.addShape(pptx.ShapeType.roundRect, { x: 0.3, y: 5.0, w: 12.7, h: 0.75, rectRadius: 0.08, fill: { color: INDIGO_LIGHT }, line: { color: 'c4b5fd', width: 0.5 } });
  s.addText('💡  Stock Request เชื่อมกับ Inventory Transfer — ตรวจสอบย้อนกลับได้ครบ Chain ลดการบันทึกซ้ำ และผู้ขอติดตามสถานะได้ตลอดเวลา', {
    x: 0.5, y: 5.05, w: 12.4, h: 0.6, fontSize: 11, color: ACCENT, fontFace: FF,
  });
}

// ════════════════════════════════════════════
// SLIDE 8 — INVENTORY OPERATIONS
// ════════════════════════════════════════════
{
  const s = pptx.addSlide(); bg(s); leftBar(s, A2);
  eyebrow(s, 'Business Flow · การจัดการสินค้าเพิ่มเติม');
  heading(s, 'Inventory Operations — Adjust / Landed Cost / Scrap / Fiscal Count');
  lead(s, 'กระบวนการปฏิบัติการด้านสินค้าคงคลังที่สำคัญนอกเหนือจาก Transfer');

  const ops = [
    { icon:'📊', label:'Adjust Stock — ปรับสต็อก', color: A2,
      flow:'Inventory → กำหนด Qty จริง → Validate → JE อัตโนมัติ',
      desc:'ปรับ Qty ให้ตรงกับของจริง — ระบบสร้าง Journal Entry บัญชีสินค้าอัตโนมัติ สามารถระบุ Reason ของการปรับได้' },
    { icon:'🧾', label:'Landed Cost — ต้นทุนนำเข้า', color: TEAL,
      flow:'GR → Vendor Bill → เพิ่ม Landed Cost → Validate → Allocate',
      desc:'บันทึกค่าใช้จ่ายเพิ่มเติม (Freight, Duty, Insurance) แล้ว Allocate ต้นทุนไปยังสินค้าแต่ละรายการอัตโนมัติ' },
    { icon:'🗑️', label:'Scrap — ตัดของเสีย', color: RED,
      flow:'สร้าง Scrap Order → Product + Qty + เหตุผล → Validate',
      desc:'ตัดสินค้าที่เสียหายหรือหมดอายุออกจากระบบ — Stock ลดลง พร้อม JE บันทึกค่าของเสียไปบัญชี Loss' },
    { icon:'📋', label:'Fiscal Count — นับสต็อกประจำรอบ', color: GREEN,
      flow:'เปิด Count → กำหนด Date → นับของจริง → Validate → ปรับอัตโนมัติ',
      desc:'Physical Inventory Count ตามรอบบัญชี — เปรียบเทียบ Qty จริงกับระบบ แล้ว Validate ให้ระบบปรับ Stock และสร้าง JE อัตโนมัติ' },
  ];

  ops.forEach((op, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const cx = 0.25 + col * 6.55, cy = 1.75 + row * 2.3;
    s.addShape(pptx.ShapeType.roundRect, { x: cx, y: cy, w: 6.3, h: 2.15, rectRadius: 0.1, fill: { color: WHITE }, line: { color: BORDER, width: 0.5 } });
    s.addText(`${op.icon}  ${op.label}`, { x: cx+0.12, y: cy+0.1, w: 6.0, h: 0.28, fontSize: 10, bold: true, color: MUTED, fontFace: FF, charSpacing: 0.5 });
    s.addText(op.flow, { x: cx+0.12, y: cy+0.42, w: 6.0, h: 0.35, fontSize: 11, bold: true, color: op.color, fontFace: FF, breakLine: true });
    s.addText(op.desc, { x: cx+0.12, y: cy+0.82, w: 6.0, h: 1.2, fontSize: 10, color: MUTED, fontFace: FF, breakLine: true });
  });

  s.addShape(pptx.ShapeType.roundRect, { x: 0.25, y: 6.45, w: 12.8, h: 0.65, rectRadius: 0.08, fill: { color: INDIGO_LIGHT }, line: { color: 'c4b5fd', width: 0.5 } });
  s.addText('ทุก Operation มี Audit Trail — บันทึก User, วันที่, เหตุผล และ Journal Entry ที่เกี่ยวข้อง ตรวจสอบย้อนหลังได้ครบถ้วน', {
    x: 0.45, y: 6.52, w: 12.3, h: 0.55, fontSize: 11, bold: true, color: ACCENT, fontFace: FF, align: 'center',
  });
}

// ════════════════════════════════════════════
// SLIDE 9 — PROS & CONS
// ════════════════════════════════════════════
{
  const s = pptx.addSlide(); bg(s); leftBar(s, YELLOW);
  eyebrow(s, '03 · ข้อดี ข้อเสีย และข้อจำกัด', 0.25, 0.25, YELLOW);
  heading(s, 'จุดแข็งและข้อจำกัดของ Odoo Community');

  // PRO column
  s.addShape(pptx.ShapeType.roundRect, { x: 0.25, y: 1.55, w: 6.2, h: 4.5, rectRadius: 0.1, fill: { color: 'ecfdf5' }, line: { color: '6ee7b7', width: 1 } });
  s.addText('✅  จุดแข็ง', { x: 0.45, y: 1.7, w: 5.8, h: 0.3, fontSize: 11, bold: true, color: GREEN, fontFace: FF, charSpacing: 1 });
  bullet(s, [
    'Module Integration — ข้อมูลไหลต่อเนื่อง Purchase → Accounting อัตโนมัติ',
    'Multi-company — หลายบริษัทบน Platform เดียว แยก Data/Permission ได้',
    'Customization — เพิ่ม Field, Workflow, API ได้รวดเร็ว',
    'Standard UI — List, Search, Filter, Export ใช้ได้ทันที',
    'Traceability — ติดตาม Transaction ย้อนกลับได้ตลอด Chain',
  ], 0.45, 2.08, 5.9, GREEN);

  // CON column
  s.addShape(pptx.ShapeType.roundRect, { x: 6.85, y: 1.55, w: 6.2, h: 4.5, rectRadius: 0.1, fill: { color: 'fffbeb' }, line: { color: 'fcd34d', width: 1 } });
  s.addText('⚠️  ข้อจำกัด', { x: 7.05, y: 1.7, w: 5.8, h: 0.3, fontSize: 11, bold: true, color: ORANGE, fontFace: FF, charSpacing: 1 });
  bullet(s, [
    'Customize = Effort — ยิ่ง Customize มาก ยิ่งใช้ Effort ดูแล-Upgrade มากขึ้น',
    'Community vs Enterprise — บาง Feature ไม่มีใน Community Edition',
    'Thai Localization — WHT, รูปแบบเอกสาร ไม่ได้ครบใน Core',
    'Upgrade ยากขึ้น — Custom Module มาก การ Upgrade Version ยิ่งซับซ้อน',
    'ต้องมีทีมดูแล — Business + Dev + Infra ต้องพร้อมตลอด',
  ], 7.05, 2.08, 5.9, ORANGE);

  // Bottom note
  s.addShape(pptx.ShapeType.roundRect, { x: 0.25, y: 6.2, w: 12.8, h: 0.65, rectRadius: 0.08, fill: { color: ORANGE_LIGHT }, line: { color: 'fcd34d', width: 0.5 } });
  s.addText('แนวทาง CAD: พยายามใช้ Core Odoo ให้มากที่สุด และ Customize เฉพาะส่วนที่เป็น Requirement สำคัญจริงๆ เพื่อควบคุม Effort ระยะยาว', {
    x: 0.45, y: 6.25, w: 12.4, h: 0.55, fontSize: 11, color: YELLOW, fontFace: FF, bold: true,
  });
}

// ════════════════════════════════════════════
// SLIDE 7 — COMPANY SIZING
// ════════════════════════════════════════════
{
  const s = pptx.addSlide(); bg(s); leftBar(s, TEAL);
  eyebrow(s, '04 · Company Sizing ที่เหมาะสม', 0.25, 0.25, TEAL);
  heading(s, 'Odoo เหมาะกับองค์กรประเภทใด');

  const sizing = [
    { icon:'🏢', title:'บริษัทขนาดเล็ก', tag:'เริ่มได้เลย', tagBg: GREEN_LIGHT, tagFg: GREEN, tagBorder:'6ee7b7',
      desc:'เริ่มจาก Module จำเป็นก่อน Purchase, Sales, Inventory, Accounting แล้วขยายทีหลัง', border: GREEN },
    { icon:'🏭', title:'บริษัทขนาดกลาง', tag:'เหมาะมาก', tagBg: INDIGO_LIGHT, tagFg: A2, tagBorder:'c4b5fd',
      desc:'รองรับ Process ซับซ้อน Multi-company, Approval, Integration และ Reporting — ต้องบริหาร Requirement อย่างเป็นระบบ', border: ACCENT },
    { icon:'🏗️', title:'Multi-company Platform', tag:'ต้องควบคุม', tagBg: ORANGE_LIGHT, tagFg: ORANGE, tagBorder:'fcd34d',
      desc:'ใช้เป็น Shared Platform ได้ แต่แต่ละบริษัทควรยอมรับ Standard Process ร่วมกันให้มากที่สุด', border: ORANGE },
  ];
  sizing.forEach((c, i) => {
    const cx = 0.3 + i * 4.36;
    s.addShape(pptx.ShapeType.roundRect, { x: cx, y: 1.6, w: 4.1, h: 4.0, rectRadius: 0.1, fill: { color: WHITE }, line: { color: c.border, width: 1 } });
    s.addText(c.icon, { x: cx, y: 1.75, w: 4.1, h: 0.6, fontSize: 28, align: 'center' });
    s.addText(c.title, { x: cx+0.12, y: 2.42, w: 3.8, h: 0.35, fontSize: 13, bold: true, color: TEXT, fontFace: FF, align: 'center' });
    // tag
    s.addShape(pptx.ShapeType.roundRect, { x: cx+0.8, y: 2.85, w: 2.5, h: 0.27, rectRadius: 0.13, fill: { color: c.tagBg }, line: { color: c.tagBorder, width: 0.5 } });
    s.addText(c.tag, { x: cx+0.8, y: 2.85, w: 2.5, h: 0.27, fontSize: 9, bold: true, color: c.tagFg, fontFace: FF, align: 'center' });
    s.addText(c.desc, { x: cx+0.12, y: 3.2, w: 3.8, h: 2.2, fontSize: 10, color: MUTED, fontFace: FF, breakLine: true });
  });

  // Warning
  s.addShape(pptx.ShapeType.roundRect, { x: 0.3, y: 5.75, w: 12.7, h: 0.7, rectRadius: 0.08, fill: { color: RED_LIGHT }, line: { color: 'fca5a5', width: 0.5 } });
  s.addText('⚠️  ระวัง: หากทุกบริษัทต้องการ Process และหน้าจอเฉพาะของตนเองทั้งหมด ความซับซ้อนและต้นทุนการดูแลจะเพิ่มขึ้นอย่างรวดเร็ว', {
    x: 0.5, y: 5.82, w: 12.3, h: 0.55, fontSize: 11, color: RED, fontFace: FF,
  });
}

// ════════════════════════════════════════════
// SLIDE 8 — WHAT WORKS & WHAT NEEDS CUSTOM
// ════════════════════════════════════════════
{
  const s = pptx.addSlide(); bg(s); leftBar(s, A2);
  eyebrow(s, '05 · สิ่งที่ทำได้ดี และส่วนที่ต้อง Customize');
  heading(s, 'Core ทำได้ดี vs สิ่งที่ CAD ต้องพัฒนาเพิ่ม');

  s.addText('✅  Odoo Core ทำได้ดีกว่าที่คาด', { x: 0.25, y: 1.5, w: 6, h: 0.3, fontSize: 12, bold: true, color: GREEN, fontFace: FF });
  bullet(s, [
    'Workflow เชื่อม Module — PO → GR → Bill → Payment',
    'Multi-company ในระบบเดียว',
    'Standard UI: List, Search, Filter, Group By, Export',
    'Journal Entry สร้างอัตโนมัติจากเอกสาร',
    'Scheduled Job & API Extension',
  ], 0.25, 1.85, 6.2, GREEN);

  s.addText('🔧  ส่วนที่ CAD ต้อง Customize มาก', { x: 6.8, y: 1.5, w: 6, h: 0.3, fontSize: 12, bold: true, color: ORANGE, fontFace: FF });
  const customTags = ['Accounting & Tax','Payment & Bank Integration','Approval Flow','Budget Control','Financial Reporting','Security & User Role','External Integration'];
  let tx = 6.8, ty = 1.88;
  customTags.forEach(t => {
    const tw = t.length * 0.072 + 0.24;
    if (tx + tw > 13.0) { tx = 6.8; ty += 0.38; }
    tag(s, t, tx, ty, ORANGE, ORANGE_LIGHT, 'fcd34d');
    tx += tw + 0.1;
  });

  s.addText('🇹🇭  Thai Localization', { x: 6.8, y: 3.2, w: 6, h: 0.3, fontSize: 12, bold: true, color: YELLOW, fontFace: FF });
  bullet(s, [
    'ภาษีหัก ณ ที่จ่าย (WHT) ไม่ครบใน Core Community',
    'รูปแบบเอกสารภาษีตาม Requirement ไทย',
    'ทางเลือก: พัฒนาเอง หรือใช้ Partner Localization',
  ], 6.8, 3.55, 6.2, YELLOW);

  s.addShape(pptx.ShapeType.roundRect, { x: 0.25, y: 5.2, w: 12.8, h: 0.8, rectRadius: 0.08, fill: { color: INDIGO_LIGHT }, line: { color: 'c4b5fd', width: 0.5 } });
  s.addText('ทุก Customization ต้องใช้ Effort ตั้งแต่ Requirement → Design → Dev → SIT → UAT → Deployment → Maintenance → Regression Test', {
    x: 0.45, y: 5.28, w: 12.3, h: 0.65, fontSize: 11, color: ACCENT, fontFace: FF, breakLine: true,
  });
}

// ════════════════════════════════════════════
// SLIDE 9 — INTEGRATION
// ════════════════════════════════════════════
{
  const s = pptx.addSlide(); bg(s); leftBar(s, TEAL);
  eyebrow(s, '06 · Integration กับระบบของ CAD', 0.25, 0.25, TEAL);
  heading(s, 'Odoo เชื่อมต่อกับ Ecosystem ของ CAD');

  // Left — systems sending data IN
  s.addText('ระบบที่ส่งข้อมูลเข้า Odoo', { x: 0.2, y: 1.55, w: 4.5, h: 0.28, fontSize: 10, bold: true, color: MUTED, fontFace: FF, charSpacing: 1 });
  const inSys = [['💰','AllPay — Payment Platform'],['📐','AFMS / TFRS 9 / SCG Lease'],['🔗','eDIT']];
  inSys.forEach(([ic, name], i) => {
    s.addShape(pptx.ShapeType.roundRect, { x: 0.2, y: 1.9+i*0.75, w: 4.5, h: 0.65, rectRadius: 0.07, fill: { color: WHITE }, line: { color: BORDER, width: 0.5 } });
    s.addText(`${ic}  ${name}`, { x: 0.35, y: 1.98+i*0.75, w: 4.2, h: 0.45, fontSize: 11, color: TEXT, fontFace: FF });
  });

  // Center — Odoo box
  s.addShape(pptx.ShapeType.roundRect, { x: 5.1, y: 1.55, w: 3.2, h: 4.9, rectRadius: 0.12, fill: { color: INDIGO_LIGHT }, line: { color: ACCENT, width: 2 } });
  s.addText('🟣', { x: 5.1, y: 1.75, w: 3.2, h: 0.55, fontSize: 28, align: 'center' });
  s.addText('Odoo ERP', { x: 5.1, y: 2.35, w: 3.2, h: 0.35, fontSize: 14, bold: true, color: ACCENT, fontFace: FF, align: 'center' });
  s.addText('Transaction &\nProcess Core', { x: 5.1, y: 2.72, w: 3.2, h: 0.45, fontSize: 10, color: A2, fontFace: FF, align: 'center', breakLine: true });
  ['API / Web Service','File Interface','FTP / SFTP','Scheduled Job','DB View / Batch'].forEach((t, i) => {
    s.addText(`• ${t}`, { x: 5.2, y: 3.28+i*0.3, w: 3.0, h: 0.28, fontSize: 9, color: MUTED, fontFace: FF, align: 'center' });
  });

  // Right — systems receiving data OUT
  s.addText('ระบบที่รับข้อมูลออกจาก Odoo', { x: 8.65, y: 1.55, w: 4.5, h: 0.28, fontSize: 10, bold: true, color: MUTED, fontFace: FF, charSpacing: 1 });
  const outSys = [['📈','BPC FI — Financial Consolidation'],['📋','Managerial Report'],['🔗','CAD2Link'],['🏦','SCB Business Anywhere']];
  outSys.forEach(([ic, name], i) => {
    s.addShape(pptx.ShapeType.roundRect, { x: 8.65, y: 1.9+i*0.75, w: 4.5, h: 0.65, rectRadius: 0.07, fill: { color: WHITE }, line: { color: BORDER, width: 0.5 } });
    s.addText(`${ic}  ${name}`, { x: 8.8, y: 1.98+i*0.75, w: 4.2, h: 0.45, fontSize: 11, color: TEXT, fontFace: FF });
  });

  s.addShape(pptx.ShapeType.roundRect, { x: 0.2, y: 6.55, w: 12.9, h: 0.7, rectRadius: 0.08, fill: { color: 'e0f2fe' }, line: { color: '7dd3fc', width: 0.5 } });
  s.addText('แนวทางต่อ: ไม่ควรเพิ่ม Point-to-Point Integration ไปเรื่อยๆ → ควรมี Data Lake / Data Platform กลาง พร้อม Data Owner, Definition และสิทธิ์เข้าถึงที่ชัดเจน', {
    x: 0.4, y: 6.6, w: 12.5, h: 0.6, fontSize: 11, color: TEAL, fontFace: FF, breakLine: true,
  });
}

// ════════════════════════════════════════════
// SLIDE 10 — DATA PLATFORM
// ════════════════════════════════════════════
{
  const s = pptx.addSlide(); bg(s); leftBar(s, A2);
  eyebrow(s, '06 (ต่อ) · Data Platform Architecture');
  heading(s, 'จาก ERP สู่ Data Platform');
  lead(s, 'Odoo = Transaction System | Data Platform = Analytics & Automation Layer');

  s.addText('ทำไมต้องมี Data Platform กลาง?', { x: 0.25, y: 1.75, w: 6, h: 0.3, fontSize: 13, bold: true, color: A2, fontFace: FF });
  bullet(s, [
    'ป้องกัน Report/App ดึงข้อมูลจาก Production ERP โดยตรง',
    'ข้อมูลชุดเดียวกันใช้ได้หลายมุม',
    'กำหนด Data Owner & Governance ชัดเจน',
    'ควบคุม Refresh Frequency และสิทธิ์เข้าถึง',
  ], 0.25, 2.1, 6.0);

  s.addText('Data Source', { x: 0.25, y: 3.85, w: 6, h: 0.3, fontSize: 13, bold: true, color: A2, fontFace: FF });
  ['Odoo ERP','AllPay','CAD2Link','eDIT'].forEach((t, i) => {
    tag(s, t, 0.25 + (i % 3) * 2.1, 4.22 + Math.floor(i / 3) * 0.42);
  });

  s.addText('นำข้อมูลไปใช้ต่อ', { x: 6.8, y: 1.75, w: 6.2, h: 0.3, fontSize: 13, bold: true, color: A2, fontFace: FF });
  const uses = [
    ['📊', 'Reporting', 'Financial, Management, BPC FI', GREEN],
    ['🎯', 'Dashboard', 'KPI, Real-time Monitoring', TEAL],
    ['🔬', 'Analytics', 'Data Analysis, Trend', A2],
    ['🤖', 'AI / ML', 'Prediction, Anomaly Detection', ACCENT],
    ['⚡', 'Automation', 'Process Trigger, Reconciliation', ORANGE],
    ['🔍', 'Audit', 'Compliance, Process Monitoring', RED],
  ];
  uses.forEach(([icon, title, desc, color], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const cx = 6.8 + col * 3.15, cy = 2.12 + row * 1.4;
    s.addShape(pptx.ShapeType.roundRect, { x: cx, y: cy, w: 3.0, h: 1.3, rectRadius: 0.08, fill: { color: WHITE }, line: { color: BORDER, width: 0.5 } });
    s.addText(`${icon}  ${title}`, { x: cx+0.1, y: cy+0.1, w: 2.8, h: 0.32, fontSize: 12, bold: true, color: color as string, fontFace: FF });
    s.addText(desc as string, { x: cx+0.1, y: cy+0.45, w: 2.8, h: 0.7, fontSize: 10, color: MUTED, fontFace: FF, breakLine: true });
  });
}

// ════════════════════════════════════════════
// SLIDE 11 — AI
// ════════════════════════════════════════════
{
  const s = pptx.addSlide(); bg(s); leftBar(s, ACCENT);
  eyebrow(s, '07 · AI กับ Odoo');
  heading(s, 'แนวทาง AI ที่ CAD ศึกษาอยู่');

  const aiCards = [
    { icon:'🤖', title:'Odoo AI Agent', items:['สอบถามข้อมูลด้วยภาษาธรรมชาติ','เอกสารอยู่ในสถานะใด?','รายการใดรออนุมัติ?','Project ใดมีค่าใช้จ่ายสูง?','ช่วยสร้าง Filter / SQL Query'] },
    { icon:'📄', title:'Document AI (DocuMind)', items:['OCR อ่าน Invoice, Receipt, เอกสาร','นำข้อมูลเข้าระบบอัตโนมัติ','ลดการ Key ข้อมูล Manual','ลด Error จากงาน Data Entry','Ref: Odoo Enterprise Digitization'] },
    { icon:'💬', title:'Chat / Voice Interface', items:['เข้าถึงข้อมูล ERP โดยไม่ต้องเปิดเมนู','สรุป Requirement, วิเคราะห์ Gap','สร้าง Test Case, จัดกลุ่ม Issue','ช่วยเขียน SQL และตรวจ Code','Copilot สำหรับงานโครงการ'] },
  ];
  aiCards.forEach((card, i) => {
    const cx = 0.25 + i * 4.35;
    s.addShape(pptx.ShapeType.roundRect, { x: cx, y: 1.55, w: 4.1, h: 4.4, rectRadius: 0.1, fill: { color: WHITE }, line: { color: BORDER, width: 0.5 } });
    s.addText(card.icon, { x: cx, y: 1.7, w: 4.1, h: 0.5, fontSize: 26, align: 'center' });
    s.addText(card.title, { x: cx+0.1, y: 2.27, w: 3.9, h: 0.35, fontSize: 12, bold: true, color: A2, fontFace: FF, align: 'center' });
    card.items.forEach((item, j) => {
      s.addText(`› ${item}`, { x: cx+0.15, y: 2.72+j*0.44, w: 3.8, h: 0.4, fontSize: 10, color: MUTED, fontFace: FF });
    });
  });

  // Warning box
  s.addShape(pptx.ShapeType.roundRect, { x: 0.25, y: 6.05, w: 12.8, h: 0.7, rectRadius: 0.08, fill: { color: RED_LIGHT }, line: { color: 'fca5a5', width: 0.5 } });
  s.addText('🛡️  ต้องควบคุมเสมอ: Data Privacy · User Permission · Accuracy · Audit Trail · ป้องกัน AI เข้าถึงเกินสิทธิ์ · คนอนุมัติก่อนบันทึกจริง', {
    x: 0.45, y: 6.12, w: 12.3, h: 0.55, fontSize: 11, color: RED, fontFace: FF,
  });

  s.addText('แนวทางเริ่มต้น: ให้ AI เป็น Copilot ก่อน — ช่วยค้นหา สรุป วิเคราะห์ เสนอแนะ โดยยังให้คนตรวจสอบและอนุมัติ', {
    x: 0.25, y: 6.82, w: 12.8, h: 0.3, fontSize: 11, bold: true, color: ACCENT, fontFace: FF,
  });
}

// ════════════════════════════════════════════
// SLIDE 12 — EXECUTIVE SUMMARY
// ════════════════════════════════════════════
{
  const s = pptx.addSlide(); bg(s); leftBar(s, GREEN);
  eyebrow(s, '08 · สรุปสำหรับผู้บริหาร', 0.25, 0.25, GREEN);
  heading(s, 'Odoo สามารถเป็น ERP Platform ที่ดีได้');
  s.addText('แต่ความสำเร็จต้องอาศัยมากกว่า Software', { x: 0.25, y: 1.45, w: 12, h: 0.35, fontSize: 16, color: MUTED, fontFace: FF });

  const sumCards = [
    ['1', 'ใช้ Core Odoo ให้มากที่สุด', 'ควบคุม Customization ลดผลกระทบต่อ Upgrade ในอนาคต'],
    ['2', 'กำหนด Standard Process ร่วมกัน', 'โดยเฉพาะกรณีหลายบริษัทใช้ Platform เดียวกัน'],
    ['3', 'เตรียม Integration Architecture & Data Platform กลาง', 'ข้อมูลจาก ERP และ Application ต่างๆ นำไปใช้ต่อ Reporting, Analytics, Automation ได้อย่างเป็นระบบ'],
    ['4', 'นำ AI เริ่มจากบทบาทผู้ช่วย (Copilot)', 'ค้นหา สรุป วิเคราะห์ ลดงาน Manual ก่อนขยายสู่ Automation'],
  ];
  sumCards.forEach(([num, title, desc], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const cx = 0.25 + col * 6.55, cy = 2.0 + row * 2.1;
    s.addShape(pptx.ShapeType.roundRect, { x: cx, y: cy, w: 6.3, h: 1.95, rectRadius: 0.1, fill: { color: WHITE }, line: { color: BORDER, width: 0.5 } });
    s.addShape(pptx.ShapeType.ellipse, { x: cx+0.15, y: cy+0.15, w: 0.45, h: 0.45, fill: { color: ACCENT }, line: { color: ACCENT } });
    s.addText(num, { x: cx+0.15, y: cy+0.15, w: 0.45, h: 0.45, fontSize: 13, bold: true, color: WHITE, fontFace: FF, align: 'center', valign: 'middle' });
    s.addText(title, { x: cx+0.75, y: cy+0.15, w: 5.4, h: 0.4, fontSize: 13, bold: true, color: TEXT, fontFace: FF });
    s.addText(desc, { x: cx+0.75, y: cy+0.6, w: 5.4, h: 1.2, fontSize: 11, color: MUTED, fontFace: FF, breakLine: true });
  });

  s.addShape(pptx.ShapeType.roundRect, { x: 0.25, y: 6.28, w: 12.8, h: 0.65, rectRadius: 0.08, fill: { color: INDIGO_LIGHT }, line: { color: 'c4b5fd', width: 0.5 } });
  s.addText('ความสำเร็จต้องมีทั้ง   Standard Process · Data Governance · ทีมดูแล · Roadmap ที่ชัดเจน', {
    x: 0.45, y: 6.34, w: 12.3, h: 0.55, fontSize: 13, bold: true, color: ACCENT, fontFace: FF, align: 'center',
  });
}

// ── Write ──
pptx.writeFile({ fileName: OUT }).then(() => {
  console.log(`✓ Saved: ${OUT}`);
}).catch((e: Error) => { console.error(e); process.exit(1); });
