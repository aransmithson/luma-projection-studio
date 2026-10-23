import { boundingMap, bounds, inverseQuadMap, triangles } from "./geometry";
import { drawEffect } from "./effects";
import { MediaPlayers } from "./mediaPlayback";
import { photoSurface, photoUrl } from "./scene";
import { projectionItems, renderedProject } from "./layers";
import { contentMatrix } from "./contentTransform";
import { isMusicEffect, silentAudio } from "./audioAnalysis";
import { drawMusicEffect } from "./effects/music";
import { hasCurves, surfaceOutline } from "./curves";
import { stackFlow } from "./stackFlow";
import { drawLiquid, drawStackLinks } from "./effects/stacked";
import { chaseRoute } from "./chaseRoute";
import { drawLinkedChase } from "./effects/chaseScenes";
import { drawLinkedPortal } from "./effects/portalScene";
import { drawLinkedStory } from "./effects/linkedStories";
import { drawEdgeRunner } from "./effects/edgeRunner";
import { drawToyTrain } from "./effects/toyTrain";
import { hslHex, hue } from "./effects/common";
import { drawPlacementMesh } from "./placementMesh";
import { effectById } from "./catalog";
import { cutoutsFor, effectiveSolo } from "./cutouts";
import {
  blendIndex,
  blendShader,
  overlayShader,
  overlayStyles,
  overlayPhase,
  paletteUniforms,
} from "./compositing";
import type {
  LiquidStack,
  Playback,
  Point,
  Project,
  RenderState,
  Surface,
} from "./types";

export function playbackTime(playback: Playback, now = Date.now()) {
  return (
    (playback.offset + (playback.playing ? now - playback.startedAt : 0)) / 1000
  );
}

const vertexSource = `
attribute vec2 a_position;
varying vec2 v_position;
void main() {
  v_position = a_position;
  gl_Position = vec4(a_position.x * 2.0 - 1.0, 1.0 - a_position.y * 2.0, 0.0, 1.0);
}`;
const fragmentSource = `
precision mediump float;
varying vec2 v_position;
uniform sampler2D u_texture;
uniform mat3 u_mapping;
uniform mat3 u_content;
uniform float u_opacity;
uniform float u_mediaAlpha;
uniform float u_sceneMapping;
uniform float u_brightness;
uniform float u_feather;
uniform float u_aspect;
uniform vec2 u_points[65];
uniform int u_count;
uniform sampler2D u_backdrop;
uniform vec2 u_resolution;
uniform int u_blend;
${blendShader}
${overlayShader}
void main() {
  vec3 mapped = u_mapping * vec3(v_position, 1.0);
  vec2 mappedUv = mapped.xy / mapped.z;
  vec2 uv = mix(clamp(mappedUv, 0.0, 1.0), mappedUv, u_sceneMapping);
  uv = (u_content * vec3(uv, 1.0)).xy;
  vec4 color = texture2D(u_texture, clamp(uv, 0.0, 1.0));
  float coverage = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
  float alpha = u_opacity * coverage * mix(1.0, color.a, u_mediaAlpha);
  if (u_feather > 0.0) {
    float nearest = 10.0;
    vec2 ratio = vec2(u_aspect, 1.0);
    for (int i = 0; i < 64; i++) {
      if (i >= u_count) break;
      vec2 a = u_points[i] * ratio;
      vec2 b = u_points[i + 1] * ratio;
      vec2 p = v_position * ratio;
      vec2 edge = b - a;
      float k = clamp(dot(p - a, edge) / max(dot(edge, edge), 0.000001), 0.0, 1.0);
      nearest = min(nearest, length(p - a - k * edge));
    }
    alpha *= smoothstep(0.0, u_feather, nearest);
  }
  vec3 source = overlayColor(color.rgb, uv) * u_brightness;
  if (u_blend >= 3) {
    vec3 backdrop = texture2D(u_backdrop, gl_FragCoord.xy / u_resolution).rgb;
    gl_FragColor = vec4(mix(backdrop, blendColor(backdrop, source, u_blend), alpha), 1.0);
  } else gl_FragColor = vec4(source * alpha, alpha);
}`;

type SurfaceResource = {
  sourceAlpha: boolean;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: WebGLTexture;
  buffer: WebGLBuffer;
  geometryKey: string;
  vertexCount: number;
  mapping: Float32Array;
  edges: Float32Array;
  edgeCount: number;
  outline: Point[];
  effectKey: string;
  mediaKey: string;
  textureWidth: number;
  textureHeight: number;
};

