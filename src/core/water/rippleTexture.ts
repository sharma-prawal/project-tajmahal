import { DataTexture, LinearFilter, LinearMipmapLinearFilter, NoColorSpace, RepeatWrapping, RGBAFormat, UnsignedByteType } from 'three';

export const RIPPLE_TEXTURE_SIZE = 128;

export function createRippleTextureData(size = RIPPLE_TEXTURE_SIZE): Uint8Array {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = (x / size) * Math.PI * 2;
      const v = (y / size) * Math.PI * 2;
      const height = Math.sin(u * 2 + Math.sin(v * 3) * 0.55) * 0.55 + Math.sin(v * 3 - u * 0.7) * 0.3 + Math.sin((u + v) * 5) * 0.15;
      const dx = Math.cos(u * 2 + Math.sin(v * 3) * 0.55) * 1.1 + Math.cos((u + v) * 5) * 0.75;
      const dy = Math.cos(v * 3 - u * 0.7) * 0.9 + Math.cos((u + v) * 5) * 0.75;
      const length = Math.hypot(dx * 0.12, dy * 0.12, 1);
      const index = (y * size + x) * 4;
      data[index] = Math.round((dx * 0.12 / length * 0.5 + 0.5) * 255);
      data[index + 1] = Math.round((dy * 0.12 / length * 0.5 + 0.5) * 255);
      data[index + 2] = Math.round((1 / length * 0.5 + 0.5) * 255);
      data[index + 3] = Math.round((height * 0.5 + 0.5) * 255);
    }
  }
  return data;
}

export function createRippleTexture() {
  const bytes = createRippleTextureData();
  const data = new Uint8Array(bytes.buffer as ArrayBuffer);
  const texture = new DataTexture(data, RIPPLE_TEXTURE_SIZE, RIPPLE_TEXTURE_SIZE, RGBAFormat, UnsignedByteType);
  texture.name = 'project-taj-generated-ripple-normal';
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.generateMipmaps = true;
  texture.colorSpace = NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

let sharedRippleTexture: DataTexture | undefined;

/** One shared normal/ripple texture for pool, channel, and both fountains. */
export function getSharedRippleTexture() {
  sharedRippleTexture ??= createRippleTexture();
  return sharedRippleTexture;
}
