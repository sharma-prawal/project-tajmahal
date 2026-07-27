import zlib from 'node:zlib';

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(zlib.crc32(crcInput) >>> 0, 0);
  return Buffer.concat([length, typeBuf, data, crc]);
}

/**
 * Builds a minimal valid, uncompressed-simple RGBA PNG entirely with Node
 * built-ins (zlib) — no image library dependency. Used only for pipeline
 * validation fixtures, not production art.
 */
export function buildSolidColorPng(
  width: number,
  height: number,
  rgba: [number, number, number, number],
): Buffer {
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // bit depth
  ihdrData.writeUInt8(6, 9); // color type: RGBA
  ihdrData.writeUInt8(0, 10); // compression
  ihdrData.writeUInt8(0, 11); // filter
  ihdrData.writeUInt8(0, 12); // interlace

  const rowBytes = 1 + width * 4;
  const raw = Buffer.alloc(rowBytes * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * rowBytes;
    raw[rowStart] = 0; // filter type: none
    for (let x = 0; x < width; x += 1) {
      const pixelStart = rowStart + 1 + x * 4;
      raw[pixelStart] = rgba[0];
      raw[pixelStart + 1] = rgba[1];
      raw[pixelStart + 2] = rgba[2];
      raw[pixelStart + 3] = rgba[3];
    }
  }

  const idatData = zlib.deflateSync(raw);

  return Buffer.concat([
    PNG_SIGNATURE,
    chunk('IHDR', ihdrData),
    chunk('IDAT', idatData),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
