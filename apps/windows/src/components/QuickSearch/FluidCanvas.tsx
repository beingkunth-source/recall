import { useEffect, useRef } from 'react';

const VERTEX_SHADER = `
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision highp float;
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;
uniform float uIntensity;
varying vec2 vUv;

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                     -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x  = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float fbm(vec2 p) {
  float f = 0.0;
  float w = 0.5;
  for (int i = 0; i < 5; i++) {
    f += w * snoise(p);
    p = p * 2.04 + vec2(100.0);
    w *= 0.5;
  }
  return f;
}

void main() {
  vec2 st = (gl_FragCoord.xy - 0.5 * uResolution.xy) / min(uResolution.x, uResolution.y);
  float t = uTime * 0.18;

  // Multi-tier domain warping for organic liquid curl
  vec2 q = vec2(0.0);
  q.x = fbm(st * 1.5 + vec2(0.0, t * 0.38));
  q.y = fbm(st * 1.5 + vec2(5.2, 1.3 - t * 0.28));

  vec2 r = vec2(0.0);
  r.x = fbm(st * 2.0 + 3.2 * q + vec2(1.7, 9.2 + t * 0.42));
  r.y = fbm(st * 2.0 + 3.2 * q + vec2(8.3, 2.8 - t * 0.32));

  // Interactive mouse fluid push
  vec2 mDiff = (uMouse - vUv);
  float mDist = length(mDiff);
  float mPush = exp(-mDist * 5.5) * 0.35;
  r += mDiff * mPush;

  float f = fbm(st * 1.8 + 3.5 * r + vec2(0.0, t * 0.16));
  f = clamp((f + 0.72) * 0.7, 0.0, 1.0);

  // Volumetric density
  float fluid = smoothstep(0.12, 0.9, f);
  fluid = pow(fluid, 1.35) * uIntensity;

  // Fluid bottom plume concentration
  float bottomPlume = smoothstep(-0.8, 0.5, -st.y);
  fluid = mix(fluid * 0.65, fluid * 1.35, bottomPlume);

  // Fluid palette: obsidian glass + iridescent azure / violet caustics + silk white highlights
  vec3 deepGlass = vec3(0.04, 0.04, 0.07);
  vec3 azureCaustic = vec3(0.12, 0.42, 0.88);
  vec3 silkWhite = vec3(0.95, 0.96, 1.0);

  vec3 col = mix(deepGlass, azureCaustic, fluid * 0.6);
  col = mix(col, silkWhite, pow(fluid, 2.2) * 0.9);

  // Specular rim light caustics
  float caustics = length(q) * 0.28 * uIntensity;
  col += vec3(0.2, 0.4, 0.7) * caustics;

  float alpha = clamp(0.25 + fluid * 0.55, 0.0, 0.85);
  gl_FragColor = vec4(col, alpha);
}
`;

function createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

interface FluidCanvasProps {
  isSearching?: boolean;
  className?: string;
}

export default function FluidCanvas({ isSearching = false, className = '' }: FluidCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isSearchingRef = useRef(isSearching);
  isSearchingRef.current = isSearching;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: true,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance',
    });
    if (!gl) return;

    const vert = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const frag = createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vert || !frag) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      return;
    }

    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const posLoc = gl.getAttribLocation(program, 'position');
    const uTimeLoc = gl.getUniformLocation(program, 'uTime');
    const uResLoc = gl.getUniformLocation(program, 'uResolution');
    const uMouseLoc = gl.getUniformLocation(program, 'uMouse');
    const uIntensityLoc = gl.getUniformLocation(program, 'uIntensity');

    let animId = 0;
    let lastTime = performance.now();
    let timeAccum = 0;
    let speed = 1.0;
    let intensity = 0.9;
    let mouse = { x: 0.5, y: 0.5 };
    let targetMouse = { x: 0.5, y: 0.5 };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      targetMouse = {
        x: (e.clientX - rect.left) / rect.width,
        y: 1.0 - (e.clientY - rect.top) / rect.height,
      };
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(canvas.clientWidth * dpr);
      const h = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };
    resize();
    window.addEventListener('resize', resize);

    // 144Hz Delta-timed simulation loop
    const render = (now: number) => {
      resize();
      gl.useProgram(program);

      const dt = Math.min((now - lastTime) * 0.001, 0.05);
      lastTime = now;

      // Reactively speed up and intensify during active searches
      const targetSpeed = isSearchingRef.current ? 2.2 : 1.0;
      speed += (targetSpeed - speed) * 0.08;

      const targetIntensity = isSearchingRef.current ? 1.35 : 0.9;
      intensity += (targetIntensity - intensity) * 0.08;

      timeAccum += dt * speed;

      // Mouse lerp for buttery trailing motion
      mouse.x += (targetMouse.x - mouse.x) * 0.09;
      mouse.y += (targetMouse.y - mouse.y) * 0.09;

      gl.uniform1f(uTimeLoc, timeAccum);
      gl.uniform2f(uResLoc, canvas.width, canvas.height);
      gl.uniform2f(uMouseLoc, mouse.x, mouse.y);
      gl.uniform1f(uIntensityLoc, intensity);

      gl.enableVertexAttribArray(posLoc);
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', resize);
      gl.deleteBuffer(posBuffer);
      gl.deleteProgram(program);
      gl.deleteShader(vert);
      gl.deleteShader(frag);
    };
  }, []);

  return <canvas ref={canvasRef} className={`qs-fluent-fluid-canvas ${className}`} aria-hidden="true" />;
}
