import {
  background,
  glow,
  hslHex,
  hue,
  line,
  oval,
  random,
  rgba,
  smooth,
  star,
  TAU,
} from "./common";
import { velvet } from "./characterArt";
import {
  face,
  imaginationPainter,
  polygon,
  ring,
  rounded,
  shadow,
} from "./imaginationArt";
import { bubbleLife, rubberMotion } from "./imaginationMotion";

export const bubbleCreatures = imaginationPainter((c, p, color, seed) => {
  const a = p * TAU;
  background(c, 1000, 650, "#091e36", "#162b42");
  for (let row = 0; row < 3; row++)
    for (let col = 0; col < 5; col++) {
      const i = row * 5 + col,
        x = 104 + col * 198 + (row % 2 ? 7 : 0),
        y = 110 + row * 213;
      const life = bubbleLife(p, i, seed),
        r = 81 * life.size,
        tint = hslHex(hue(color) + i * 23, 0.7, 0.72);
      ring(c, x, y, 86, 86, rgba(tint, 0.15), 2);
      shadow(c, x + 6, y + 13, 78 * life.size, 76 * life.size);
      if (r > 0.1) {
        c.save();
        c.translate(x + Math.sin(a * 4 + i) * 3 * life.size, y);
        c.rotate(Math.sin(a * 2 + i) * 0.04);
        const g = c.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.04, 0, 0, r);
        g.addColorStop(0, "#ffffff0c");
        g.addColorStop(0.62, rgba(tint, 0.12));
        g.addColorStop(0.9, rgba(tint, 0.35));
        g.addColorStop(1, "#daf6ffab");
        c.beginPath();
        c.arc(0, 0, r, 0, TAU);
        c.fillStyle = g;
        c.fill();
        c.save();
        c.globalAlpha = smooth(life.size * 2);
        velvet(
          c,
          0,
          r * 0.17,
          r * 0.56,
          r * 0.47,
          hslHex(hue(tint) + 90, 0.45, 0.65),
        );
        face(c, 0, r * 0.07, r * 0.75, p + i * 0.07);
        c.restore();
        ring(c, 0, 0, r, r, "#d8faff9c", 2);
        c.beginPath();
        c.ellipse(
          -r * 0.12,
          -r * 0.13,
          r * 0.72,
          r * 0.73,
          -0.3,
          Math.PI * 1.06,
          Math.PI * 1.63,
        );
        c.strokeStyle = "#f6ffffce";
        c.lineWidth = 5 * life.size;
        c.lineCap = "round";
        c.stroke();
        oval(c, r * 0.4, r * 0.58, r * 0.2, r * 0.055, "#ffffff66", -0.45);
        c.restore();
      }
      if (life.burst > 0) {
        ring(
          c,
          x,
          y,
          80 + life.spread * 29,
          80 + life.spread * 29,
          rgba(tint, life.burst * 0.7),
          2,
        );
        for (let j = 0; j < 12; j++) {
          const angle = (j * TAU) / 12 + random(i, seed),
            distance = 80 + life.spread * 54;
          star(
            c,
            x + Math.cos(angle) * distance,
            y + Math.sin(angle) * distance + life.spread ** 2 * 15,
            4 + random(j, seed) * 3,
            rgba(j % 2 ? tint : "#fff2c5", life.burst),
            a * 2 + j,
          );
        }
      }
    }
});

