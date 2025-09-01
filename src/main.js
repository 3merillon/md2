import { createGL, linkProgram, loadImage, createAlbedoTexture, createTexture2D } from './glutils.js';
import { loadArrayBuffer, parseMD2, buildExpandedMesh } from './md2.js';
import { blendingVS, blendingFS, blendingWireVS, blendingWireFS } from './shaders.js';
import { CharacterLoader } from './characterLoader.js';
import { AnimationController } from './animationController.js';

// Mat utilities
const Mat4 = {
  create() {
    const m = new Float32Array(16);
    m[0]=1; m[5]=1; m[10]=1; m[15]=1;
    return m;
  },
  multiply(out, a, b) {
    const a00 = a[0], a01 = a[1], a02 = a[2],  a03 = a[3],
          a10 = a[4], a11 = a[5], a12 = a[6],  a13 = a[7],
          a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
          a30 = a[12],a31 = a[13],a32 = a[14], a33 = a[15];

    const b00 = b[0], b01 = b[1], b02 = b[2],  b03 = b[3],
          b10 = b[4], b11 = b[5], b12 = b[6],  b13 = b[7],
          b20 = b[8], b21 = b[9], b22 = b[10], b23 = b[11],
          b30 = b[12],b31 = b[13],b32 = b[14], b33 = b[15];

    out[0]  = a00*b00 + a10*b01 + a20*b02 + a30*b03;
    out[1]  = a01*b00 + a11*b01 + a21*b02 + a31*b03;
    out[2]  = a02*b00 + a12*b01 + a22*b02 + a32*b03;
    out[3]  = a03*b00 + a13*b01 + a23*b02 + a33*b03;
    out[4]  = a00*b10 + a10*b11 + a20*b12 + a30*b13;
    out[5]  = a01*b10 + a11*b11 + a21*b12 + a31*b13;
    out[6]  = a02*b10 + a12*b11 + a22*b12 + a32*b13;
    out[7]  = a03*b10 + a13*b11 + a23*b12 + a33*b13;
    out[8]  = a00*b20 + a10*b21 + a20*b22 + a30*b23;
    out[9]  = a01*b20 + a11*b21 + a21*b22 + a31*b23;
    out[10] = a02*b20 + a12*b21 + a22*b22 + a32*b23;
    out[11] = a03*b20 + a13*b21 + a23*b22 + a33*b23;
    out[12] = a00*b30 + a10*b31 + a20*b32 + a30*b33;
    out[13] = a01*b30 + a11*b31 + a21*b32 + a31*b33;
    out[14] = a02*b30 + a12*b31 + a22*b32 + a32*b33;
    out[15] = a03*b30 + a13*b31 + a23*b33 + a33*b33;
    return out;
  },
  perspective(out, fovy, aspect, near, far) {
    const f = 1.0 / Math.tan(fovy / 2);
    out[0] = f / aspect; out[1] = 0; out[2] = 0; out[3] = 0;
    out[4] = 0; out[5] = f; out[6] = 0; out[7] = 0;
    out[8] = 0; out[9] = 0; out[10] = (far + near) / (near - far); out[11] = -1;
    out[12] = 0; out[13] = 0; out[14] = (2 * far * near) / (near - far); out[15] = 0;
    return out;
  },
  lookAt(out, eye, center, up) {
    const x0 = up[1]*(eye[2]-center[2]) - up[2]*(eye[1]-center[1]);
    const x1 = up[2]*(eye[0]-center[0]) - up[0]*(eye[2]-center[2]);
    const x2 = up[0]*(eye[1]-center[1]) - up[1]*(eye[0]-center[0]);
    let rl = 1/Math.hypot(x0,x1,x2);
    const X0 = x0*rl, X1 = x1*rl, X2 = x2*rl;

    const y0 = (eye[1]-center[1])*X2 - (eye[2]-center[2])*X1;
    const y1 = (eye[2]-center[2])*X0 - (eye[0]-center[0])*X2;
    const y2 = (eye[0]-center[0])*X1 - (eye[1]-center[1])*X0;
    rl = 1/Math.hypot(y0,y1,y2);
    const Y0 = y0*rl, Y1 = y1*rl, Y2 = y2*rl;

    const Z0 = (eye[0]-center[0]);
    const Z1 = (eye[1]-center[1]);
    const Z2 = (eye[2]-center[2]);
    rl = 1/Math.hypot(Z0,Z1,Z2);
    const Z0n = Z0*rl, Z1n = Z1*rl, Z2n = Z2*rl;

    out[0]=X0; out[1]=Y0; out[2]=Z0n; out[3]=0;
    out[4]=X1; out[5]=Y1; out[6]=Z1n; out[7]=0;
    out[8]=X2; out[9]=Y2; out[10]=Z2n; out[11]=0;
    out[12]=-(X0*eye[0] + X1*eye[1] + X2*eye[2]);
    out[13]=-(Y0*eye[0] + Y1*eye[1] + Y2*eye[2]);
    out[14]=-(Z0n*eye[0] + Z1n*eye[1] + Z2n*eye[2]);
    out[15]=1;
    return out;
  },
  fromXRotation(out, rad) {
    const s = Math.sin(rad), c = Math.cos(rad);
    out[0]=1; out[1]=0; out[2]=0; out[3]=0;
    out[4]=0; out[5]=c; out[6]=s; out[7]=0;
    out[8]=0; out[9]=-s; out[10]=c; out[11]=0;
    out[12]=0; out[13]=0; out[14]=0; out[15]=1;
    return out;
  },
  fromYRotation(out, rad) {
    const s = Math.sin(rad), c = Math.cos(rad);
    out[0]=c;  out[1]=0; out[2]=s;  out[3]=0;
    out[4]=0;  out[5]=1; out[6]=0;  out[7]=0;
    out[8]=-s; out[9]=0; out[10]=c; out[11]=0;
    out[12]=0; out[13]=0; out[14]=0; out[15]=1;
    return out;
  },
  fromScaling(out, v) {
    out[0]=v; out[1]=0; out[2]=0; out[3]=0;
    out[4]=0; out[5]=v; out[6]=0; out[7]=0;
    out[8]=0; out[9]=0; out[10]=v; out[11]=0;
    out[12]=0; out[13]=0; out[14]=0; out[15]=1;
    return out;
  }
};
function mat3FromRotationX(rad) {
  const s = Math.sin(rad), c = Math.cos(rad);
  return new Float32Array([
    1, 0, 0,
    0, c, s,
    0,-s, c
  ]);
}
function vec3Normalize(v) {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0]/l, v[1]/l, v[2]/l];
}

