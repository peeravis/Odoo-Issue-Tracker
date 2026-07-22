import { createCanvas } from "@napi-rs/canvas";

function toArrayBuffer(buf: Uint8Array): ArrayBuffer {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

export function drawBarChart({
  title,
  labels,
  values,
  colors,
  total,
  width = 640,
  height = 320,
}: {
  title: string;
  labels: string[];
  values: number[];
  colors: string[];
  total?: number;
  width?: number;
  height?: number;
}): ArrayBuffer {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  const pad = { top: 54, right: 20, bottom: 76, left: 48 };
  const cw = width - pad.left - pad.right;
  const ch = height - pad.top - pad.bottom;

  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(8, 8, width - 16, height - 16);

  ctx.fillStyle = "#1e293b";
  ctx.font = "bold 13px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(title, width / 2, 32);

  const maxVal = Math.max(...values, 1);
  const steps = 5;
  const stepVal = Math.ceil(maxVal / steps) || 1;
  const yMax = stepVal * steps;

  for (let i = 0; i <= steps; i++) {
    const v = stepVal * i;
    const y = pad.top + ch - (v / yMax) * ch;
    ctx.strokeStyle = "#f1f5f9";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + cw, y);
    ctx.stroke();
    ctx.fillStyle = "#94a3b8";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(String(v), pad.left - 6, y + 4);
  }

  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top + ch);
  ctx.lineTo(pad.left + cw, pad.top + ch);
  ctx.stroke();

  const n = labels.length;
  const slotW = cw / n;
  const barW = Math.min(slotW * 0.55, 60);

  labels.forEach((label, i) => {
    const val = values[i] ?? 0;
    const barH = val > 0 ? (val / yMax) * ch : 0;
    const x = pad.left + slotW * i + (slotW - barW) / 2;
    const y = pad.top + ch - barH;
    const color = colors[i] ?? "#94a3b8";

    if (barH > 0) {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, barW, barH);
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillRect(x, y, barW, Math.min(barH, 5));
    }

    if (val > 0) {
      const showPct = total && total > 0;
      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(String(val), x + barW / 2, y - (showPct ? 18 : 7));
      if (showPct) {
        ctx.fillStyle = "#64748b";
        ctx.font = "10px sans-serif";
        ctx.fillText(`${Math.round((val / total!) * 100)}%`, x + barW / 2, y - 6);
      }
    }

    ctx.fillStyle = "#475569";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    const ly = pad.top + ch + 14;
    const words = label.split(" ");
    if (words.length > 1 && label.length > 12) {
      const mid = Math.ceil(words.length / 2);
      ctx.fillText(words.slice(0, mid).join(" "), x + barW / 2, ly);
      ctx.fillText(words.slice(mid).join(" "), x + barW / 2, ly + 13);
    } else {
      ctx.fillText(label, x + barW / 2, ly);
    }
  });

  return toArrayBuffer(canvas.toBuffer("image/png") as Buffer);
}

export function drawDonutChart({
  title,
  labels,
  values,
  colors,
  width = 500,
  height = 280,
}: {
  title: string;
  labels: string[];
  values: number[];
  colors: string[];
  width?: number;
  height?: number;
}): ArrayBuffer {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(8, 8, width - 16, height - 16);

  ctx.fillStyle = "#1e293b";
  ctx.font = "bold 13px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(title, width / 2, 30);

  const total = values.reduce((a, b) => a + b, 0);
  if (total === 0) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("No data", width / 2, height / 2);
    return toArrayBuffer(canvas.toBuffer("image/png") as Uint8Array);
  }

  const cx = 140;
  const cy = height / 2 + 14;
  const r = 90;

  let angle = -Math.PI / 2;
  values.forEach((val, i) => {
    if (val === 0) return;
    const sweep = (val / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, angle, angle + sweep);
    ctx.closePath();
    ctx.fillStyle = colors[i] ?? "#94a3b8";
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2.5;
    ctx.stroke();
    angle += sweep;
  });

  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.52, 0, 2 * Math.PI);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  ctx.fillStyle = "#1e293b";
  ctx.font = "bold 19px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(String(total), cx, cy + 7);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "10px sans-serif";
  ctx.fillText("total", cx, cy + 20);

  const lx = cx * 2 + 14;
  let ly = 52;
  const items = labels
    .map((l, i) => ({ l, v: values[i], c: colors[i] }))
    .filter((x) => x.v > 0);
  const itemH = Math.min(36, (height - 62) / Math.max(items.length, 1));

  items.forEach(({ l, v, c }) => {
    const pct = Math.round((v / total) * 100);
    ctx.fillStyle = c ?? "#94a3b8";
    ctx.fillRect(lx, ly - 9, 11, 11);
    ctx.fillStyle = "#374151";
    ctx.font = "11px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(l, lx + 16, ly);
    ctx.fillStyle = "#6b7280";
    ctx.font = "10px sans-serif";
    ctx.fillText(`${v}  ·  ${pct}%`, lx + 16, ly + 13);
    ly += itemH;
  });

  return toArrayBuffer(canvas.toBuffer("image/png") as Uint8Array);
}
