export interface Program {
  handle: WebGLProgram;
  u: Record<string, WebGLUniformLocation>;
}

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`VFX shader: ${log}`);
  }
  return shader;
}

export function createProgram(gl: WebGL2RenderingContext, vertex: string, fragment: string): Program {
  const handle = gl.createProgram()!;
  const vs = compile(gl, gl.VERTEX_SHADER, vertex);
  const fs = compile(gl, gl.FRAGMENT_SHADER, fragment);
  gl.attachShader(handle, vs);
  gl.attachShader(handle, fs);
  gl.linkProgram(handle);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(handle, gl.LINK_STATUS)) throw new Error(`VFX program: ${gl.getProgramInfoLog(handle)}`);
  const u: Record<string, WebGLUniformLocation> = {};
  const count = gl.getProgramParameter(handle, gl.ACTIVE_UNIFORMS) as number;
  for (let i = 0; i < count; i++) {
    const info = gl.getActiveUniform(handle, i)!;
    u[info.name.replace(/\[0\]$/, '')] = gl.getUniformLocation(handle, info.name)!;
  }
  return { handle, u };
}

/** Unit quad as a triangle strip on attribute 0. */
export function createQuad(gl: WebGL2RenderingContext) {
  const vao = gl.createVertexArray()!;
  gl.bindVertexArray(vao);
  const buffer = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);
  return vao;
}

export const CONTEXT_OPTIONS: WebGLContextAttributes = {
  alpha: true,
  premultipliedAlpha: true,
  antialias: false,
  depth: false,
  stencil: false,
  preserveDrawingBuffer: false,
  powerPreference: 'default',
};