// Orbit controls
const orbit = { azimuth: 0, elevation: 0, distance: 70, target: [0,0,0], dragging:false, lastX:0, lastY:0 };
function orbitEye() {
  const el = orbit.elevation, az = orbit.azimuth, r = orbit.distance;
  const x = r * Math.cos(el) * Math.cos(az);
  const y = r * Math.sin(el);
  const z = r * Math.cos(el) * Math.sin(az);
  return [x, y, z];
}

let lightAzimuth = Math.PI * 0.25;
let lightElevation = Math.PI * 0.35;
function lightDir() {
  const r = 1;
  const x = r * Math.cos(lightElevation) * Math.cos(lightAzimuth);
  const y = r * Math.sin(lightElevation);
  const z = r * Math.cos(lightElevation) * Math.sin(lightAzimuth);
  return vec3Normalize([x, y, z]);
}

// Character yaw (radians). targetYaw controlled by WASD, charYaw smoothly follows.
let charYaw = 0;
let targetYaw = 0;

// Helper for shortest angle difference
function shortestAngleDelta(a, b) {
  let d = (b - a + Math.PI) % (2 * Math.PI);
  if (d < 0) d += 2 * Math.PI;
  return d - Math.PI;
}

// Keyboard input state
const keys = { w:false, a:false, s:false, d:false };

// Compute camera-space forward/right projected on XZ plane
function getCameraBasisXZ() {
  const eye = orbitEye();
  const tgt = orbit.target;
  // Forward from camera to target
  let fx = tgt[0] - eye[0];
  let fz = tgt[2] - eye[2];
  const fl = Math.hypot(fx, fz) || 1;
  fx /= fl; fz /= fl;
  // Right = forward x up (0,1,0) => [-fz, 0, fx]
  let rx = -fz;
  let rz = fx;
  const rl = Math.hypot(rx, rz) || 1;
  rx /= rl; rz /= rl;
  return { forward:[fx, 0, fz], right:[rx, 0, rz] };
}

// Update movement and target yaw based on keys
function updateMovementFromKeys() {
  const any = keys.w || keys.a || keys.s || keys.d;
  if (!animationController || animationController.isDead) return;

  if (any) {
    const { forward, right } = getCameraBasisXZ();
    let vx = 0, vz = 0;
    if (keys.w) { vx += forward[0]; vz += forward[2]; }
    if (keys.s) { vx -= forward[0]; vz -= forward[2]; }
    if (keys.d) { vx += right[0];   vz += right[2]; }
    if (keys.a) { vx -= right[0];   vz -= right[2]; }
    const len = Math.hypot(vx, vz);
    if (len > 1e-5) {
      vx /= len; vz /= len;
      targetYaw = Math.atan2(vz, vx); // yaw=0 faces +X
    }
    animationController.setMovement(true); // run/crawl decided by current stance
  } else {
    animationController.setMovement(false);
  }
}

// MD2GPUModel with blending support
class MD2GPUModel {
  constructor(gl, expanded, frames, albedoTex) {
    this.gl = gl;
    this.outCount = expanded.outCount;
    this.lineIdx = expanded.lineIdx;
    this.albedoTex = albedoTex;

    this.texWidth = frames[0].verts.length / 3;
    this.numFrames = frames.length;

    const width = this.texWidth;
    const height = this.numFrames;

    const posData = new Float32Array(width * height * 4);
    const nrmData = new Float32Array(width * height * 4);

    for (let f = 0; f < height; f++) {
      const fv = frames[f].verts;
      const fn = frames[f].norms;
      for (let v = 0; v < width; v++) {
        const baseT = (f * width + v) * 4;
        const baseV = v * 3;
        posData[baseT + 0] = fv[baseV + 0];
        posData[baseT + 1] = fv[baseV + 1];
        posData[baseT + 2] = fv[baseV + 2];
        posData[baseT + 3] = 1.0;
        nrmData[baseT + 0] = fn[baseV + 0];
        nrmData[baseT + 1] = fn[baseV + 1];
        nrmData[baseT + 2] = fn[baseV + 2];
        nrmData[baseT + 3] = 0.0;
      }
    }

    this.posTex = createTexture2D(gl, width, height, gl.RGBA32F, gl.RGBA, gl.FLOAT, posData);
    this.nrmTex = createTexture2D(gl, width, height, gl.RGBA32F, gl.RGBA, gl.FLOAT, nrmData);

    this.vboIndex = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vboIndex);
    gl.bufferData(gl.ARRAY_BUFFER, expanded.aOrigIndex, gl.STATIC_DRAW);

