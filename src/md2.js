const MD2_IDENT = 844121161;
const MD2_VERSION = 8;

const ANIMATION_RANGES = {
  'stand':   { start: 0, end: 39 },
  'run':     { start: 40, end: 45 },
  'attack':  { start: 46, end: 53 },
  'pain1':   { start: 54, end: 57 },
  'pain2':   { start: 58, end: 61 },
  'pain3':   { start: 62, end: 65 },
  'jump':    { start: 66, end: 69 }, // Original range ends at 71; trimming to 69 gives a snappier landing.
  'flip':    { start: 72, end: 83 },
  'salute':  { start: 84, end: 94 },
  'taunt':   { start: 95, end: 111 },
  'wave':    { start: 112, end: 122 },
  'point':   { start: 123, end: 134 },
  'crstnd':  { start: 135, end: 153 },
  'crwalk':  { start: 154, end: 159 },
  'crattack':{ start: 160, end: 168 },
  'crpain':  { start: 169, end: 172 },
  'crdeath': { start: 173, end: 177 },
  'death1':  { start: 178, end: 183 },
  'death2':  { start: 184, end: 189 },
  'death3':  { start: 190, end: 197 }
};

const Q2_NORMALS = [
  [-0.525731, 0.000000, 0.850651], [-0.442863, 0.238856, 0.864188], [-0.295242, 0.000000, 0.955423],
  [-0.309017, 0.500000, 0.809017], [-0.162460, 0.262866, 0.951056], [0.000000, 0.000000, 1.000000],
  [0.000000, 0.850651, 0.525731], [-0.147621, 0.716567, 0.681718], [0.147621, 0.716567, 0.681718],
  [0.000000, 0.525731, 0.850651], [0.309017, 0.500000, 0.809017], [0.525731, 0.000000, 0.850651],
  [0.295242, 0.000000, 0.955423], [0.442863, 0.238856, 0.864188], [0.162460, 0.262866, 0.951056],
  [-0.681718, 0.147621, 0.716567], [-0.809017, 0.309017, 0.500000], [-0.587785, 0.425325, 0.688191],
  [-0.850651, 0.525731, 0.000000], [-0.864188, 0.442863, 0.238856], [-0.716567, 0.681718, 0.147621],
  [-0.688191, 0.587785, 0.425325], [-0.500000, 0.809017, 0.309017], [-0.238856, 0.864188, 0.442863],
  [-0.425325, 0.688191, 0.587785], [-0.716567, 0.681718, -0.147621], [-0.500000, 0.809017, -0.309017],
  [-0.525731, 0.850651, 0.000000], [0.000000, 0.850651, -0.525731], [-0.238856, 0.864188, -0.442863],
  [0.000000, 0.955423, -0.295242], [-0.262866, 0.951056, -0.162460], [0.000000, 1.000000, 0.000000],
  [0.000000, 0.955423, 0.295242], [-0.262866, 0.951056, 0.162460], [0.238856, 0.864188, 0.442863],
  [0.262866, 0.951056, 0.162460], [0.500000, 0.809017, 0.309017], [0.238856, 0.864188, -0.442863],
  [0.262866, 0.951056, -0.162460], [0.500000, 0.809017, -0.309017], [0.850651, 0.525731, 0.000000],
  [0.716567, 0.681718, 0.147621], [0.716567, 0.681718, -0.147621], [0.525731, 0.850651, 0.000000],
  [0.425325, 0.688191, 0.587785], [0.864188, 0.442863, 0.238856], [0.688191, 0.587785, 0.425325],
  [0.809017, 0.309017, 0.500000], [0.681718, 0.147621, 0.716567], [0.587785, 0.425325, 0.688191],
  [0.955423, 0.295242, 0.000000], [1.000000, 0.000000, 0.000000], [0.951056, 0.162460, 0.262866],
  [0.850651, -0.525731, 0.000000], [0.955423, -0.295242, 0.000000], [0.864188, -0.442863, 0.238856],
  [0.951056, -0.162460, 0.262866], [0.809017, -0.309017, 0.500000], [0.681718, -0.147621, 0.716567],
  [0.850651, 0.000000, 0.525731], [0.864188, 0.442863, -0.238856], [0.809017, 0.309017, -0.500000],
  [0.951056, 0.162460, -0.262866], [0.525731, 0.000000, -0.850651], [0.681718, 0.147621, -0.716567],
  [0.681718, -0.147621, -0.716567], [0.850651, 0.000000, -0.525731], [0.809017, -0.309017, -0.500000],
  [0.864188, -0.442863, -0.238856], [0.951056, -0.162460, -0.262866], [0.147621, 0.716567, -0.681718],
  [0.309017, 0.500000, -0.809017], [0.425325, 0.688191, -0.587785], [0.442863, 0.238856, -0.864188],
  [0.587785, 0.425325, -0.688191], [0.688191, 0.587785, -0.425325], [-0.147621, 0.716567, -0.681718],
  [-0.309017, 0.500000, -0.809017], [0.000000, 0.525731, -0.850651], [-0.525731, 0.000000, -0.850651],
  [-0.442863, 0.238856, -0.864188], [-0.295242, 0.000000, -0.955423], [-0.162460, 0.262866, -0.951056],
  [0.000000, 0.000000, -1.000000], [0.295242, 0.000000, -0.955423], [0.162460, 0.262866, -0.951056],
  [-0.442863, -0.238856, -0.864188], [-0.309017, -0.500000, -0.809017], [-0.162460, -0.262866, -0.951056],
  [0.000000, -0.850651, -0.525731], [-0.147621, -0.716567, -0.681718], [0.147621, -0.716567, -0.681718],
  [0.000000, -0.525731, -0.850651], [0.309017, -0.500000, -0.809017], [0.442863, -0.238856, -0.864188],
  [0.162460, -0.262866, -0.951056], [0.238856, -0.864188, -0.442863], [0.500000, -0.809017, -0.309017],
  [0.425325, -0.688191, -0.587785], [0.716567, -0.681718, -0.147621], [0.688191, -0.587785, -0.425325],
  [0.587785, -0.425325, -0.688191], [0.000000, -0.955423, -0.295242], [0.000000, -1.000000, 0.000000],
  [0.262866, -0.951056, -0.162460], [0.000000, -0.850651, 0.525731], [0.000000, -0.955423, 0.295242],
  [0.238856, -0.864188, 0.442863], [0.262866, -0.951056, 0.162460], [0.500000, -0.809017, 0.309017],
  [0.716567, -0.681718, 0.147621], [0.525731, -0.850651, 0.000000], [-0.238856, -0.864188, -0.442863],
  [-0.500000, -0.809017, -0.309017], [-0.262866, -0.951056, -0.162460], [-0.850651, -0.525731, 0.000000],
  [-0.716567, -0.681718, -0.147621], [-0.716567, -0.681718, 0.147621], [-0.525731, -0.850651, 0.000000],
  [-0.500000, -0.809017, 0.309017], [-0.238856, -0.864188, 0.442863], [-0.262866, -0.951056, 0.162460],
  [-0.864188, -0.442863, 0.238856], [-0.809017, -0.309017, 0.500000], [-0.688191, -0.587785, 0.425325],
  [-0.681718, -0.147621, 0.716567], [-0.442863, -0.238856, 0.864188], [-0.587785, -0.425325, 0.688191],
  [-0.309017, -0.500000, 0.809017], [-0.147621, -0.716567, 0.681718], [-0.425325, -0.688191, 0.587785],
  [-0.162460, -0.262866, 0.951056], [0.442863, -0.238856, 0.864188], [0.162460, -0.262866, 0.951056],
  [0.309017, -0.500000, 0.809017], [0.147621, -0.716567, 0.681718], [0.000000, -0.525731, 0.850651],
  [0.425325, -0.688191, 0.587785], [0.587785, -0.425325, 0.688191], [0.688191, -0.587785, 0.425325],
  [-0.955423, 0.295242, 0.000000], [-0.951056, 0.162460, 0.262866], [-1.000000, 0.000000, 0.000000],
  [-0.850651, 0.000000, 0.525731], [-0.955423, -0.295242, 0.000000], [-0.951056, -0.162460, 0.262866],
  [-0.864188, 0.442863, -0.238856], [-0.951056, 0.162460, -0.262866], [-0.809017, 0.309017, -0.500000],
  [-0.864188, -0.442863, -0.238856], [-0.951056, -0.162460, -0.262866], [-0.809017, -0.309017, -0.500000],
  [-0.681718, 0.147621, -0.716567], [-0.681718, -0.147621, -0.716567], [-0.850651, 0.000000, -0.525731],
  [-0.688191, 0.587785, -0.425325], [-0.587785, 0.425325, -0.688191], [-0.425325, 0.688191, -0.587785],
  [-0.425325, -0.688191, -0.587785], [-0.587785, -0.425325, -0.688191], [-0.688191, -0.587785, -0.425325]
];

