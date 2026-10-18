import type { PortalCharacter, PortalStack } from "../types";
import type { ChaseRoute } from "../chaseRoute";
import { portalPositions, portalTimeline } from "../portalMotion";
import { drawChaseCharacter } from "./chaseArt";
import { velvet } from "./characterArt";
import { glow, line, oval, random, rgba, TAU, type Painter } from "./common";

type C = CanvasRenderingContext2D;

function doorway(
  c: C,
  x: number,
  y: number,
  unit: number,
  opening: number,
  phase: number,
  color: string,
  front = false,
) {
  if (opening < 0.001) return;
  c.save();
  c.translate(x, y);
  c.scale(Math.max(0.03, opening), opening);
  const rx = unit * 0.31,
    ry = unit * 1.42;
  if (!front) {
    glow(c, 0, 0, unit * 1.65, color, 0.16);
    oval(c, 0, unit * 1.32, unit * 0.64, unit * 0.11, rgba(color, 0.2));
    const g = c.createRadialGradient(0, 0, 0, 0, 0, ry);
    g.addColorStop(0, "#030712");
    g.addColorStop(0.6, "#101c38");
    g.addColorStop(1, color);
    c.fillStyle = g;
    c.beginPath();
    c.ellipse(0, 0, rx, ry, 0, 0, TAU);
    c.fill();
    c.save();
    c.clip();
    for (let i = 0; i < 7; i++) {
      const p = (((phase * 3 + i / 7) % 1) + 1) % 1;
      c.beginPath();
      c.ellipse(0, 0, rx * p, ry * p, Math.sin(phase * TAU + i) * 0.07, 0, TAU);
      c.strokeStyle = rgba(color, 0.5 * (1 - p));
      c.lineWidth = unit * 0.018;
      c.stroke();
    }
    c.restore();
  }
  for (let ring = 0; ring < 3; ring++) {
    c.beginPath();
    c.ellipse(
      0,
      0,
      rx + ring * unit * 0.025,
      ry + ring * unit * 0.025,
      0,
      0,
      TAU,
    );
    c.strokeStyle =
      ring === 0 ? "#efffff" : rgba(color, ring === 1 ? 0.9 : 0.4);
    c.lineWidth = unit * (ring === 1 ? 0.035 : 0.015);
    c.stroke();
  }
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * TAU + phase * TAU * 4;
    const x = Math.cos(a) * (rx + unit * 0.05),
      y = Math.sin(a) * (ry + unit * 0.05);
    glow(c, x, y, unit * 0.055, color, 0.7);
    oval(c, x, y, unit * 0.014, unit * 0.023, "#eaffff");
  }
  c.restore();
}

function explorer(
  c: C,
  character: PortalCharacter,
  x: number,
  floor: number,
  unit: number,
  stride: number,
  blink: number,
  color: string,
  charge: number,
) {
  c.save();
  c.translate(x, floor);
  c.scale(unit, unit);
  oval(c, 0, 0.1, 0.75, 0.09, rgba(color, 0.13));
  drawChaseCharacter(c, character, stride, 0.9, blink, color);
  // A separate articulated portal launcher: ceramic shell, grip, luminous
  // chamber and three metal prongs. The barrel points towards the next door.
  c.translate(0.61, -0.9);
  c.rotate(-0.05 - charge * 0.05);
  line(
    c,
    [
      [-0.16, 0.1],
      [-0.22, 0.37],
    ],
    "#253549",
    0.14,
  );
  velvet(c, -0.1, 0, 0.42, 0.2, "#e8f0f1");
  velvet(c, 0.2, 0, 0.2, 0.16, "#35465b");
  glow(c, 0.27, 0, 0.36, color, 0.3 + charge * 0.6);
  velvet(c, 0.27, 0, 0.13, 0.12, color);
  oval(c, 0.3, -0.025, 0.045, 0.055, "#ffffff");
  line(
    c,
    [
      [-0.06, -0.17],
      [0.37, -0.2],
      [0.47, -0.11],
    ],
    "#9baec4",
    0.045,
  );
  line(
    c,
    [
      [-0.06, 0.17],
      [0.37, 0.2],
      [0.47, 0.11],
    ],
    "#9baec4",
    0.045,
  );
  line(
    c,
    [
      [0.2, 0.02],
      [0.47, 0.02],
    ],
    "#53677c",
    0.035,
  );
  oval(
    c,
    -0.18,
    0.18,
    0.13,
    0.11,
    character === "robot"
      ? "#a7bdcf"
      : character === "alien"
        ? "#a7e29a"
        : "#edbd72",
  );
  c.restore();
}

