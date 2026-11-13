/**
 * 打包：把 dist 内容压成可上传的 zip（deflate）。
 * 关键：压缩的是 dist「目录内的内容」，不是 dist 目录本身，
 * 否则解压后多一层目录、index.html 不在根，容器无法加载。
 * 使用 Node 标准库（zlib deflateRaw），不依赖外部 zip 命令。
 */
import fs from "fs";
import path from "path";
import zlib from "zlib";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");
const out = path.join(root, "release");
const version = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf-8")).version;
const zipName = "codelex-xhs-v" + version + ".zip";

if (!fs.existsSync(dist)) {
  console.error("dist 不存在，请先 npm run build");
  process.exit(1);
}
if (!fs.existsSync(path.join(dist, "index.html"))) {
  console.error("dist/index.html 不存在，入口必须在根目录");
  process.exit(1);
}
if (!fs.existsSync(out)) fs.mkdirSync(out, { recursive: true });
const zipPath = path.join(out, zipName);
if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

/* CRC32 */
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

/* 收集文件（剔除开发垃圾） */
const BAD = [".DS_Store", "Thumbs.db"];
const files = [];
(function walk(d, base) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, base + e.name + "/");
    else if (BAD.indexOf(e.name) < 0 && !/\.map$/.test(e.name)) files.push({ name: base + e.name, full: p });
  }
})(dist, "");

const chunks = [];
const central = [];
let offset = 0;
let rawTotal = 0;

for (const f of files) {
  const raw = fs.readFileSync(f.full);
  rawTotal += raw.length;
  // 文本用 deflate；已压缩的二进制（png 等）直接 store
  const isText = /\.(html|css|js|json|svg)$/i.test(f.name);
  const data = isText ? zlib.deflateRawSync(raw, { level: 9 }) : raw;
  const method = isText ? 8 : 0;
  const nameBuf = Buffer.from(f.name, "utf-8");
  const crc = crc32(raw);

  const lh = Buffer.alloc(30);
  lh.writeUInt32LE(0x04034b50, 0);
  lh.writeUInt16LE(20, 4);
  lh.writeUInt16LE(0, 6);
  lh.writeUInt16LE(method, 8);
  lh.writeUInt32LE(crc, 14);
  lh.writeUInt32LE(data.length, 18);
  lh.writeUInt32LE(raw.length, 22);
  lh.writeUInt16LE(nameBuf.length, 26);
  lh.writeUInt16LE(0, 28);
  chunks.push(lh, nameBuf, data);

  const ch = Buffer.alloc(46);
  ch.writeUInt32LE(0x02014b50, 0);
  ch.writeUInt16LE(20, 4);
  ch.writeUInt16LE(20, 6);
  ch.writeUInt16LE(method, 10);
  ch.writeUInt32LE(crc, 16);
  ch.writeUInt32LE(data.length, 20);
  ch.writeUInt32LE(raw.length, 24);
  ch.writeUInt16LE(nameBuf.length, 28);
  ch.writeUInt32LE(offset, 42);
  central.push(ch, nameBuf);

  offset += 30 + nameBuf.length + data.length;
}

const centralBuf = Buffer.concat(central);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(files.length, 8);
end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(centralBuf.length, 12);
end.writeUInt32LE(offset, 16);
fs.writeFileSync(zipPath, Buffer.concat([Buffer.concat(chunks), centralBuf, end]));

const size = fs.statSync(zipPath).size;
console.log("\n[pack] " + zipPath);
console.log("[pack] 文件 " + files.length + " 个 · 解压后 " + (rawTotal / 1024 / 1024).toFixed(2) + " MiB");
console.log("[pack] zip " + (size / 1024 / 1024).toFixed(2) + " MiB（上限 10 MiB，建议 ≤ 2 MiB）");
if (size > 10 * 1024 * 1024) {
  console.error("[pack] 超出 10 MiB 硬上限");
  process.exit(1);
}
