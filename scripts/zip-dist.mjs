// Pure-Node zip step run by `npm run release`. Walks dist/ and writes a
// flat zip into submission/build.zip — that's the file itch.io and
// Wavedash both expect for HTML5 game uploads.
//
// Pure Node so we don't depend on `zip` (Windows / minimal WSL distros
// often don't have it) or pull in a dev dependency for one operation.
import { createWriteStream, readFileSync, statSync, readdirSync, mkdirSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { deflateRawSync } from 'node:zlib';

// Manual CRC32 — node:zlib.crc32 is Node 22+ and we want to work on Node 18.
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const DIST = 'dist';
const OUT = 'submission/build.zip';

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

// Minimal zip writer (no compression for tiny files, deflate for the rest).
function buildZip(files) {
  const local = [];
  const central = [];
  let offset = 0;

  for (const { name, data } of files) {
    const nameBuf = Buffer.from(name, 'utf8');
    const crc = crc32(data);
    const compressed = data.length > 64 ? deflateRawSync(data) : data;
    const method = compressed === data ? 0 : 8;
    const used = compressed !== data ? compressed : data;

    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);
    lh.writeUInt16LE(0, 6);
    lh.writeUInt16LE(method, 8);
    lh.writeUInt16LE(0, 10);
    lh.writeUInt16LE(0, 12);
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(used.length, 18);
    lh.writeUInt32LE(data.length, 22);
    lh.writeUInt16LE(nameBuf.length, 26);
    lh.writeUInt16LE(0, 28);
    local.push(lh, nameBuf, used);

    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0);
    ch.writeUInt16LE(20, 4);
    ch.writeUInt16LE(20, 6);
    ch.writeUInt16LE(0, 8);
    ch.writeUInt16LE(method, 10);
    ch.writeUInt16LE(0, 12);
    ch.writeUInt16LE(0, 14);
    ch.writeUInt32LE(crc, 16);
    ch.writeUInt32LE(used.length, 20);
    ch.writeUInt32LE(data.length, 24);
    ch.writeUInt16LE(nameBuf.length, 28);
    ch.writeUInt16LE(0, 30);
    ch.writeUInt16LE(0, 32);
    ch.writeUInt16LE(0, 34);
    ch.writeUInt16LE(0, 36);
    ch.writeUInt32LE(0, 38);
    ch.writeUInt32LE(offset, 42);
    central.push(ch, nameBuf);

    offset += 30 + nameBuf.length + used.length;
  }

  const localBuf = Buffer.concat(local);
  const centralBuf = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(localBuf.length, 16);
  eocd.writeUInt16LE(0, 20);
  return Buffer.concat([localBuf, centralBuf, eocd]);
}

const all = walk(DIST).map((p) => ({
  name: relative(DIST, p).split(sep).join('/'),
  data: readFileSync(p),
}));

mkdirSync(dirname(OUT), { recursive: true });
const zip = buildZip(all);
createWriteStream(OUT).end(zip, () => {
  const totalIn = all.reduce((s, f) => s + f.data.length, 0);
  console.log(`[release] wrote ${OUT}  (${all.length} files · ${(zip.length / 1024).toFixed(1)} KB · ${(totalIn / 1024).toFixed(1)} KB uncompressed)`);
});
