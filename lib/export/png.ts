import { deflateSync } from "node:zlib";
import { crc32 } from "./zip";

// Tiny PNG icons for app packages (Microsoft 365 needs a 192px colour icon
// and a 32px white-on-transparent outline icon). A filled circle on a square,
// drawn pixel by pixel: no image library needed.

function chunk(type: string, data: Buffer): Buffer {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}

type Rgba = [number, number, number, number];

export function circleIcon(size: number, background: Rgba, circle: Rgba): Buffer {
  const rows: Buffer[] = [];
  const c = (size - 1) / 2;
  const r = size * 0.32;
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4); // filter byte 0, then RGBA
    for (let x = 0; x < size; x++) {
      const inside = (x - c) ** 2 + (y - c) ** 2 <= r * r;
      Buffer.from(inside ? circle : background).copy(row, 1 + x * 4);
    }
    rows.push(row);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(Buffer.concat(rows))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