export const porcelainDreams = imaginationPainter((c, p, color, seed) => {
  const a = p * TAU,
    bloom = 0.5 - 0.5 * Math.cos(a);
  background(c, 1000, 650, "#dfe6df", "#9babb3");
  for (let row = 0; row < 2; row++)
    for (let col = 0; col < 3; col++) {
      const i = row * 3 + col,
        x = 20 + col * 328,
        y = 20 + row * 314;
      const glaze = c.createLinearGradient(x, y, x + 320, y + 300);
      glaze.addColorStop(0, "#fffef4");
      glaze.addColorStop(0.55, "#dce8e4");
      glaze.addColorStop(1, "#9eafb9");
      rounded(c, x + 5, y + 7, 314, 294, 17, "#536675");
      rounded(c, x, y, 314, 294, 17, glaze, "#f9fff4", 3);
      ring(c, x + 157, y + 147, 137, 125, "#718caa", 2);
      ring(c, x + 157, y + 147, 129, 117, "#416787", 3);
      for (let k = 0; k < 12; k++) {
        const angle = (k * TAU) / 12;
        oval(
          c,
          x + 157 + Math.cos(angle) * 122,
          y + 147 + Math.sin(angle) * 110,
          5,
          10,
          "#376484",
          angle,
        );
      }
      // Branching gold seams brighten, fill, then quietly heal.
      const repair = smooth(bloom * 1.7),
        points: number[][] = [];
      for (let k = 0; k < 7; k++)
        points.push([
          x + 32 + k * 42,
          y + 155 + (random(k + i * 19, seed) - 0.5) * 145,
        ]);
      line(c, points, rgba("#5b6472", repair * 0.7), 6);
      line(c, points, rgba(color, repair), 3.2);
      for (let k = 1; k < 6; k += 2)
        line(
          c,
          [
            points[k],
            [points[k][0] + 19, points[k][1] - 40],
            [points[k][0] + 45, points[k][1] - 64],
          ],
          rgba(color, repair * 0.8),
          2,
        );
      const rise = 0.25 + bloom * 0.75,
        cx = x + 157,
        cy = y + 144;
      shadow(c, cx + 8 * bloom, cy + 16 * bloom, 60 * rise, 45 * rise);
      for (let petal = 0; petal < 8; petal++) {
        const angle = (petal * TAU) / 8 + Math.sin(a) * 0.12;
        velvet(
          c,
          cx + Math.cos(angle) * 31 * rise,
          cy + Math.sin(angle) * 31 * rise,
          25 * rise,
          31 * rise,
          "#eef4ec",
        );
        line(
          c,
          [
            [cx, cy],
            [
              cx + Math.cos(angle) * 47 * rise,
              cy + Math.sin(angle) * 47 * rise,
            ],
          ],
          "#a0b9c264",
          1.3,
        );
      }
      velvet(c, cx, cy, 15 * rise, 15 * rise, color);
      c.save();
      c.translate(cx + Math.cos(a + i) * 85, cy + Math.sin(a + i) * 78);
      c.rotate(a + i + 0.4);
      oval(c, 0, 0, 14, 7, "#315b7c");
      oval(c, 11, -4, 7, 6, "#315b7c");
      polygon(
        c,
        [
          [15, -5],
          [26, -2],
          [16, 0],
        ],
        color,
      );
      polygon(
        c,
        [
          [-2, -2],
          [-19, -22 - Math.sin(a * 6) * 8],
          [8, -4],
        ],
        "#4b7994",
      );
      oval(c, 13, -5, 1.7, 1.7, "#f2eacf");
      c.restore();
    }
});

export const mosaicFaces = imaginationPainter((c, p, color, seed) => {
  const a = p * TAU,
    cols = 29,
    rows = 21,
    cw = 1000 / cols,
    ch = 650 / rows;
  background(c, 1000, 650, "#060b18");
  const portrait = smooth((0.5 - 0.5 * Math.cos(a)) / 0.62),
    look = Math.sin(a * 2) * 0.07;
  const blink = 1 - 0.9 * Math.pow(Math.max(0, Math.cos(a * 3)), 30);
  for (let row = 0; row < rows; row++)
    for (let col = 0; col < cols; col++) {
      const x = (col + 0.5) * cw,
        y = (row + 0.5) * ch,
        nx = (x - 500) / 400,
        ny = (y - 325) / 290;
      const flip = Math.cos(a * 2 + (col + row) * 0.19),
        wide = 0.07 + 0.93 * Math.abs(flip);
      const skin = (nx * nx) / (0.73 * 0.73) + (ny * ny) / (0.94 * 0.94) < 1;
      let fill = hslHex(
        hue(color) + col * 11 + row * 7 + Math.sin(a) * 55,
        0.54,
        0.28 + random(row * cols + col, seed) * 0.25,
      );
      if (skin && portrait > random(row * cols + col + 900, seed) * 0.95) {
        fill = hslHex(
          hue(color) + (nx * 0.5 + 0.5) * 12,
          0.5,
          0.51 + (1 - Math.abs(nx)) * 0.18,
        );
        const eye =
          Math.abs(Math.abs(nx - look) - 0.27) < 0.13 &&
          Math.abs(ny + 0.19) < 0.1 * blink;
        const brow =
          Math.abs(Math.abs(nx) - 0.27) < 0.17 &&
          Math.abs(ny + 0.36 + nx * Math.sin(a) * 0.08) < 0.035;
        const mouth =
          Math.abs(nx) < 0.34 &&
          Math.abs(
            ny - (0.36 + (0.1 + Math.sin(a) * 0.075) * (1 - (nx / 0.34) ** 2)),
          ) < 0.04;
        if (eye)
          fill =
            Math.abs(Math.abs(nx - look) - 0.27) < 0.055
              ? "#17283d"
              : "#f7f4dc";
        if (brow || mouth) fill = "#26314d";
        if (Math.abs(nx) < 0.045 && ny > -0.01 && ny < 0.17) fill = "#bd796b";
      }
      const tw = (cw - 3) * wide,
        th = ch - 3;
      c.save();
      c.translate(x, y);
      c.rotate(Math.sin(a + (row + col) * 0.09) * 0.015);
      rounded(c, -tw / 2 + 2, -th / 2 + 3, tw, th, 2, "#01040d");
      rounded(c, -tw / 2, -th / 2, tw, th, 2, fill);
      line(
        c,
        [
          [-tw / 2 + 1, th / 2],
          [-tw / 2 + 1, -th / 2],
          [tw / 2, -th / 2],
        ],
        "#ffffff49",
        1.5,
      );
      line(
        c,
        [
          [tw / 2, -th / 2],
          [tw / 2, th / 2],
          [-tw / 2, th / 2],
        ],
        "#00000060",
        2,
      );
      c.restore();
    }
});

