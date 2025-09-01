export const blendingVS = `#version 300 es
precision highp float;

layout(location=0) in float aOrigIndex;
layout(location=1) in vec2  aUV;

uniform sampler2D uPosTex;
uniform sampler2D uNrmTex;

// Primary animation (cyclic)
uniform int   uFrame0A;
uniform int   uFrame1A;
uniform float uFrameFracA;

// Secondary animation (oneshot/death)
uniform int   uFrame0B;
uniform int   uFrame1B;
uniform float uFrameFracB;

// Blend factor (0.0 = full A, 1.0 = full B)
uniform float uAnimBlend;

uniform float uNumFrames;
uniform float uTexWidth;
uniform mat4  uModel;
uniform mat4  uView;
uniform mat4  uProj;
uniform mat3  uNormalMat;

out vec2 vUV;
out vec3 vNormalW;
out vec3 vPosW;

vec3 sampleFrame(sampler2D tex, float f, float index) {
  float s = (index + 0.5) / uTexWidth;
  float t = (f + 0.5) / uNumFrames;
  return texture(tex, vec2(s, t)).xyz;
}

void main() {
  // Sample primary animation
  vec3 posA0 = sampleFrame(uPosTex, float(uFrame0A), aOrigIndex);
  vec3 posA1 = sampleFrame(uPosTex, float(uFrame1A), aOrigIndex);
  vec3 posA = mix(posA0, posA1, uFrameFracA);
  
  vec3 nrmA0 = sampleFrame(uNrmTex, float(uFrame0A), aOrigIndex);
  vec3 nrmA1 = sampleFrame(uNrmTex, float(uFrame1A), aOrigIndex);
  vec3 nrmA = normalize(mix(nrmA0, nrmA1, uFrameFracA));
  
  // Sample secondary animation
  vec3 posB0 = sampleFrame(uPosTex, float(uFrame0B), aOrigIndex);
  vec3 posB1 = sampleFrame(uPosTex, float(uFrame1B), aOrigIndex);
  vec3 posB = mix(posB0, posB1, uFrameFracB);
  
  vec3 nrmB0 = sampleFrame(uNrmTex, float(uFrame0B), aOrigIndex);
  vec3 nrmB1 = sampleFrame(uNrmTex, float(uFrame1B), aOrigIndex);
  vec3 nrmB = normalize(mix(nrmB0, nrmB1, uFrameFracB));
  
  // Blend between animations
  vec3 finalPos = mix(posA, posB, uAnimBlend);
  vec3 finalNrm = normalize(mix(nrmA, nrmB, uAnimBlend));
  
  vec4 pw = uModel * vec4(finalPos, 1.0);
  vPosW = pw.xyz;
  vNormalW = normalize(uNormalMat * finalNrm);
  vUV = aUV;

  gl_Position = uProj * uView * pw;
}
`;

export const blendingFS = `#version 300 es
precision highp float;

in vec2 vUV;
in vec3 vNormalW;
in vec3 vPosW;

uniform sampler2D uAlbedo;
uniform vec3 uLightDirW;
uniform vec3 uLightColor;
uniform vec3 uAmbientColor;
uniform vec3 uViewPos;

out vec4 fragColor;

void main() {
  vec3 albedo = texture(uAlbedo, vUV).rgb;

  vec3 N = normalize(vNormalW);
  vec3 L = normalize(uLightDirW);
  vec3 V = normalize(uViewPos - vPosW);

  float NdotL = max(dot(N, L), 0.0);
  float wrap = 0.2;
  float NdotLWrap = max((dot(N, L) + wrap) / (1.0 + wrap), 0.0);

  vec3 H = normalize(L + V);
  float NdotH = max(dot(N, H), 0.0);
  float spec = pow(NdotH, 32.0) * 0.25;

  vec3 lighting = uAmbientColor + uLightColor * (NdotLWrap + spec);
  vec3 color = albedo * lighting;

  fragColor = vec4(color, 1.0);
}
`;

// Wire shader with blending
export const blendingWireVS = blendingVS;
export const blendingWireFS = `#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec3 uColor;
void main() {
  fragColor = vec4(uColor, 1.0);
}
`;