    this.vboUV = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vboUV);
    gl.bufferData(gl.ARRAY_BUFFER, expanded.aUV, gl.STATIC_DRAW);

    this.eboLines = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.eboLines);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.lineIdx, gl.STATIC_DRAW);

    this.vaoSolid = gl.createVertexArray();
    gl.bindVertexArray(this.vaoSolid);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vboIndex);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 1, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vboUV);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    this.vaoWire = gl.createVertexArray();
    gl.bindVertexArray(this.vaoWire);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vboIndex);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 1, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vboUV);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.eboLines);
    gl.bindVertexArray(null);
  }

  // Draw methods with blending support
  drawSolid(gl, prog, common) {
    gl.useProgram(prog);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.posTex);
    gl.uniform1i(common.uPosTex, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.nrmTex);
    gl.uniform1i(common.uNrmTex, 1);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.albedoTex);
    gl.uniform1i(common.uAlbedo, 2);

    // Primary animation
    gl.uniform1i(common.uFrame0A, common.frame0A);
    gl.uniform1i(common.uFrame1A, common.frame1A);
    gl.uniform1f(common.uFrameFracA, common.frameFracA);

    // Secondary animation
    gl.uniform1i(common.uFrame0B, common.frame0B);
    gl.uniform1i(common.uFrame1B, common.frame1B);
    gl.uniform1f(common.uFrameFracB, common.frameFracB);

    // Blend factor
    gl.uniform1f(common.uAnimBlend, common.animBlend);

    gl.uniform1f(common.uNumFrames, this.numFrames);
    gl.uniform1f(common.uTexWidth, this.texWidth);

    gl.uniformMatrix4fv(common.uModel, false, common.model);
    gl.uniformMatrix4fv(common.uView, false, common.view);
    gl.uniformMatrix4fv(common.uProj, false, common.proj);
    gl.uniformMatrix3fv(common.uNormalMat, false, common.normalMat);

    gl.uniform3fv(common.uLightDirW, common.lightDir);
    gl.uniform3fv(common.uLightColor, common.lightColor);
    gl.uniform3fv(common.uAmbientColor, common.ambientColor);
    gl.uniform3fv(common.uViewPos, common.viewPos);

    gl.bindVertexArray(this.vaoSolid);
    gl.drawArrays(gl.TRIANGLES, 0, this.outCount);
    gl.bindVertexArray(null);
  }

  drawWire(gl, prog, common, color=[1,1,1]) {
    gl.useProgram(prog);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.posTex);
    gl.uniform1i(common.uPosTex, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.nrmTex);
    gl.uniform1i(common.uNrmTex, 1);

    // Primary animation
    gl.uniform1i(common.uFrame0A, common.frame0A);
    gl.uniform1i(common.uFrame1A, common.frame1A);
    gl.uniform1f(common.uFrameFracA, common.frameFracA);

    // Secondary animation
    gl.uniform1i(common.uFrame0B, common.frame0B);
    gl.uniform1i(common.uFrame1B, common.frame1B);
    gl.uniform1f(common.uFrameFracB, common.frameFracB);

    // Blend factor
    gl.uniform1f(common.uAnimBlend, common.animBlend);

    gl.uniform1f(common.uNumFrames, this.numFrames);
    gl.uniform1f(common.uTexWidth, this.texWidth);

    gl.uniformMatrix4fv(common.uModel, false, common.model);
    gl.uniformMatrix4fv(common.uView, false, common.view);
    gl.uniformMatrix4fv(common.uProj, false, common.proj);
    gl.uniformMatrix3fv(common.uNormalMat, false, common.normalMat);

    gl.uniform3fv(common.uColor, color);

    gl.bindVertexArray(this.vaoWire);
    gl.drawElements(gl.LINES, this.lineIdx.length, gl.UNSIGNED_INT, 0);
    gl.bindVertexArray(null);
  }

  dispose() {
    const gl = this.gl;
    if (this.posTex) gl.deleteTexture(this.posTex);
    if (this.nrmTex) gl.deleteTexture(this.nrmTex);
    if (this.albedoTex) gl.deleteTexture(this.albedoTex);
    if (this.vboIndex) gl.deleteBuffer(this.vboIndex);
    if (this.vboUV) gl.deleteBuffer(this.vboUV);
    if (this.eboLines) gl.deleteBuffer(this.eboLines);
    if (this.vaoSolid) gl.deleteVertexArray(this.vaoSolid);
    if (this.vaoWire) gl.deleteVertexArray(this.vaoWire);
  }
}

// App state
let gl, canvas;
let progSolid, progWire;
let locSolid = {};
let locWire = {};

let character = null;
let weapon = null;
let characterLoader = null;
let animationController = null;

const MODEL_SCALE = 0.3;
const ROT_X = -Math.PI / 2;

let currentCharacterName = 'ratamahatta';
let currentSkin = 'ratamahatta';
let currentWeapon = '';
let animationSpeed = 1.0;
let wireframe = false;

let lastTime = 0;

// Setup UI with new animation categories
function setupControls() {
  const speed = document.getElementById('speed');
  const wire = document.getElementById('wireframe');
  const characters = document.getElementById('characters');
  const skins = document.getElementById('skins');
  const weapons = document.getElementById('weapons');
  const az = document.getElementById('lightAzimuth');
  const el = document.getElementById('lightElevation');

  // Stance and movement buttons
  const standStillBtn = document.getElementById('standStillBtn');
  const standMoveBtn = document.getElementById('standMoveBtn');
  const crouchStillBtn = document.getElementById('crouchStillBtn');
  const crouchMoveBtn = document.getElementById('crouchMoveBtn');

  // Jump button
  const jumpBtn = document.getElementById('jumpBtn');

  // Resurrect button
  const resurrectBtn = document.getElementById('resurrectBtn');

  speed.addEventListener('input', () => {
    animationSpeed = parseFloat(speed.value);
  });
  
  wire.addEventListener('change', () => {
    wireframe = wire.checked;
  });

  characters.addEventListener('change', async () => {
    currentCharacterName = characters.value;
    characterLoader.setCurrentCharacter(currentCharacterName);
    
    if (weapon) {
      weapon.dispose();
      weapon = null;
    }
    currentWeapon = '';
    
    // Reset animation controller
    animationController = new AnimationController();
    
    populateSkinsAndWeapons();
    updateDynamicButtons();
    await reloadCharacter();
  });

  skins.addEventListener('change', async () => {
    currentSkin = skins.value;
    await reloadCharacterAlbedo();
    // Drop focus so WASD doesn't accidentally type-select in the dropdown
    skins.blur();
  });

  weapons.addEventListener('change', async () => {
    currentWeapon = weapons.value;
    await reloadWeapon();
    weapons.blur();
  });

  // Stance and movement controls
  standStillBtn.addEventListener('click', () => {
    animationController.setStanceAndMovement('standing', false);
  });

  standMoveBtn.addEventListener('click', () => {
    animationController.setStanceAndMovement('standing', true);
  });

  crouchStillBtn.addEventListener('click', () => {
    animationController.setStanceAndMovement('crouching', false);
  });

  crouchMoveBtn.addEventListener('click', () => {
    animationController.setStanceAndMovement('crouching', true);
  });

  // Jump control
  jumpBtn.addEventListener('click', () => {
    animationController.playJump();
  });

  // Resurrect control
  resurrectBtn.addEventListener('click', () => {
    animationController.resurrect();
    updateDynamicButtons();
  });

  az.addEventListener('input', () => {
    lightAzimuth = (parseFloat(az.value) * Math.PI) / 180;
  });

  el.addEventListener('input', () => {
    lightElevation = (parseFloat(el.value) * Math.PI) / 180;
  });
}

