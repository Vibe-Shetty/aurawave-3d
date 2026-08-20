import { useEffect, useRef } from 'react';

const VS_SOURCE = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`;

const FS_SOURCE = `
  precision mediump float;
  uniform sampler2D u_texture;
  varying vec2 v_texCoord;
  void main() {
    vec4 color = texture2D(u_texture, v_texCoord);
    // Find minimum RGB channel to detect pure white / near-white
    float minChannel = min(min(color.r, color.g), color.b);
    
    // Smooth anti-aliased edge falloff from 0.88 to 0.98
    float alpha = 1.0 - smoothstep(0.88, 0.98, minChannel);
    
    // Output transparent color with pre-multiplied alpha for clean blending
    gl_FragColor = vec4(color.rgb * alpha, alpha);
  }
`;

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl, vs, fs) {
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program error:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

export default function TransparentVideo({ src, className }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // Use hardware-accelerated WebGL with alpha support
    const gl = canvas.getContext('webgl', { 
      alpha: true, 
      premultipliedAlpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });

    if (!gl) {
      console.warn('WebGL not supported, falling back');
      return;
    }

    const vs = createShader(gl, gl.VERTEX_SHADER, VS_SOURCE);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, FS_SOURCE);
    const program = createProgram(gl, vs, fs);
    gl.useProgram(program);

    // Buffers for full-screen quad
    const positionLocation = gl.getAttribLocation(program, 'a_position');
    const texCoordLocation = gl.getAttribLocation(program, 'a_texCoord');

    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
        -1,  1,
         1, -1,
         1,  1,
      ]),
      gl.STATIC_DRAW
    );
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const texBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        0, 0,
        1, 0,
        0, 1,
        0, 1,
        1, 0,
        1, 1,
      ]),
      gl.STATIC_DRAW
    );
    gl.enableVertexAttribArray(texCoordLocation);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);

    // Texture configuration
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    let isRunning = true;
    let animId;

    const render = () => {
      if (!isRunning) return;

      if (video.readyState >= 2 && !video.paused && !video.ended) {
        const w = video.videoWidth || 640;
        const h = video.videoHeight || 640;

        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
          gl.viewport(0, 0, w, h);
        }

        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        // Upload video frame to GPU texture (zero CPU pixel loops)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
        
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }

      if ('requestVideoFrameCallback' in HTMLVideoElement.prototype && video.requestVideoFrameCallback) {
        video.requestVideoFrameCallback(render);
      } else {
        animId = requestAnimationFrame(render);
      }
    };

    video.addEventListener('playing', render);
    if (!video.paused) {
      render();
    }

    return () => {
      isRunning = false;
      if (animId) cancelAnimationFrame(animId);
      video.removeEventListener('playing', render);
      gl.deleteTexture(texture);
      gl.deleteProgram(program);
    };
  }, [src]);

  return (
    <div className={`transparent-video-container ${className || ''}`}>
      <video
        ref={videoRef}
        src={src}
        autoPlay
        loop
        muted
        playsInline
        crossOrigin="anonymous"
        style={{ display: 'none' }}
      />
      <canvas ref={canvasRef} className="transparent-video-canvas" />
    </div>
  );
}
