import type { StickEffectId } from "../types";
import { stickEffects } from "../stickCatalog";
import {
  glow,
  hslHex,
  hue,
  line,
  oval,
  rgba,
  smooth,
  star,
  TAU,
  type Painter,
} from "./common";
import {
  stickEffort,
  stickJoint,
  stickPhase,
  stickPose,
  type StickPose,
} from "./stickMotion";

type C = CanvasRenderingContext2D;
type Room = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};
function panel(c: C, points: number[][], fill: string | CanvasGradient) {
  c.beginPath();
  points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  c.fillStyle = fill;
  c.fill();
}
function box(c: C, w: number, h: number, color: string, force: number): Room {
  const outer = {
    left: w * 0.025,
    top: h * 0.035,
    right: w * 0.975,
    bottom: h * 0.965,
  };
  const room = {
    left: w * 0.12,
    top: h * 0.135,
    right: w * (0.88 + force * 0.012),
    bottom: h * 0.84,
    width: 0,
    height: h * 0.705,
  };
  room.width = room.right - room.left;
  c.fillStyle = "#010207";
  c.fillRect(0, 0, w, h);
  const shade = c.createLinearGradient(0, room.top, 0, room.bottom);
  shade.addColorStop(0, "#0c1521");
  shade.addColorStop(0.6, "#050910");
  shade.addColorStop(1, "#101c29");
  c.fillStyle = shade;
  c.fillRect(room.left, room.top, room.width, room.height);
  glow(c, w * 0.5, h * 0.4, Math.min(w, h) * 0.6, color, 0.09);
  const { left: l, top: t, right: r, bottom: b } = room;
  const { left: ol, top: ot, right: or, bottom: ob } = outer;
  panel(
    c,
    [
      [ol, ot],
      [l, t],
      [l, b],
      [ol, ob],
    ],
    "#102030",
  );
  panel(
    c,
    [
      [or, ot],
      [r, t],
      [r, b],
      [or, ob],
    ],
    "#0a1523",
  );
  panel(
    c,
    [
      [ol, ot],
      [or, ot],
      [r, t],
      [l, t],
    ],
    "#152538",
  );
  const floor = c.createLinearGradient(0, b, 0, ob);
  floor.addColorStop(0, "#132535");
  floor.addColorStop(1, "#060d18");
  panel(
    c,
    [
      [l, b],
      [r, b],
      [or, ob],
      [ol, ob],
    ],
    floor,
  );
  for (let i = 1; i < 8; i++) {
    const f = i / 8;
    line(
      c,
      [
        [l + room.width * f, b],
        [ol + (or - ol) * f, ob],
      ],
      rgba(color, 0.13),
      0.7,
    );
  }
  for (const f of [0.28, 0.65])
    line(
      c,
      [
        [l + (ol - l) * f, b + (ob - b) * f],
        [r + (or - r) * f, b + (ob - b) * f],
      ],
      rgba(color, 0.1),
      0.6,
    );
  const weight = Math.max(0.9, Math.min(w, h) * 0.004);
  line(
    c,
    [
      [l, t],
      [r, t],
      [r, b],
      [l, b],
    ],
    rgba(color, 0.65),
    weight,
    true,
  );
  for (const [x, y, xx, yy] of [
    [ol, ot, l, t],
    [or, ot, r, t],
    [or, ob, r, b],
    [ol, ob, l, b],
  ])
    line(
      c,
      [
        [x, y],
        [xx, yy],
      ],
      rgba(color, 0.34),
      weight,
    );
  c.save();
  c.shadowColor = color;
  c.shadowBlur = weight * 7;
  line(
    c,
    [
      [ol, ot],
      [or, ot],
      [or, ob],
      [ol, ob],
    ],
    rgba(color, 0.8),
    weight * 1.2,
    true,
  );
  c.restore();
  // Short bright bevels read well on a physical box even at a distance.
  for (const [x, y, sx, sy] of [
    [ol, ot, 1, 1],
    [or, ot, -1, 1],
    [ol, ob, 1, -1],
    [or, ob, -1, -1],
  ]) {
    line(
      c,
      [
        [x, y + sy * h * 0.055],
        [x, y],
        [x + sx * w * 0.045, y],
      ],
      "#dafaff",
      weight * 1.1,
    );
  }
  return room;
}