// Keyboard controls (WASD + Space)
function setupKeyboardControls() {
  const onKeyDown = (e) => {
    const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
    // Ignore inputs when UI fields are focused to prevent unintended dropdown changes
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || tag === 'button') return;

    switch (e.code) {
      case 'KeyW': if (!keys.w) { keys.w = true; updateMovementFromKeys(); e.preventDefault(); } break;
      case 'KeyA': if (!keys.a) { keys.a = true; updateMovementFromKeys(); e.preventDefault(); } break;
      case 'KeyS': if (!keys.s) { keys.s = true; updateMovementFromKeys(); e.preventDefault(); } break;
      case 'KeyD': if (!keys.d) { keys.d = true; updateMovementFromKeys(); e.preventDefault(); } break;
      case 'KeyC': {
        // Toggle crouch/stand (animationController guards jumping/dead internally)
        const next = (animationController.stance === 'standing') ? 'crouching' : 'standing';
        animationController.setStance(next);
        updateDynamicButtons(); // reflect stance-specific buttons enabled/disabled
        e.preventDefault();
        break;
      }
      case 'Space':
        e.preventDefault();
        animationController.playJump();
        break;
      default: break;
    }
  };
  const onKeyUp = (e) => {
    const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || tag === 'button') return;

    switch (e.code) {
      case 'KeyW': keys.w = false; updateMovementFromKeys(); e.preventDefault(); break;
      case 'KeyA': keys.a = false; updateMovementFromKeys(); e.preventDefault(); break;
      case 'KeyS': keys.s = false; updateMovementFromKeys(); e.preventDefault(); break;
      case 'KeyD': keys.d = false; updateMovementFromKeys(); e.preventDefault(); break;
      default: break;
    }
  };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
}

// Update dynamic buttons based on current stance
function updateDynamicButtons() {
  const combatContainer = document.getElementById('combatActions');
  const deathContainer = document.getElementById('deathActions');
  
  // Clear existing buttons
  combatContainer.innerHTML = '';
  deathContainer.innerHTML = '';
  
  // Get all possible animations
  const standingOneShots = animationController.standingAnimations.oneShots;
  const crouchingOneShots = animationController.crouchingAnimations.oneShots;
  const standingDeaths = animationController.standingAnimations.deaths;
  const crouchingDeaths = animationController.crouchingAnimations.deaths;
  
  // Combine and deduplicate all one-shot animations
  const allOneShots = [...new Set([...standingOneShots, ...crouchingOneShots])];
  const allDeaths = [...new Set([...standingDeaths, ...crouchingDeaths])];
  
  // Create combat action buttons (always show all)
  allOneShots.forEach(animName => {
    const btn = document.createElement('button');
    btn.id = animName + 'Btn';
    btn.className = 'anim-btn combat-btn';
    btn.textContent = getButtonLabel(animName);
    btn.addEventListener('click', () => {
      animationController.playOneShot(animName);
    });
    combatContainer.appendChild(btn);
  });
  
  // Create death animation buttons (always show all)
  allDeaths.forEach(animName => {
    const btn = document.createElement('button');
    btn.id = animName + 'Btn';
    btn.className = 'anim-btn death-btn';
    btn.textContent = getButtonLabel(animName);
    btn.addEventListener('click', () => {
      animationController.playDeath(animName);
    });
    deathContainer.appendChild(btn);
  });
}

// Helper function to get nice button labels
function getButtonLabel(animName) {
  const labels = {
    'attack': 'ATTACK',
    'pain1': 'PAIN 1',
    'pain2': 'PAIN 2', 
    'pain3': 'PAIN 3',
    'flip': 'FLIP',
    'salute': 'SALUTE',
    'taunt': 'TAUNT',
    'wave': 'WAVE',
    'point': 'POINT',
    'crattack': 'CR.ATTACK',
    'crpain': 'CR.PAIN',
    'death1': 'DEATH 1',
    'death2': 'DEATH 2',
    'death3': 'DEATH 3',
    'crdeath': 'CR.DEATH'
  };
  return labels[animName] || animName.toUpperCase();
}

function populateCharacters() {
  const charactersSelect = document.getElementById('characters');
  charactersSelect.innerHTML = '';

  const characters = characterLoader.getAvailableCharacters();
  
  for (const char of characters) {
    const option = document.createElement('option');
    option.value = char.name;
    option.textContent = char.name;
    charactersSelect.appendChild(option);
  }

  if (characters.length > 0) {
    currentCharacterName = characters[0].name;
    charactersSelect.value = currentCharacterName;
    characterLoader.setCurrentCharacter(currentCharacterName);
  }
}

