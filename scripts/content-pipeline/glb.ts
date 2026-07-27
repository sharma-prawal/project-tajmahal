const GLB_MAGIC = 0x46546c67; // "glTF"
const CHUNK_TYPE_JSON = 0x4e4f534a; // "JSON"
const CHUNK_TYPE_BIN = 0x004e4942; // "BIN\0"

function pad4(buf: Buffer, fill: number): Buffer {
  const remainder = buf.length % 4;
  if (remainder === 0) return buf;
  return Buffer.concat([buf, Buffer.alloc(4 - remainder, fill)]);
}

/**
 * Builds a minimal, structurally valid glTF 2.0 binary (.glb) containing a
 * single flat triangle — entirely by hand, no glTF-authoring dependency.
 * Used only as a pipeline validation fixture (Stage 0 dummy asset), not
 * production geometry.
 */
export function buildTriangleGlb(): Buffer {
  const positions = Buffer.alloc(36); // 3 vertices * vec3 * float32
  const verts: [number, number, number][] = [
    [0, 0, 0],
    [1, 0, 0],
    [0, 1, 0],
  ];
  verts.forEach(([x, y, z], i) => {
    positions.writeFloatLE(x, i * 12);
    positions.writeFloatLE(y, i * 12 + 4);
    positions.writeFloatLE(z, i * 12 + 8);
  });

  const gltf = {
    asset: {
      version: '2.0',
      generator: 'project-taj dummy-asset fixture generator (not production content)',
    },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: 'dummy-triangle' }],
    meshes: [
      {
        name: 'dummy-triangle-mesh',
        primitives: [{ attributes: { POSITION: 0 }, mode: 4 }],
      },
    ],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: 3,
        type: 'VEC3',
        min: [0, 0, 0],
        max: [1, 1, 0],
      },
    ],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: positions.length }],
    buffers: [{ byteLength: positions.length }],
  };

  const jsonChunkData = pad4(Buffer.from(JSON.stringify(gltf), 'utf8'), 0x20); // space-pad
  const binChunkData = pad4(positions, 0x00);

  const jsonChunkHeader = Buffer.alloc(8);
  jsonChunkHeader.writeUInt32LE(jsonChunkData.length, 0);
  jsonChunkHeader.writeUInt32LE(CHUNK_TYPE_JSON, 4);

  const binChunkHeader = Buffer.alloc(8);
  binChunkHeader.writeUInt32LE(binChunkData.length, 0);
  binChunkHeader.writeUInt32LE(CHUNK_TYPE_BIN, 4);

  const totalLength =
    12 + jsonChunkHeader.length + jsonChunkData.length + binChunkHeader.length + binChunkData.length;

  const header = Buffer.alloc(12);
  header.writeUInt32LE(GLB_MAGIC, 0);
  header.writeUInt32LE(2, 4); // version
  header.writeUInt32LE(totalLength, 8);

  return Buffer.concat([header, jsonChunkHeader, jsonChunkData, binChunkHeader, binChunkData]);
}