function getNormalVec(idx) {
  const n = Q2_NORMALS[idx] || [0,0,1];
  return n;
}

export async function loadArrayBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to load ' + url);
  return res.arrayBuffer();
}

export function parseMD2(buffer) {
  const data = new DataView(buffer);
  const header = {
    ident: data.getInt32(0, true),
    version: data.getInt32(4, true),
    skinwidth: data.getInt32(8, true),
    skinheight: data.getInt32(12, true),
    framesize: data.getInt32(16, true),
    num_skins: data.getInt32(20, true),
    num_vertices: data.getInt32(24, true),
    num_st: data.getInt32(28, true),
    num_tris: data.getInt32(32, true),
    num_glcmds: data.getInt32(36, true),
    num_frames: data.getInt32(40, true),
    offset_skins: data.getInt32(44, true),
    offset_st: data.getInt32(48, true),
    offset_tris: data.getInt32(52, true),
    offset_frames: data.getInt32(56, true),
    offset_glcmds: data.getInt32(60, true),
    offset_end: data.getInt32(64, true)
  };
  if (header.ident !== MD2_IDENT || header.version !== MD2_VERSION) {
    throw new Error('Not a valid MD2 file');
  }

  // Frames
  const frames = [];
  let off = header.offset_frames;
  for (let i = 0; i < header.num_frames; i++) {
    const scale = [
      data.getFloat32(off, true),
      data.getFloat32(off + 4, true),
      data.getFloat32(off + 8, true)
    ];
    const translate = [
      data.getFloat32(off + 12, true),
      data.getFloat32(off + 16, true),
      data.getFloat32(off + 20, true)
    ];
    let name = '';
    for (let j = 0; j < 16; j++) {
      const c = data.getUint8(off + 24 + j);
      if (c === 0) break;
      name += String.fromCharCode(c);
    }
    const verts = new Float32Array(header.num_vertices * 3);
    const norms = new Float32Array(header.num_vertices * 3);
    for (let v = 0; v < header.num_vertices; v++) {
      const vOff = off + 40 + v * 4;
      const x = data.getUint8(vOff) * scale[0] + translate[0];
      const y = data.getUint8(vOff + 1) * scale[1] + translate[1];
      const z = data.getUint8(vOff + 2) * scale[2] + translate[2];
      const nIdx = data.getUint8(vOff + 3);
      const n = getNormalVec(nIdx);
      verts[v * 3 + 0] = x;
      verts[v * 3 + 1] = y;
      verts[v * 3 + 2] = z;
      norms[v * 3 + 0] = n[0];
      norms[v * 3 + 1] = n[1];
      norms[v * 3 + 2] = n[2];
    }
    frames.push({ name, verts, norms });
    off += header.framesize;
  }

  // ST (UV)
  off = header.offset_st;
  const st = new Int16Array(header.num_st * 2);
  for (let i = 0; i < header.num_st; i++) {
    st[i * 2 + 0] = data.getInt16(off, true);
    st[i * 2 + 1] = data.getInt16(off + 2, true);
    off += 4;
  }

  // Triangles (vertex idx + uv idx)
  off = header.offset_tris;
  const triVi = new Uint16Array(header.num_tris * 3);
  const triTi = new Uint16Array(header.num_tris * 3);
  for (let i = 0; i < header.num_tris; i++) {
    const b = i * 3;
    triVi[b + 0] = data.getUint16(off + 0, true);
    triVi[b + 1] = data.getUint16(off + 2, true);
    triVi[b + 2] = data.getUint16(off + 4, true);
    triTi[b + 0] = data.getUint16(off + 6, true);
    triTi[b + 1] = data.getUint16(off + 8, true);
    triTi[b + 2] = data.getUint16(off + 10, true);
    off += 12;
  }

  return { header, frames, st, triVi, triTi };
}