function populateSkinsAndWeapons() {
  const currentChar = characterLoader.getCurrentCharacter();
  if (!currentChar) return;

  const skinsSelect = document.getElementById('skins');
  skinsSelect.innerHTML = '';
  
  for (const skin of currentChar.skins) {
    const option = document.createElement('option');
    option.value = skin.name;
    option.textContent = skin.name;
    skinsSelect.appendChild(option);
  }
  
  if (currentChar.skins.length > 0) {
    currentSkin = currentChar.skins[0].name;
    skinsSelect.value = currentSkin;
  }

  const weaponsSelect = document.getElementById('weapons');
  weaponsSelect.innerHTML = '';
  
  const noneOption = document.createElement('option');
  noneOption.value = '';
  noneOption.textContent = 'none';
  weaponsSelect.appendChild(noneOption);
  
  for (const weapon of currentChar.weapons) {
    const option = document.createElement('option');
    option.value = weapon.name;
    option.textContent = weapon.name;
    weaponsSelect.appendChild(option);
  }
  
  currentWeapon = '';
  weaponsSelect.value = currentWeapon;
}

function setupOrbitControls() {
  const onDown = (e) => { orbit.dragging = true; orbit.lastX = e.clientX; orbit.lastY = e.clientY; };
  const onUp = () => { orbit.dragging = false; };
  const onMove = (e) => {
    if (!orbit.dragging) return;
    const dx = e.clientX - orbit.lastX;
    const dy = e.clientY - orbit.lastY;
    orbit.lastX = e.clientX; orbit.lastY = e.clientY;
    orbit.azimuth += dx * 0.005;
    orbit.elevation += dy * 0.005;
    const limit = Math.PI/2 - 0.01;
    orbit.elevation = Math.max(-limit, Math.min(limit, orbit.elevation));
  };
  const onWheel = (e) => {
    orbit.distance *= (1 + e.deltaY * 0.001);
    orbit.distance = Math.max(5, Math.min(300, orbit.distance));
  };
  canvas.addEventListener('mousedown', onDown);
  window.addEventListener('mouseup', onUp);
  window.addEventListener('mousemove', onMove);
  canvas.addEventListener('wheel', onWheel, { passive: true });

  // Touch
  let pinchActive = false;
  let pinchStartDist = 0;
  let pinchStartOrbitDist = 0;

  function touchPoint(e, idx) {
    const t = e.touches[idx];
    return { x: t.clientX, y: t.clientY };
  }
  function touchDist(e) {
    const a = touchPoint(e, 0);
    const b = touchPoint(e, 1);
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.hypot(dx, dy);
  }

  const onTouchStart = (e) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      orbit.dragging = true;
      orbit.lastX = t.clientX;
      orbit.lastY = t.clientY;
    } else if (e.touches.length === 2) {
      pinchActive = true;
      pinchStartDist = touchDist(e);
      pinchStartOrbitDist = orbit.distance;
      const a = touchPoint(e, 0), b = touchPoint(e, 1);
      orbit.lastX = (a.x + b.x) * 0.5;
      orbit.lastY = (a.y + b.y) * 0.5;
    }
    e.preventDefault();
  };

  const onTouchMove = (e) => {
    if (pinchActive && e.touches.length === 2) {
      const d = touchDist(e);
      if (pinchStartDist > 0) {
        const ratio = pinchStartDist / d;
        orbit.distance = Math.max(5, Math.min(300, pinchStartOrbitDist * ratio));
      }
      e.preventDefault();
      return;
    }
    if (orbit.dragging && e.touches.length === 1) {
      const t0 = e.touches[0];
      const dx = t0.clientX - orbit.lastX;
      const dy = t0.clientY - orbit.lastY;
      orbit.lastX = t0.clientX;
      orbit.lastY = t0.clientY;
      orbit.azimuth += dx * 0.005;
      orbit.elevation += dy * 0.005;
      const limit = Math.PI/2 - 0.01;
      orbit.elevation = Math.max(-limit, Math.min(limit, orbit.elevation));
      e.preventDefault();
    }
  };

  const onTouchEnd = (e) => {
    if (e.touches.length === 0) {
      orbit.dragging = false;
      pinchActive = false;
      pinchStartDist = 0;
    } else if (e.touches.length === 1) {
      const t = e.touches[0];
      orbit.dragging = true;
      pinchActive = false;
      orbit.lastX = t.clientX;
      orbit.lastY = t.clientY;
    }
    e.preventDefault();
  };

  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  canvas.addEventListener('touchend', onTouchEnd, { passive: false });
  canvas.addEventListener('touchcancel', onTouchEnd, { passive: false });
}

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.floor(window.innerWidth * dpr);
  const h = Math.floor(window.innerHeight * dpr);
  canvas.width = w; canvas.height = h;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  gl.viewport(0, 0, w, h);
}

// Uniform locations for blending
function getSolidUniformLocations(gl, prog) {
  return {
    uPosTex: gl.getUniformLocation(prog, 'uPosTex'),
    uNrmTex: gl.getUniformLocation(prog, 'uNrmTex'),
    uAlbedo: gl.getUniformLocation(prog, 'uAlbedo'),
    uFrame0A: gl.getUniformLocation(prog, 'uFrame0A'),
    uFrame1A: gl.getUniformLocation(prog, 'uFrame1A'),
    uFrameFracA: gl.getUniformLocation(prog, 'uFrameFracA'),
    uFrame0B: gl.getUniformLocation(prog, 'uFrame0B'),
    uFrame1B: gl.getUniformLocation(prog, 'uFrame1B'),
    uFrameFracB: gl.getUniformLocation(prog, 'uFrameFracB'),
    uAnimBlend: gl.getUniformLocation(prog, 'uAnimBlend'),
    uNumFrames: gl.getUniformLocation(prog, 'uNumFrames'),
    uTexWidth: gl.getUniformLocation(prog, 'uTexWidth'),
    uModel: gl.getUniformLocation(prog, 'uModel'),
    uView: gl.getUniformLocation(prog, 'uView'),
    uProj: gl.getUniformLocation(prog, 'uProj'),
    uNormalMat: gl.getUniformLocation(prog, 'uNormalMat'),
    uLightDirW: gl.getUniformLocation(prog, 'uLightDirW'),
    uLightColor: gl.getUniformLocation(prog, 'uLightColor'),
    uAmbientColor: gl.getUniformLocation(prog, 'uAmbientColor'),
    uViewPos: gl.getUniformLocation(prog, 'uViewPos'),
  };
}