function paintTile(
  c: C,
  time: number,
  stack: PortalStack,
  route: ChaseRoute,
  index: number,
) {
  const tile = route.segments[index];
  if (!tile) return;
  const timeline = portalTimeline(
    time,
    stack.duration,
    route.segments.length,
    stack.direction,
  );
  const source = route.segments[timeline.from],
    destination = route.segments[timeline.to];
  const positions = portalPositions(
    timeline.travel,
    source.width,
    destination.width,
  );
  const w = tile.width,
    h = tile.height,
    unit = route.unit,
    floor = h * 0.82;
  const isSource = timeline.from === index,
    isDestination = timeline.to === index;
  const angle = timeline.cycle * TAU,
    energy = stack.color;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = 1;
  c.globalCompositeOperation = "source-over";
  c.fillStyle = "#030610";
  c.fillRect(0, 0, c.canvas.width, c.canvas.height);
  c.save();
  c.scale(c.canvas.width / w, c.canvas.height / h);
  if (stack.direction === "right") {
    c.translate(w, 0);
    c.scale(-1, 1);
  }
  const backdrop = c.createLinearGradient(0, h * 0.3, 0, h);
  backdrop.addColorStop(0, "#030610");
  backdrop.addColorStop(0.8, "#101d30");
  backdrop.addColorStop(1, "#030610");
  c.fillStyle = backdrop;
  c.fillRect(0, 0, w, h);
  for (let i = 0; i < 28; i++) {
    const x = random(i + 11, stack.seed) * w,
      y = random(i + 61, stack.seed) * h * 0.7;
    oval(
      c,
      x,
      y,
      unit * 0.009,
      unit * 0.009,
      rgba(energy, 0.12 + (1 + Math.sin(angle * 2 + i)) * 0.12),
    );
  }
  line(
    c,
    [
      [0, floor + unit * 0.2],
      [w, floor + unit * 0.2],
    ],
    rgba(energy, 0.18),
    unit * 0.012,
  );
  for (let i = 0; i <= 8; i++)
    line(
      c,
      [
        [w * 0.5 + (i - 4) * w * 0.07, floor + unit * 0.22],
        [w * 0.5 + (i - 4) * w * 0.3, h],
      ],
      rgba(energy, 0.045),
      unit * 0.009,
    );
  const doorY = floor - unit * 0.92;
  if (isSource)
    doorway(
      c,
      positions.entry,
      doorY,
      unit,
      timeline.opening,
      timeline.cycle,
      "#ba91ff",
    );
  if (isDestination)
    doorway(
      c,
      positions.exit,
      doorY,
      unit,
      timeline.opening,
      timeline.cycle,
      energy,
    );
  const blink = 1 - Math.max(0, Math.cos(angle * 3 + 1)) ** 80 * 0.95;
  const stride = Math.sin(timeline.phase * TAU * 12) * timeline.walking * 2.2;
  const charge = Math.max(0, 1 - Math.abs(timeline.phase - 0.17) / 0.12);
  if (isSource && timeline.travel < 1) {
    c.save();
    c.beginPath();
    c.rect(0, 0, positions.entry, h);
    c.clip();
    explorer(
      c,
      stack.character,
      positions.sourceX,
      floor,
      unit,
      stride,
      blink,
      energy,
      charge,
    );
    c.restore();
  }
  if (isDestination && timeline.travel > 0) {
    c.save();
    c.beginPath();
    c.rect(positions.exit, 0, w - positions.exit, h);
    c.clip();
    explorer(
      c,
      stack.character,
      positions.destinationX,
      floor,
      unit,
      stride,
      blink,
      energy,
      0,
    );
    c.restore();
  }
  if (isSource && timeline.shot >= 0) {
    const start = w * 0.42 + unit * 1.08,
      x = start + (positions.entry - start) * timeline.shot;
    line(
      c,
      [
        [Math.max(start, x - unit * 0.7), doorY],
        [x, doorY],
      ],
      rgba(energy, 0.9),
      unit * 0.045,
    );
    glow(c, x, doorY, unit * 0.3, energy, 0.85);
    oval(c, x, doorY, unit * 0.045, unit * 0.055, "#ffffff");
  }
  if (isSource)
    doorway(
      c,
      positions.entry,
      doorY,
      unit,
      timeline.opening,
      timeline.cycle,
      "#ba91ff",
      true,
    );
  if (isDestination)
    doorway(
      c,
      positions.exit,
      doorY,
      unit,
      timeline.opening,
      timeline.cycle,
      energy,
      true,
    );
  c.restore();
}

export function drawLinkedPortal(
  c: C,
  time: number,
  stack: PortalStack,
  route: ChaseRoute,
  surfaceId: string,
) {
  paintTile(
    c,
    time,
    stack,
    route,
    route.segments.findIndex((s) => s.id === surfaceId),
  );
}

export const portalPainter: Painter = (
  c,
  time,
  w,
  h,
  color,
  seed,
  scale = 1,
  side = "left",
) => {
  const stack: PortalStack = {
    id: "preview",
    name: "Portal",
    kind: "portal",
    surfaceIds: ["preview"],
    color,
    seed,
    scale,
    duration: 8,
    links: false,
    direction: side,
    character: "robot",
  };
  const route: ChaseRoute = {
    width: w,
    unit: Math.min(h * 0.245 * scale, w * 0.17 * scale, h * 0.275, w * 0.18),
    key: "preview",
    segments: [{ id: "preview", start: 0, width: w, height: h }],
  };
  paintTile(c, time, stack, route, 0);
};