function stroke(c: C, points: number[][], color: string, weight = 0.08) {
  line(c, points, rgba(color, 0.3), weight * 2.3);
  line(c, points, "#e9f4fa", weight);
  line(c, points, "#ffffff", weight * 0.28);
}
function limb(
  c: C,
  from: number[],
  to: number[],
  length: number,
  bend: number,
  color: string,
) {
  const joint = stickJoint(from[0], from[1], to[0], to[1], length, bend);
  stroke(c, [from, [joint.x, joint.y], [joint.endX, joint.endY]], color);
  return [joint.endX, joint.endY];
}
function palm(c: C, x: number, y: number, open: boolean, color: string) {
  oval(c, x, y, 0.075, 0.09, "#f8fcff");
  if (open) {
    for (let i = -1; i <= 1; i++)
      stroke(
        c,
        [
          [x + i * 0.04, y],
          [x + i * 0.065, y - 0.15 + Math.abs(i) * 0.025],
        ],
        color,
        0.032,
      );
  }
}
function figure(
  c: C,
  pose: StickPose,
  phase: number,
  color: string,
  openHands: boolean,
) {
  const chest = [pose.lean, -0.8],
    headX = pose.lean * 1.16,
    headY = -1.27;
  const footY = pose.crouch * 0.5;
  const leftFoot = limb(
      c,
      [-0.08, 0],
      [pose.lfx, pose.lfy - footY],
      0.58,
      1,
      color,
    ),
    rightFoot = limb(
      c,
      [0.08, 0],
      [pose.rfx, pose.rfy - footY],
      0.58,
      -1,
      color,
    );
  stroke(
    c,
    [
      [leftFoot[0] - 0.12, leftFoot[1]],
      [leftFoot[0] + 0.09, leftFoot[1]],
    ],
    color,
    0.095,
  );
  stroke(
    c,
    [
      [rightFoot[0] - 0.09, rightFoot[1]],
      [rightFoot[0] + 0.12, rightFoot[1]],
    ],
    color,
    0.095,
  );
  stroke(
    c,
    [[0, 0], [pose.lean * 0.55, -0.4], chest, [headX, -1.04]],
    color,
    0.095,
  );
  const left = limb(
    c,
    [chest[0] - 0.09, chest[1]],
    [pose.lhx, pose.lhy],
    0.6,
    1,
    color,
  );
  const right = limb(
    c,
    [chest[0] + 0.09, chest[1]],
    [pose.rhx, pose.rhy],
    0.6,
    -1,
    color,
  );
  for (const hand of [left, right]) palm(c, hand[0], hand[1], openHands, color);
  c.save();
  c.translate(headX, headY);
  c.rotate(pose.tilt);
  const face = c.createRadialGradient(-0.1, -0.13, 0.02, 0, 0, 0.29);
  face.addColorStop(0, "#ffffff");
  face.addColorStop(0.65, "#eff8ff");
  face.addColorStop(1, "#94b4cb");
  c.fillStyle = face;
  c.beginPath();
  c.arc(0, 0, 0.255, 0, TAU);
  c.fill();
  c.strokeStyle = rgba(color, 0.6);
  c.lineWidth = 0.025;
  c.stroke();
  const blink = Math.pow(Math.max(0, Math.cos(phase * TAU * 3)), 45);
  for (const eye of [-0.085, 0.085])
    oval(
      c,
      eye + pose.look * 0.035,
      -0.018,
      0.028,
      0.045 * (1 - blink) + 0.006,
      "#182434",
    );
  line(
    c,
    [
      [-0.065, 0.11],
      [0, 0.125 + (pose.crouch > 0.6 ? 0.03 : 0)],
      [0.065, 0.11],
    ],
    "#345267",
    0.018,
  );
  c.restore();
  // A little coloured scarf makes the silhouette and its direction readable.
  panel(
    c,
    [
      [pose.lean - 0.12, -0.96],
      [pose.lean + 0.12, -0.96],
      [pose.lean + 0.1, -0.84],
      [pose.lean - 0.14, -0.84],
    ],
    color,
  );
  panel(
    c,
    [
      [pose.lean - 0.08, -0.88],
      [pose.lean - 0.35, -0.75 + Math.sin(phase * TAU * 4) * 0.07],
      [pose.lean - 0.24, -1.01],
    ],
    rgba(color, 0.8),
  );
}