function getWireUniformLocations(gl, prog) {
  return {
    uPosTex: gl.getUniformLocation(prog, 'uPosTex'),
    uNrmTex: gl.getUniformLocation(prog, 'uNrmTex'),
    uFrame0A: gl.getUniformLocation(prog, 'uFrame0A'),
    uFrame1A: gl.getUniformLocation(prog, 'uFrame1A'),
    uFrameFracA: gl.getUniformLocation(prog, 'uFrameFracA'),
    uFrame0B: gl.getUniformLocation(prog, 'uFrame0B'),
    uFrame1B: gl.getUniformLocation(prog, 'uFrame1B'),
    uFrameFracB: gl.getUniformLocation(prog, 'uFrameFracB'),
    uAnimBlend: gl.getUniformLocation(prog, 'uAnimBlend'),
    uNumFrames: gl.getUniformLocation(prog, 'uNumFrames'),
    uTexWidth: gl.getUniformLocation(prog, 'uTexWidth'),
    uModel: gl.getUniformLocation(prog, 'uModel'),
    uView: gl.getUniformLocation(prog, 'uView'),
    uProj: gl.getUniformLocation(prog, 'uProj'),
    uNormalMat: gl.getUniformLocation(prog, 'uNormalMat'),
    uColor: gl.getUniformLocation(prog, 'uColor'),
  };
}

// Model loaders
async function loadMD2Model(md2Url, albedoUrl) {
  try {
    const buffer = await loadArrayBuffer(md2Url);
    const parsed = parseMD2(buffer);
    const expanded = buildExpandedMesh(parsed);
    const img = await loadImage(albedoUrl);
    const albedoTex = createAlbedoTexture(gl, img);
    return new MD2GPUModel(gl, expanded, parsed.frames, albedoTex);
  } catch (error) {
    console.error(`Failed to load MD2 model: ${md2Url}, texture: ${albedoUrl}`, error);
    throw error;
  }
}

async function reloadCharacter() {
  if (character) { character.dispose(); character = null; }
  
  const currentChar = characterLoader.getCurrentCharacter();
  if (!currentChar) return;

  const skinData = currentChar.skins.find(s => s.name === currentSkin);
  if (!skinData) {
    console.warn(`Skin ${currentSkin} not found for character ${currentChar.name}`);
    return;
  }

  try {
    character = await loadMD2Model(currentChar.mainModel, skinData.texture);
    console.log(`Loaded character: ${currentChar.name} with skin: ${currentSkin}`);
  } catch (error) {
    console.error(`Failed to load character ${currentChar.name}:`, error);
  }
}

async function reloadCharacterAlbedo() {
  if (!character) return;
  
  const currentChar = characterLoader.getCurrentCharacter();
  if (!currentChar) return;

  const skinData = currentChar.skins.find(s => s.name === currentSkin);
  if (!skinData) return;

  try {
    const img = await loadImage(skinData.texture);
    const newTex = createAlbedoTexture(gl, img);
    gl.deleteTexture(character.albedoTex);
    character.albedoTex = newTex;
    console.log(`Changed skin to: ${currentSkin}`);
  } catch (error) {
    console.error(`Failed to load skin ${currentSkin}:`, error);
  }
}

async function reloadWeapon() {
  if (weapon) { 
    weapon.dispose(); 
    weapon = null; 
  }
  
  if (!currentWeapon) return;

  const currentChar = characterLoader.getCurrentCharacter();
  if (!currentChar) return;

  const weaponData = currentChar.weapons.find(w => w.name === currentWeapon);
  if (!weaponData) {
    console.warn(`Weapon ${currentWeapon} not found for character ${currentChar.name}`);
    return;
  }

  try {
    weapon = await loadMD2Model(weaponData.model, weaponData.texture);
    console.log(`Loaded weapon: ${currentWeapon}`);
  } catch (error) {
    console.error(`Failed to load weapon ${currentWeapon}:`, error);
    weapon = null;
  }
}

