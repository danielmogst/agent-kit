// Render check for the Sprite Fusion VFX library.
// Proves the vendored effects run and draw real pixels, with no dependencies.
//   node render-check.mjs [outputDir]
// Requires Node 22.18+ (or 24+) for native TypeScript type stripping.
import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';
import snow from '../library/snow.ts';
import explosion from '../library/explosion.ts';

const W = 240, H = 150;
const OUT = process.argv[2] ?? '.';

// --- minimal PNG encoder ---
const CRC = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC[n] = c;
}
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}
function png(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride)
      .copy(raw, y * (stride + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function makeFrame(ox = 0, oy = 0) {
  return { w: W, h: H, ox, oy, color: new Uint32Array(W * H), light: new Uint32Array(W * H) };
}

// packed 0xAABBGGRR -> RGBA bytes (little-endian), light added additively
function toRGBA(fr, bg) {
  const out = new Uint8Array(W * H * 4);
  const col = new Uint8Array(fr.color.buffer);
  const lit = new Uint8Array(fr.light.buffer);
  for (let i = 0; i < W * H; i++) {
    const a = col[i * 4 + 3], la = lit[i * 4 + 3];
    let r = bg[0], g = bg[1], b = bg[2];
    if (la) { r += lit[i * 4]; g += lit[i * 4 + 1]; b += lit[i * 4 + 2]; }
    if (a) { r = col[i * 4]; g = col[i * 4 + 1]; b = col[i * 4 + 2]; }
    out[i * 4] = Math.min(255, r);
    out[i * 4 + 1] = Math.min(255, g);
    out[i * 4 + 2] = Math.min(255, b);
    out[i * 4 + 3] = 255;
  }
  return out;
}

function countDrawn(fr) {
  const col = new Uint8Array(fr.color.buffer);
  let n = 0;
  for (let i = 3; i < col.length; i += 4) if (col[i]) n++;
  return n;
}

// snow: looping weather effect. Effects draw on a 2x chunked grid, so the
// area covers twice the frame in each direction.
const snowFr = makeFrame(0, 0);
const snowFx = snow({ area: { x: 0, y: 0, w: W * 2, h: H * 2 }, ground: H * 2 - 8, density: 0.9, wind: 26, seed: 7 });
for (let i = 0; i < 210; i++) snowFx.update(1 / 60);
snowFx.draw(snowFr, 'back');
snowFx.draw(snowFr, 'front');
console.log('snow drawn px:', countDrawn(snowFr));
fs.writeFileSync(path.join(OUT, 'vfx-snow.png'), png(W, H, toRGBA(snowFr, [18, 20, 34])));

// explosion: finite combat effect, ~0.30 s in. Its world point is (770, 600);
// the frame origin is offset so that point lands centred and near the ground.
const expFr = makeFrame(770 / 2 - W / 2, 600 / 2 - (H - 10));
const expFx = explosion({ x: 770, y: 600, ground: 600, size: 1, seed: 3 });
for (let i = 0; i < 18; i++) expFx.update(1 / 60);
expFx.draw(expFr, 'back');
expFx.draw(expFr, 'front');
console.log('explosion drawn px:', countDrawn(expFr), 'done:', expFx.done());
fs.writeFileSync(path.join(OUT, 'vfx-explosion.png'), png(W, H, toRGBA(expFr, [26, 22, 30])));

console.log('PNG WRITTEN to', path.resolve(OUT));