const painter =
  (id: StickEffectId): Painter =>
  (c, time, w, h, color, seed, scale = 1) => {
    const phase = stickPhase(time, seed);
    const effort = id === "stick-wall-pusher" ? stickEffort(phase) : 0;
    const room = box(
      c,
      w,
      h,
      color,
      effort * (0.7 + 0.3 * Math.sin(phase * TAU * 18)),
    );
    const unit =
      Math.min(room.height * 0.235, room.width * 0.28) *
      Math.max(0.45, Math.min(1.55, scale)) *
      (id === "stick-box-buddies" ? 0.78 : 1);
    const cx = (room.left + room.right) / 2,
      cy = (room.top + room.bottom) / 2;
    const count = id === "stick-box-buddies" ? 2 : 1;
    c.save();
    c.beginPath();
    c.rect(room.left, room.top, room.width, room.height + h * 0.015);
    c.clip();
    for (let i = 0; i < count; i++) {
      const pose = stickPose(id, phase, i === 1);
      const travel =
        id === "stick-box-buddies"
          ? unit * 1.5
          : Math.max(0, room.width / 2 - unit * 1.13);
      let x = cx + pose.x * travel;
      const headroom = Math.max(1.55, -pose.lhy + 0.16, -pose.rhy + 0.16);
      const ceiling = room.top + headroom * unit;
      const standing = room.bottom - unit * (0.95 - pose.crouch * 0.5);
      // Jump/climb to the physical ceiling at any figure size or box aspect.
      const lift =
        id === "stick-ceiling-bonk"
          ? (pose.lift / 3) * Math.max(0, standing - ceiling)
          : id === "stick-corner-climber"
            ? (pose.lift / 2.5) * Math.max(0, standing - ceiling)
            : pose.lift * unit;
      let y = Math.max(ceiling, standing - lift);
      let rotation = 0;
      if (id === "stick-gravity-tumble") {
        const angle = phase * TAU;
        x = cx + Math.max(0, room.width / 2 - unit) * Math.sin(angle);
        y = cy + Math.max(0, room.height / 2 - unit) * Math.cos(angle);
        rotation = -angle;
      }
      oval(
        c,
        x,
        room.bottom - unit * 0.01,
        unit * 0.77,
        unit * 0.12,
        "#00000088",
      );
      const tint = i ? hslHex(hue(color) + 110, 0.7, 0.72) : color;
      c.save();
      c.translate(x, y);
      c.rotate(rotation);
      c.scale(unit, unit);
      figure(
        c,
        pose,
        phase,
        tint,
        id === "stick-glass-box" ||
          id === "stick-wall-pusher" ||
          id === "stick-corner-climber",
      );
      if (id === "stick-glass-box") {
        const touch = smooth((phase - 0.18) * 10) * smooth((0.65 - phase) * 10);
        for (const [hx, hy] of [
          [pose.lhx, pose.lhy],
          [pose.rhx, pose.rhy],
        ]) {
          c.strokeStyle = rgba(tint, touch * 0.35);
          c.lineWidth = 0.025;
          c.beginPath();
          c.ellipse(hx, hy, 0.16, 0.2, 0, 0, TAU);
          c.stroke();
        }
      }
      if (id === "stick-ceiling-bonk") {
        const impact = smooth((phase - 0.33) * 40) * smooth((0.6 - phase) * 12);
        for (let s = 0; s < 3; s++) {
          const a = phase * TAU * 3 + (s * TAU) / 3;
          star(
            c,
            pose.lean + Math.cos(a) * 0.43,
            -1.62 + Math.sin(a) * 0.11,
            0.09,
            rgba("#ffe59b", impact),
            a,
          );
        }
      }
      c.restore();
    }
    c.restore();
    if (id === "stick-glass-box") {
      panel(
        c,
        [
          [room.left + room.width * 0.1, room.top],
          [room.left + room.width * 0.19, room.top],
          [room.right - room.width * 0.2, room.bottom],
          [room.right - room.width * 0.29, room.bottom],
        ],
        "#ddfaff08",
      );
      line(
        c,
        [
          [room.left + 5, room.top + room.height * 0.25],
          [room.left + 5, room.top + room.height * 0.65],
        ],
        rgba(color, 0.25),
        1,
      );
    }
  };

export const stickPainters = Object.fromEntries(
  stickEffects.map((effect) => [effect.id, painter(effect.id)]),
) as Record<StickEffectId, Painter>;