// UI feedback + availability
function updateAnimationUI() {
  const state = animationController.getCurrentState();
  
  // Update stance buttons
  document.querySelectorAll('.stance-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById('jumpBtn').classList.remove('active');
  document.querySelectorAll('.anim-btn').forEach(btn => btn.classList.remove('active'));
  
  // Highlight current stance/movement combination
  if (state.stance === 'standing') {
    if (state.isMoving) {
      document.getElementById('standMoveBtn').classList.add('active');
    } else {
      document.getElementById('standStillBtn').classList.add('active');
    }
  } else { // crouching
    if (state.isMoving) {
      document.getElementById('crouchMoveBtn').classList.add('active');
    } else {
      document.getElementById('crouchStillBtn').classList.add('active');
    }
  }
  
  // Highlight jump
  if (state.isJumping) {
    document.getElementById('jumpBtn').classList.add('active');
  }
  
  // Highlight active one-shot
  if (animationController.currentOneShot) {
    const btn = document.getElementById(animationController.currentOneShot + 'Btn');
    if (btn) btn.classList.add('active');
  }
  
  // Highlight active death
  if (animationController.currentDeath) {
    const btn = document.getElementById(animationController.currentDeath + 'Btn');
    if (btn) btn.classList.add('active');
  }
  
  // Update debug info
  const debugInfo = document.getElementById('debugInfo');
  if (debugInfo) {
    debugInfo.innerHTML = `
      State: ${state.state}<br>
      Stance: ${state.stance} | Moving: ${state.isMoving}<br>
      Jumping: ${state.isJumping} | Dead: ${state.isDead}<br>
      Blend: ${(state.blendFactor * 100).toFixed(1)}%
    `;
  }
  
  // Enable/disable buttons based on stance and state
  updateButtonAvailability(state);
}

function updateButtonAvailability(state) {
  const validOneShots = animationController.getValidOneShots();
  const validDeaths = animationController.getValidDeaths();
  
  // Combat buttons
  document.querySelectorAll('.combat-btn').forEach(btn => {
    const animName = btn.id.replace('Btn', '');
    const isValid = validOneShots.includes(animName);
    const isEnabled = !state.isDead && isValid;
    
    btn.disabled = !isEnabled;
    
    // Add visual styling for stance-specific buttons
    if (animName.startsWith('cr')) {
      btn.classList.toggle('crouch-specific', true);
      btn.classList.remove('stand-specific');
      if (!isValid && !state.isDead) {
        btn.setAttribute('data-stance-required', 'Requires Crouching');
      }
    } else {
      btn.classList.toggle('stand-specific', true);
      btn.classList.remove('crouch-specific');
      if (!isValid && !state.isDead) {
        btn.setAttribute('data-stance-required', 'Requires Standing');
      }
    }
    
    // Add stance indication
    if (state.stance === 'standing') {
      btn.classList.toggle('wrong-stance', animName.startsWith('cr'));
    } else { // crouching
      btn.classList.toggle('wrong-stance', !animName.startsWith('cr'));
    }
    
    // Clear tooltip if button is valid
    if (isValid || state.isDead) {
      btn.removeAttribute('data-stance-required');
    }
    
    // Add dead state tooltip
    if (state.isDead) {
      btn.setAttribute('data-stance-required', 'Character is Dead');
    }
  });
  
  // Death buttons
  document.querySelectorAll('.death-btn').forEach(btn => {
    const animName = btn.id.replace('Btn', '');
    const isValid = validDeaths.includes(animName);
    
    btn.disabled = !isValid;
    
    // Add visual styling for stance-specific buttons
    if (animName.startsWith('cr')) {
      btn.classList.toggle('crouch-specific', true);
      btn.classList.remove('stand-specific');
      if (!isValid) {
        btn.setAttribute('data-stance-required', 'Requires Crouching');
      }
    } else {
      btn.classList.toggle('stand-specific', true);
      btn.classList.remove('crouch-specific');
      if (!isValid) {
        btn.setAttribute('data-stance-required', 'Requires Standing');
      }
    }
    
    // Add stance indication
    if (state.stance === 'standing') {
      btn.classList.toggle('wrong-stance', animName.startsWith('cr'));
    } else { // crouching
      btn.classList.toggle('wrong-stance', !animName.startsWith('cr'));
    }
    
    // Clear tooltip if button is valid
    if (isValid) {
      btn.removeAttribute('data-stance-required');
    }
  });
  
  // Stance buttons
  const stanceBtns = document.querySelectorAll('.stance-btn');
  const jumpBtn = document.getElementById('jumpBtn');
  
  if (state.isDead) {
    stanceBtns.forEach(btn => {
      btn.disabled = true;
      btn.setAttribute('data-stance-required', 'Character is Dead');
    });
    jumpBtn.disabled = true;
    jumpBtn.setAttribute('data-stance-required', 'Character is Dead');
  } else {
    stanceBtns.forEach(btn => {
      btn.disabled = state.isJumping;
      if (state.isJumping) {
        btn.setAttribute('data-stance-required', 'Cannot change stance while jumping');
      } else {
        btn.removeAttribute('data-stance-required');
      }
    });
    jumpBtn.disabled = false;
    jumpBtn.removeAttribute('data-stance-required');
  }
}

// Build 3x3 normal matrix for Ry(yaw)*Rx(ROT_X)
function normalMatYawX(yaw) {
  const sy = Math.sin(yaw), cy = Math.cos(yaw);
  const sx = Math.sin(ROT_X), cx = Math.cos(ROT_X);
  // R = Ry * Rx
  return new Float32Array([
    cy,       -sy*sx,  sy*cx,
    0,         cx,     sx,
    -sy,      -cy*sx,  cy*cx
  ]);
}

// Render loop with animation blending + yaw rotation
function render(timeMs) {
  const t = timeMs * 0.001;
  const delta = lastTime ? (t - lastTime) : 0;
  lastTime = t;

  // Smoothly rotate character towards targetYaw
  const yawLerpRate = 10.0; // rad/sec responsiveness
  charYaw += shortestAngleDelta(charYaw, targetYaw) * Math.min(1.0, yawLerpRate * delta);

  // Update animation controller
  const animData = animationController.update(delta, animationSpeed);
  
  // Update UI feedback
  updateAnimationUI();

  const aspect = canvas.width / canvas.height;
  const proj = Mat4.create();
  Mat4.perspective(proj, Math.PI / 4, aspect, 0.1, 1000);

  const eye = orbitEye();
  const view = Mat4.create();
  Mat4.lookAt(view, eye, orbit.target, [0,1,0]);

  // Model = Ry(yaw) * Rx(-90deg) * S(scale)
  const scaleM = Mat4.create(); Mat4.fromScaling(scaleM, MODEL_SCALE);
  const rotXM = Mat4.create(); Mat4.fromXRotation(rotXM, ROT_X);
  const yawM = Mat4.create();  Mat4.fromYRotation(yawM, charYaw);
  const rotXScale = Mat4.create(); Mat4.multiply(rotXScale, rotXM, scaleM);
  const model = Mat4.create(); Mat4.multiply(model, yawM, rotXScale);

  const normalMat = normalMatYawX(charYaw);

  const ld = lightDir();

  gl.clearColor(0.133, 0.133, 0.266, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const lightColor = new Float32Array([1.2, 1.2, 1.2]);
  const ambientColor = new Float32Array([0.35, 0.35, 0.38]);
  const viewPos = new Float32Array(eye);

  if (character) {
    if (wireframe) {
      const common = {
        uPosTex: locWire.uPosTex, uNrmTex: locWire.uNrmTex,
        uFrame0A: locWire.uFrame0A, uFrame1A: locWire.uFrame1A, uFrameFracA: locWire.uFrameFracA,
        uFrame0B: locWire.uFrame0B, uFrame1B: locWire.uFrame1B, uFrameFracB: locWire.uFrameFracB,
        uAnimBlend: locWire.uAnimBlend, uNumFrames: locWire.uNumFrames, uTexWidth: locWire.uTexWidth,
        uModel: locWire.uModel, uView: locWire.uView, uProj: locWire.uProj,
        uNormalMat: locWire.uNormalMat, uColor: locWire.uColor,
        frame0A: animData.frame0A, frame1A: animData.frame1A, frameFracA: animData.fracA,
        frame0B: animData.frame0B, frame1B: animData.frame1B, frameFracB: animData.fracB,
        animBlend: animData.blend, model, view, proj, normalMat
      };
      character.drawWire(gl, progWire, common, [1,1,1]);
    } else {
      const common = {
        uPosTex: locSolid.uPosTex, uNrmTex: locSolid.uNrmTex, uAlbedo: locSolid.uAlbedo,
        uFrame0A: locSolid.uFrame0A, uFrame1A: locSolid.uFrame1A, uFrameFracA: locSolid.uFrameFracA,
        uFrame0B: locSolid.uFrame0B, uFrame1B: locSolid.uFrame1B, uFrameFracB: locSolid.uFrameFracB,
        uAnimBlend: locSolid.uAnimBlend, uNumFrames: locSolid.uNumFrames, uTexWidth: locSolid.uTexWidth,
        uModel: locSolid.uModel, uView: locSolid.uView, uProj: locSolid.uProj,
        uNormalMat: locSolid.uNormalMat, uLightDirW: locSolid.uLightDirW,
        uLightColor: locSolid.uLightColor, uAmbientColor: locSolid.uAmbientColor, uViewPos: locSolid.uViewPos,
        frame0A: animData.frame0A, frame1A: animData.frame1A, frameFracA: animData.fracA,
        frame0B: animData.frame0B, frame1B: animData.frame1B, frameFracB: animData.fracB,
        animBlend: animData.blend, model, view, proj, normalMat,
        lightDir: new Float32Array(ld), lightColor, ambientColor, viewPos
      };
      character.drawSolid(gl, progSolid, common);
    }
  }

  if (weapon) {
    if (wireframe) {
      const common = {
        uPosTex: locWire.uPosTex, uNrmTex: locWire.uNrmTex,
        uFrame0A: locWire.uFrame0A, uFrame1A: locWire.uFrame1A, uFrameFracA: locWire.uFrameFracA,
        uFrame0B: locWire.uFrame0B, uFrame1B: locWire.uFrame1B, uFrameFracB: locWire.uFrameFracB,
        uAnimBlend: locWire.uAnimBlend, uNumFrames: locWire.uNumFrames, uTexWidth: locWire.uTexWidth,
        uModel: locWire.uModel, uView: locWire.uView, uProj: locWire.uProj,
        uNormalMat: locWire.uNormalMat, uColor: locWire.uColor,
        frame0A: animData.frame0A, frame1A: animData.frame1A, frameFracA: animData.fracA,
        frame0B: animData.frame0B, frame1B: animData.frame1B, frameFracB: animData.fracB,
        animBlend: animData.blend, model, view, proj, normalMat
      };
      weapon.drawWire(gl, progWire, common, [0,1,0]);
    } else {
      const common = {
        uPosTex: locSolid.uPosTex, uNrmTex: locSolid.uNrmTex, uAlbedo: locSolid.uAlbedo,
        uFrame0A: locSolid.uFrame0A, uFrame1A: locSolid.uFrame1A, uFrameFracA: locSolid.uFrameFracA,
        uFrame0B: locSolid.uFrame0B, uFrame1B: locSolid.uFrame1B, uFrameFracB: locSolid.uFrameFracB,
        uAnimBlend: locSolid.uAnimBlend, uNumFrames: locSolid.uNumFrames, uTexWidth: locSolid.uTexWidth,
        uModel: locSolid.uModel, uView: locSolid.uView, uProj: locSolid.uProj,
        uNormalMat: locSolid.uNormalMat, uLightDirW: locSolid.uLightDirW,
        uLightColor: locSolid.uLightColor, uAmbientColor: locSolid.uAmbientColor, uViewPos: locSolid.uViewPos,
        frame0A: animData.frame0A, frame1A: animData.frame1A, frameFracA: animData.fracA,
        frame0B: animData.frame0B, frame1B: animData.frame1B, frameFracB: animData.fracB,
        animBlend: animData.blend, model, view, proj, normalMat,
        lightDir: new Float32Array(ld), lightColor, ambientColor, viewPos
      };
      weapon.drawSolid(gl, progSolid, common);
    }
  }

  requestAnimationFrame(render);
}

// Initialization
async function init() {
  const container = document.getElementById('container');
  canvas = document.createElement('canvas');
  canvas.style.display = 'block';
  container.appendChild(canvas);

  gl = createGL(canvas);

  progSolid = linkProgram(gl, blendingVS, blendingFS);
  progWire = linkProgram(gl, blendingWireVS, blendingWireFS);

  locSolid = getSolidUniformLocations(gl, progSolid);
  locWire = getWireUniformLocations(gl, progWire);

  characterLoader = new CharacterLoader();
  animationController = new AnimationController();
  
  setupControls();
  setupKeyboardControls();
  populateCharacters();
  populateSkinsAndWeapons();
  updateDynamicButtons(); // Initialize dynamic buttons
  setupOrbitControls();

  window.addEventListener('resize', resize);
  resize();

  await reloadCharacter();
  if (currentWeapon) {
    await reloadWeapon();
  }
  
  requestAnimationFrame(render);
}

init();