export const rubberRoom = imaginationPainter((c, p, color, seed) => {
  const a = p * TAU,
    m = rubberMotion(p),
    bx = m.x * 1000,
    by = m.y * 650;
  background(c, 1000, 650, "#15152f", "#060c1c");
  const swell = (at: number, center: number) =>
    Math.exp(-(((at - center) / 0.21) ** 2));
  const left = (v: number) => 130 - m.left * 87 * swell(v, m.y);
  const right = (v: number) => 870 + m.right * 87 * swell(v, m.y);
  const top = (v: number) => 85 - m.top * 58 * swell(v, m.x);
  const bottom = (v: number) => 565 + m.bottom * 58 * swell(v, m.x);
  const edge = (kind: number) =>
    Array.from({ length: 33 }, (_, i) => {
      const v = i / 32;
      return kind === 0
        ? [left(v), 85 + v * 480]
        : kind === 1
          ? [right(v), 85 + v * 480]
          : kind === 2
            ? [130 + v * 740, top(v)]
            : [130 + v * 740, bottom(v)];
    });
  polygon(c, [[20, 20], ...edge(2), [980, 20]], "#30365a");
  polygon(c, [[20, 20], ...edge(0), [20, 630]], "#293457");
  polygon(c, [[980, 20], ...edge(1), [980, 630]], "#171f3e");
  polygon(c, [[20, 630], ...edge(3), [980, 630]], "#263951");
  for (let i = 0; i < 4; i++) line(c, edge(i), rgba(color, 0.75), 3);
  for (let row = 0; row <= 10; row++) {
    const v = row / 10,
      pts = Array.from({ length: 33 }, (_, j) => {
        const t = j / 32;
        return [
          left(v) + (right(v) - left(v)) * t,
          top(t) + (bottom(t) - top(t)) * v,
        ];
      });
    line(c, pts, rgba(color, 0.18), 1.3);
  }
  for (let col = 0; col <= 14; col++) {
    const t = col / 14,
      pts = Array.from({ length: 25 }, (_, j) => {
        const v = j / 24;
        return [
          left(v) + (right(v) - left(v)) * t,
          top(t) + (bottom(t) - top(t)) * v,
        ];
      });
    line(c, pts, rgba(color, 0.18), 1.3);
  }
  const contact = Math.max(m.left, m.right, m.top, m.bottom);
  const radius = 57 + random(2, seed) * 7;
  shadow(c, bx, 570, radius * (1 + (by / 650) * 0.2), 11 + (by / 650) * 8);
  glow(c, bx, by, radius * 2, color, 0.22);
  c.save();
  c.translate(bx, by);
  c.scale(
    1 + (m.top + m.bottom - m.left - m.right) * 0.16,
    1 + (m.left + m.right - m.top - m.bottom) * 0.16,
  );
  velvet(c, 0, 0, radius, radius, "#f4b875");
  c.save();
  c.beginPath();
  c.arc(0, 0, radius, 0, TAU);
  c.clip();
  c.rotate(a * 8);
  for (let i = -2; i <= 2; i++)
    ring(c, i * radius * 0.38, 0, radius * 0.26, radius * 1.02, color, 12);
  c.restore();
  oval(
    c,
    -radius * 0.28,
    -radius * 0.35,
    radius * 0.24,
    radius * 0.12,
    "#fffbeaaf",
    -0.5,
  );
  c.restore();
  if (contact > 0.01)
    ring(
      c,
      bx,
      by,
      radius * (1.3 + contact * 0.16),
      radius * (1.3 + contact * 0.16),
      rgba(color, contact * 0.3),
      2,
    );
});