export class ProjectionRenderer {
  private mediaPlayers = new MediaPlayers();
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private position: number;
  private uniforms: Record<string, WebGLUniformLocation | null> = {};
  private resources = new Map<string, SurfaceResource>();
  private testCanvas = document.createElement("canvas");
  private backdrop: WebGLTexture;
  private backdropWidth = 1;
  private backdropHeight = 1;
  private time = 0;
  private photo: HTMLImageElement | null = null;
  private photoId = "";
  private photoRetry = 0;
  private unsubscribePhoto?: () => void;

  constructor(private canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: true,
      stencil: true,
      powerPreference: "high-performance",
      preserveDrawingBuffer: false,
    });
    if (!gl)
      throw new Error(
        "WebGL is unavailable. Enable hardware acceleration or update your graphics driver.",
      );
    this.gl = gl;
    const shader = (type: number, source: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, source);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        const message = gl.getShaderInfoLog(s);
        gl.deleteShader(s);
        throw new Error(
          message || "Unable to compile the projection renderer.",
        );
      }
      return s;
    };
    const vs = shader(gl.VERTEX_SHADER, vertexSource),
      fs = shader(gl.FRAGMENT_SHADER, fragmentSource);
    this.program = gl.createProgram()!;
    gl.attachShader(this.program, vs);
    gl.attachShader(this.program, fs);
    gl.linkProgram(this.program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS))
      throw new Error("Unable to start the projection renderer.");
    this.position = gl.getAttribLocation(this.program, "a_position");
    for (const name of [
      "texture",
      "mapping",
      "content",
      "opacity",
      "mediaAlpha",
      "sceneMapping",
      "brightness",
      "feather",
      "aspect",
      "points",
      "count",
      "backdrop",
      "resolution",
      "blend",
      "overlayStyle",
      "overlayBlend",
      "overlayIntensity",
      "overlayPhase",
      "overlayScale",
      "textureAspect",
      "palette",
    ])
      this.uniforms[name] = gl.getUniformLocation(
        this.program,
        `u_${name}${name === "points" || name === "palette" ? "[0]" : ""}`,
      );
    this.backdrop = gl.createTexture()!;
    // The alpha:false default framebuffer is RGB. Its copy target must also
    // be RGB; requesting RGBA makes copyTexSubImage2D fail on ANGLE/Windows.
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.backdrop);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGB,
      1,
      1,
      0,
      gl.RGB,
      gl.UNSIGNED_BYTE,
      null,
    );
    gl.activeTexture(gl.TEXTURE0);
    gl.enable(gl.BLEND);
    gl.clearColor(0, 0, 0, 1);
    this.unsubscribePhoto = window.luma?.onMediaChanged(() => {
      this.photoRetry = 0;
    });
  }

  private resource(surface: Surface, placementMesh = false) {
    const gl = this.gl;
    let resource = this.resources.get(surface.id);
    const sourceAlpha =
      surface.effectId === "imported-media" ||
      !!effectById[surface.effectId].transparent;
    // Preserve the opaque black canvas used by procedural glow painters.
    // Only imported media and explicitly transparent overlays need source alpha.
    if (resource && resource.sourceAlpha !== sourceAlpha) {
      gl.deleteTexture(resource.texture);
      gl.deleteBuffer(resource.buffer);
      this.resources.delete(surface.id);
      resource = undefined;
    }
    if (!resource) {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { alpha: sourceAlpha })!;
      const texture = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      resource = {
        sourceAlpha,
        canvas,
        ctx,
        texture,
        buffer: gl.createBuffer()!,
        geometryKey: "",
        vertexCount: 0,
        mapping: new Float32Array(9),
        edges: new Float32Array(130),
        edgeCount: 0,
        outline: [],
        effectKey: "",
        mediaKey: "",
        textureWidth: 0,
        textureHeight: 0,
      };
      this.resources.set(surface.id, resource);
    }
    const followsOutline =
      ["edge-runner", "toy-train"].includes(surface.effectId) && !placementMesh;
    const geometryKey = JSON.stringify([
      surface.kind,
      surface.points,
      surface.curves,
      followsOutline,
    ]);
    if (resource.geometryKey !== geometryKey) {
      resource.outline = surfaceOutline(surface);
      const vertices = triangles(resource.outline),
        featherOutline = surfaceOutline(surface, 64);
      gl.bindBuffer(gl.ARRAY_BUFFER, resource.buffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
      resource.vertexCount = vertices.length / 2;
      resource.mapping =
        surface.kind === "quad" && !hasCurves(surface) && !followsOutline
          ? inverseQuadMap(surface.points)
          : boundingMap(resource.outline);
      resource.edges.fill(0);
      [...featherOutline, featherOutline[0]].forEach((p, i) => {
        resource!.edges[i * 2] = p.x;
        resource!.edges[i * 2 + 1] = p.y;
      });
      resource.edgeCount = featherOutline.length;
      resource.geometryKey = geometryKey;
    }
    return resource;
  }

  render(state: RenderState, width: number, height: number) {
    this.mediaPlayers.begin();
    state = { ...state, project: renderedProject(state.project) };
    const { gl, canvas } = this;
    width = Math.max(1, Math.round(width));
    height = Math.max(1, Math.round(height));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    gl.viewport(0, 0, width, height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const alive = new Set(state.project.surfaces.map((s) => s.id));
    alive.add("__calibration");
    if (state.project.scene) alive.add("__scene-photo");
    state.project.stacks.forEach((stack) => alive.add(`__links-${stack.id}`));
    for (const [id, r] of this.resources)
      if (!alive.has(id)) {
        gl.deleteTexture(r.texture);
        gl.deleteBuffer(r.buffer);
        this.resources.delete(id);
      }
    if (state.blackout || gl.isContextLost()) {
      this.mediaPlayers.end();
      return;
    }
    gl.useProgram(this.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(this.uniforms.texture, 0);
    gl.uniform1i(this.uniforms.backdrop, 1);
    gl.uniform2f(this.uniforms.resolution, width, height);
    const placementMesh = !!state.placementMesh && !state.testPattern;
    gl.uniform1f(
      this.uniforms.brightness,
      placementMesh ? 1 : state.project.brightness,
    );
    gl.uniform1f(
      this.uniforms.aspect,
      state.project.width / state.project.height,
    );
    const time = playbackTime(state.playback);
    const audio = state.playback.playing
      ? state.audio && Date.now() - state.audio.capturedAt < 1500
        ? state.audio
        : silentAudio
      : state.audioFrozen === undefined
        ? (state.audio ?? silentAudio)
        : (state.audioFrozen ?? silentAudio);
    this.time = time;
    if (state.testPattern) {
      const surface: Surface = {
        id: "__calibration",
        name: "Calibration",
        kind: "quad",
        points: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: 1, y: 1 },
          { x: 0, y: 1 },
        ],
        effectId: "grid",
        color: "#ffffff",
        colorCycle: false,
        opacity: 1,
        speed: 1,
        scale: 1,
        feather: 0,
        visible: true,
        locked: false,
        blend: "normal",
        seed: 0,
      };
      const r = this.resource(surface);
      const tw = Math.min(state.project.width, 1920),
        th = Math.round((tw * state.project.height) / state.project.width);
      if (this.testCanvas.width !== tw || this.testCanvas.height !== th) {
        this.testCanvas.width = tw;
        this.testCanvas.height = th;
      }
      const ctx = this.testCanvas.getContext("2d")!;
      ctx.fillStyle = "#0c0c0c";
      ctx.fillRect(0, 0, tw, th);
      ctx.strokeStyle = "#5d5d5d";
      ctx.lineWidth = 1;
      for (let i = 0; i <= 16; i++) {
        ctx.beginPath();
        ctx.moveTo((i * tw) / 16, 0);
        ctx.lineTo((i * tw) / 16, th);
        ctx.stroke();
      }
      for (let i = 0; i <= 9; i++) {
        ctx.beginPath();
        ctx.moveTo(0, (i * th) / 9);
        ctx.lineTo(tw, (i * th) / 9);
        ctx.stroke();
      }
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.strokeRect(2, 2, tw - 4, th - 4);
      ctx.beginPath();
      ctx.arc(tw / 2, th / 2, th * 0.34, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(tw / 2, 0);
      ctx.lineTo(tw / 2, th);
      ctx.moveTo(0, th / 2);
      ctx.lineTo(tw, th / 2);
      ctx.stroke();
      const colors = ["#fff", "#ff0", "#0ff", "#0f0", "#f0f", "#f00", "#00f"];
      colors.forEach((c, i) => {
        ctx.fillStyle = c;
        ctx.fillRect(
          tw * 0.25 + (i * tw * 0.5) / 7,
          th * 0.76,
          (tw * 0.5) / 7,
          th * 0.07,
        );
      });
      ctx.font = `${Math.round(th * 0.025)}px monospace`;
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(
        `NOX   ·  ${state.project.width} × ${state.project.height}  ·  ALIGNMENT`,
        tw / 2,
        th * 0.9,
      );
      this.drawSurface(surface, r, this.testCanvas);
      this.mediaPlayers.end();
      return;
    }
    const soloId = effectiveSolo(state.project.surfaces, state.soloSurfaceId);
    for (const item of projectionItems(state.project)) {
      if ("stack" in item) {
        if (!placementMesh && !soloId)
          this.drawLinks(state.project, item.stack, time);
        continue;
      }
      const { surface } = item;
      if (
        surface.cutoutOf ||
        !surface.visible ||
        (!placementMesh && surface.opacity <= 0) ||
        (soloId && surface.id !== soloId)
      )
        continue;
      const r = this.resource(surface, placementMesh),
        b = bounds(r.outline);
      const sharedMapping =
        !placementMesh && surface.effectId === "imported-media"
          ? surface.media?.sceneMapping
          : undefined;
      const aspect =
        sharedMapping && surface.media
          ? surface.media.asset.width / surface.media.asset.height
          : (b.width * state.project.width) /
            Math.max(1, b.height * state.project.height);
      const definition = effectById[surface.effectId];
      const detail = placementMesh
        ? 640
        : surface.effectId === "imported-media" && surface.media
          ? Math.min(
              1920,
              Math.max(surface.media.asset.width, surface.media.asset.height),
            )
          : definition.detail || 640;
      const tw = Math.round(
        Math.max(96, aspect >= 1 ? detail : detail * aspect),
      );
      const th = Math.round(
        Math.max(96, aspect >= 1 ? detail / aspect : detail),
      );
      if (r.canvas.width !== tw || r.canvas.height !== th) {
        r.canvas.width = tw;
        r.canvas.height = th;
      }
      const stack = state.project.stacks.find((s) =>
        s.surfaceIds.includes(surface.id),
      );
      const effectTime = definition.still ? 0 : time * surface.speed;
      const route =
        stack?.kind === "chase" ||
        stack?.kind === "portal" ||
        stack?.kind === "story"
          ? chaseRoute(state.project, stack)
          : undefined;
      const effectKey = placementMesh
        ? `placement-mesh:${tw}:${th}`
        : `${surface.effectId}:${(stack ? time : effectTime).toFixed(4)}:${surface.color}:${surface.colorCycle}:${surface.seed}:${surface.scale}:${surface.effectSide}:${tw}:${th}:${stack ? JSON.stringify(stack) : ""}:${route?.key ?? ""}:${["edge-runner", "toy-train"].includes(surface.effectId) ? r.geometryKey : ""}:${definition.audioReactive ? `${audio.sequence}:${audio.capturedAt}` : ""}`;
      const imported =
        !placementMesh &&
        surface.effectId === "imported-media" &&
        !!surface.media;
      const mediaKey = imported
        ? JSON.stringify([surface.media, surface.speed])
        : "";
      let changed = imported || effectKey !== r.effectKey;
      if (changed) {
        if (placementMesh) drawPlacementMesh(r.ctx);
        else if (imported && surface.media)
          changed = this.mediaPlayers.draw(
            r.ctx,
            surface.media,
            time,
            surface.speed,
            state.playback.playing,
            mediaKey !== r.mediaKey,
          );
        else if (isMusicEffect(surface.effectId))
          drawMusicEffect(
            r.ctx,
            surface.effectId,
            effectTime,
            audio,
            surface.colorCycle
              ? hslHex(hue(surface.color) + effectTime * 24)
              : surface.color,
            surface.seed,
            surface.scale,
          );
        else if (stack?.kind === "chase" && route)
          drawLinkedChase(r.ctx, time, stack, route, surface.id);
        else if (stack?.kind === "portal" && route)
          drawLinkedPortal(r.ctx, time, stack, route, surface.id);
        else if (stack?.kind === "story" && route)
          drawLinkedStory(r.ctx, time, stack, route, surface.id);
        else if (stack) {
          const index = stack.surfaceIds.indexOf(surface.id),
            flow = stackFlow(time, stack.duration, stack.surfaceIds.length);
          drawLiquid(
            r.ctx,
            time,
            tw,
            th,
            stack.color,
            surface.seed,
            flow.levels[index],
            flow.to === index ? flow.stream : 0,
            flow.from === index ? flow.stream : 0,
            stack.kind !== "chase" &&
              stack.kind !== "portal" &&
              stack.kind !== "story"
              ? stack.style
              : undefined,
          );
        } else if (
          surface.effectId === "edge-runner" ||
          surface.effectId === "toy-train"
        ) {
          const t = time * surface.speed;
          (surface.effectId === "toy-train" ? drawToyTrain : drawEdgeRunner)(
            r.ctx,
            r.outline,
            t,
            surface.colorCycle
              ? hslHex(hue(surface.color) + t * 24)
              : surface.color,
            surface.seed,
            surface.scale,
          );
        } else
          drawEffect(
            r.ctx,
            surface.effectId,
            effectTime,
            surface.color,
            surface.seed,
            surface.scale,
            surface.colorCycle,
            surface.effectSide,
          );
        r.effectKey = effectKey;
        r.mediaKey = mediaKey;
      }
      this.drawSurface(
        placementMesh
          ? {
              ...surface,
              opacity: 1,
              feather: 0,
              blend: "normal",
              colorOverlay: undefined,
              contentTransform: undefined,
            }
          : surface,
        r,
        r.canvas,
        changed,
        cutoutsFor(state.project.surfaces, surface.id).filter((s) => s.visible),
        aspect,
        sharedMapping ? inverseQuadMap(sharedMapping) : undefined,
      );
    }
    if (state.scenePhoto && !placementMesh) this.drawPhoto(state.project);
    this.mediaPlayers.end();
  }

  private drawPhoto(project: Project) {
    const surface = photoSurface(project),
      scene = project.scene;
    if (!surface || !scene) return;
    if (
      this.photoId !== scene.photo.id ||
      (!this.photo?.naturalWidth && Date.now() > this.photoRetry)
    ) {
      this.photoId = scene.photo.id;
      this.photoRetry = Date.now() + 10_000;
      this.photo = new Image();
      this.photo.crossOrigin = "anonymous";
      this.photo.src = photoUrl(scene.photo);
    }
    if (!this.photo?.complete || !this.photo.naturalWidth) return;
    const r = this.resource(surface);
    const changed = r.effectKey !== this.photoId;
    if (changed) {
      const scale = Math.min(
        1,
        1920 / Math.max(scene.photo.width, scene.photo.height),
      );
      r.canvas.width = Math.max(1, Math.round(scene.photo.width * scale));
      r.canvas.height = Math.max(1, Math.round(scene.photo.height * scale));
      r.ctx.drawImage(this.photo, 0, 0, r.canvas.width, r.canvas.height);
      r.effectKey = this.photoId;
    }
    this.drawSurface(surface, r, r.canvas, changed);
  }

  private drawLinks(project: Project, stack: LiquidStack, time: number) {
    const member = project.surfaces.find((s) => s.id === stack.surfaceIds[0]);
    if (!member) return;
    const surface: Surface = {
      ...member,
      id: `__links-${stack.id}`,
      kind: "quad",
      points: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ],
      curves: undefined,
      feather: 0,
      opacity: 1,
      blend: "add",
      colorOverlay: undefined,
      contentTransform: undefined,
    };
    const r = this.resource(surface),
      scale = Math.min(1, 1920 / project.width, 1920 / project.height),
      tw = Math.round(project.width * scale),
      th = Math.round(project.height * scale);
    if (r.canvas.width !== tw || r.canvas.height !== th) {
      r.canvas.width = tw;
      r.canvas.height = th;
    }
    const key = JSON.stringify([
      time.toFixed(4),
      stack,
      tw,
      th,
      project.surfaces
        .filter((s) => stack.surfaceIds.includes(s.id))
        .map((s) => [s.points, s.curves, s.visible, s.opacity]),
    ]);
    const changed = key !== r.effectKey;
    if (changed) {
      drawStackLinks(r.ctx, project, stack, time, tw, th);
      r.effectKey = key;
    }
    this.drawSurface(surface, r, r.canvas, changed);
  }

  private drawSurface(
    surface: Surface,
    r: SurfaceResource,
    source: HTMLCanvasElement,
    changed = true,
    cutouts: Surface[] = [],
    contentAspect = source.width / source.height,
    mapping?: Float32Array,
  ) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, r.texture);
    if (r.textureWidth !== source.width || r.textureHeight !== source.height) {
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        source,
      );
      r.textureWidth = source.width;
      r.textureHeight = source.height;
    } else if (changed)
      gl.texSubImage2D(
        gl.TEXTURE_2D,
        0,
        0,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        source,
      );
    gl.bindBuffer(gl.ARRAY_BUFFER, r.buffer);
    gl.enableVertexAttribArray(this.position);
    gl.vertexAttribPointer(this.position, 2, gl.FLOAT, false, 0, 0);
    gl.uniformMatrix3fv(this.uniforms.mapping, false, mapping ?? r.mapping);
    gl.uniform1f(this.uniforms.sceneMapping, mapping ? 1 : 0);
    gl.uniformMatrix3fv(
      this.uniforms.content,
      false,
      contentMatrix(surface.contentTransform, contentAspect),
    );
    gl.uniform1f(this.uniforms.opacity, surface.opacity);
    gl.uniform1f(this.uniforms.mediaAlpha, r.sourceAlpha ? 1 : 0);
    gl.uniform1f(this.uniforms.feather, surface.feather);
    gl.uniform2fv(this.uniforms.points, r.edges);
    gl.uniform1i(this.uniforms.count, r.edgeCount);
    const overlay = surface.colorOverlay;
    gl.uniform1f(
      this.uniforms.overlayIntensity,
      overlay?.enabled ? overlay.intensity : 0,
    );
    if (overlay?.enabled) {
      gl.uniform1i(
        this.uniforms.overlayStyle,
        overlayStyles.findIndex((s) => s.id === overlay.style),
      );
      gl.uniform1i(this.uniforms.overlayBlend, blendIndex(overlay.blend));
      gl.uniform1f(
        this.uniforms.overlayPhase,
        overlayPhase(this.time, overlay),
      );
      gl.uniform1f(this.uniforms.overlayScale, overlay.scale);
      gl.uniform1f(this.uniforms.textureAspect, source.width / source.height);
      gl.uniform3fv(this.uniforms.palette, paletteUniforms[overlay.palette]);
    }
    const mode = blendIndex(surface.blend);
    gl.uniform1i(this.uniforms.blend, mode);
    if (mode >= 3) {
      // Snapshot the already-composited layers on the GPU. Reuse the texture;
      // no CPU readback or allocation per frame. UVs here use framebuffer Y.
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.backdrop);
      if (
        this.backdropWidth !== this.canvas.width ||
        this.backdropHeight !== this.canvas.height
      ) {
        this.backdropWidth = this.canvas.width;
        this.backdropHeight = this.canvas.height;
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGB,
          this.backdropWidth,
          this.backdropHeight,
          0,
          gl.RGB,
          gl.UNSIGNED_BYTE,
          null,
        );
      }
      gl.copyTexSubImage2D(
        gl.TEXTURE_2D,
        0,
        0,
        0,
        0,
        0,
        this.backdropWidth,
        this.backdropHeight,
      );
      gl.activeTexture(gl.TEXTURE0);
      gl.disable(gl.BLEND);
    } else gl.enable(gl.BLEND);
    if (surface.blend === "add") gl.blendFunc(gl.ONE, gl.ONE);
    else if (surface.blend === "screen")
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_COLOR);
    else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    if (cutouts.length) {
      gl.enable(gl.STENCIL_TEST);
      gl.stencilMask(0xff);
      gl.clearStencil(0);
      gl.clear(gl.STENCIL_BUFFER_BIT);
      gl.colorMask(false, false, false, false);
      gl.stencilFunc(gl.ALWAYS, 1, 0xff);
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
      for (const cutout of cutouts) {
        const mask = this.resource(cutout, true);
        gl.bindBuffer(gl.ARRAY_BUFFER, mask.buffer);
        gl.vertexAttribPointer(this.position, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, mask.vertexCount);
      }
      gl.colorMask(true, true, true, true);
      gl.stencilMask(0);
      gl.stencilFunc(gl.EQUAL, 0, 0xff);
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
      gl.bindBuffer(gl.ARRAY_BUFFER, r.buffer);
      gl.vertexAttribPointer(this.position, 2, gl.FLOAT, false, 0, 0);
      gl.bindTexture(gl.TEXTURE_2D, r.texture);
    }
    gl.drawArrays(gl.TRIANGLES, 0, r.vertexCount);
    if (cutouts.length) {
      gl.disable(gl.STENCIL_TEST);
      gl.stencilMask(0xff);
    }
  }

  dispose() {
    this.unsubscribePhoto?.();
    if (this.photo) this.photo.src = "";
    this.photo = null;
    this.mediaPlayers.dispose();
    for (const r of this.resources.values()) {
      this.gl.deleteTexture(r.texture);
      this.gl.deleteBuffer(r.buffer);
    }
    this.resources.clear();
    this.gl.deleteTexture(this.backdrop);
    this.gl.deleteProgram(this.program);
  }
}