export function buildExpandedMesh(md2) {
  // Expand to non-indexed geometry; also compute UVs (flip V) and track original vertex index for each expanded vertex
  const { header, frames, st, triVi, triTi } = md2;
  const outCount = header.num_tris * 3;
  const aOrigIndex = new Float32Array(outCount);
  const aUV = new Float32Array(outCount * 2);

  // Compute UVs
  function uvFromIndex(i) {
    const s = st[i * 2 + 0] / header.skinwidth;
    const t = st[i * 2 + 1] / header.skinheight;
    return [s, 1 - t]; // flip V
  }

  // Flip winding to CCW: original order (0,1,2) becomes (0,2,1) to match WebGL
  for (let i = 0; i < header.num_tris; i++) {
    const triBase = i * 3;
    const order = [0, 2, 1];
    for (let k = 0; k < 3; k++) {
      const src = triBase + order[k];
      const dst = triBase + k;
      const vIdx = triVi[src];
      const tIdx = triTi[src];
      aOrigIndex[dst] = vIdx;
      const uv = uvFromIndex(tIdx);
      aUV[dst * 2 + 0] = uv[0];
      aUV[dst * 2 + 1] = uv[1];
    }
  }

  // Build wireframe indices (lines) from triangles (simple, may duplicate edges)
  const lineIdx = new Uint32Array(header.num_tris * 6);
  for (let i = 0; i < header.num_tris; i++) {
    const baseV = i * 3;
    const baseL = i * 6;
    const a = baseV + 0, b = baseV + 1, c = baseV + 2;
    lineIdx[baseL + 0] = a; lineIdx[baseL + 1] = b;
    lineIdx[baseL + 2] = b; lineIdx[baseL + 3] = c;
    lineIdx[baseL + 4] = c; lineIdx[baseL + 5] = a;
  }

  return { aOrigIndex, aUV, outCount, frames, numVerts: md2.header.num_vertices, numFrames: md2.header.num_frames, lineIdx };
}

export const ANIMS = ANIMATION_RANGES;