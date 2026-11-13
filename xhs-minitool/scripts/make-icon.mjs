/**
 * 生成小工具图标：512×512 PNG（纯 Node 标准库，无第三方依赖）。
 * 设计：深色底 + emerald 菱形（呼应网页版品牌符号 ◆）。
 */
import fs from "fs";
import path from "path";
import zlib from "zlib";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SIZE = 512;
const OUT = path.resolve(__dirname, "..", "release");
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

let table = null;
function crc32(buf) {
  if (!table) {
    table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}

const px = Buffer.alloc(SIZE * SIZE * 4);
const c = SIZE / 2;

function set(x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
  const i = (y * SIZE + x) * 4;
  px[i] = r;
  px[i + 1] = g;
  px[i + 2] = b;
  px[i + 3] = a;
}

function roundedRectFill(x0, y0, x1, y1, rad, r, g, b, a) {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      // 圆角判定
      let inside = true;
      const cx = x < x0 + rad ? x0 + rad : x > x1 - rad ? x1 - rad : x;
      const cy = y < y0 + rad ? y0 + rad : y > y1 - rad ? y1 - rad : y;
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy > rad * rad) inside = false;
      if (inside) set(x, y, r, g, b, a);
    }
  }
}

function diamondFill(rOut, rIn, r, g, b, a) {
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const d = Math.abs(x - c) + Math.abs(y - c);
      // 抗锯齿：用 1px 软边
      if (d <= rOut - 1) {
        if (d < rIn) continue;
        set(x, y, r, g, b, a);
      } else if (d <= rOut) {
        set(x, y, r, g, b, Math.round(a * 0.6));
      }
    }
  }
}

// 背景（深色）
roundedRectFill(0, 0, SIZE, SIZE, 96, 2, 6, 23, 255);
// 内嵌面板
roundedRectFill(40, 40, SIZE - 40, SIZE - 40, 88, 15, 23, 42, 255);
// emerald 菱形环
diamondFill(196, 96, 16, 185, 129, 255);
// 中心实心小菱形
diamondFill(84, 0, 52, 211, 153, 255);

// 组装 PNG
const raw = Buffer.alloc((SIZE * 4 + 1) * SIZE);
for (let y = 0; y < SIZE; y++) {
  raw[y * (SIZE * 4 + 1)] = 0;
  px.copy(raw, y * (SIZE * 4 + 1) + 1, y * SIZE * 4, (y + 1) * SIZE * 4);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // RGBA
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);

const file = path.join(OUT, "icon-512.png");
fs.writeFileSync(file, png);
console.log("[icon] " + file + " (" + (png.length / 1024).toFixed(1) + " KB, 512x512)");
