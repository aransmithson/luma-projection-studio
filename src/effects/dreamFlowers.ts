import {
  background,
  glow,
  hslHex,
  hue,
  line,
  oval,
  random,
  rgba,
  TAU,
  type Painter,
} from "./common";
import { bloomLife, dreamPhase } from "./dreamMotion";

function petal(
  c: CanvasRenderingContext2D,
  length: number,
  width: number,
  tint: string,
  moon: boolean,
) {
  c.beginPath();
  c.moveTo(0, 0);
  c.bezierCurveTo(
    -width * 0.7,
    -length * 0.25,
    -width * 0.8,
    -length * 0.86,
    0,
    -length,
  );
  c.bezierCurveTo(
    width * 0.8,
    -length * 0.86,
    width * 0.7,
    -length * 0.25,
    0,
    0,
  );
  const g = c.createLinearGradient(0, 0, 0, -length);
  g.addColorStop(0, moon ? "#39326e" : "#9d663d");
  g.addColorStop(0.4, tint);
  g.addColorStop(0.85, moon ? "#e6d2ff" : "#fff4d8");
  g.addColorStop(1, tint);
  c.fillStyle = g;
  c.fill();
  line(
    c,
    [
      [0, -length * 0.14],
      [0, -length * 0.87],
    ],
    rgba("#fff8e5", 0.25),
    Math.max(0.5, length * 0.014),
  );
}
const flowers =
  (kind: "daisy" | "sunflower" | "moon"): Painter =>
  (c, t, w, h, color, seed) => {
    const p = dreamPhase(t, 16),
      a = p * TAU,
      moon = kind === "moon",
      sunflower = kind === "sunflower",
      tone = hue(color);
    background(c, w, h, moon ? "#100d24" : "#071b21", "#02090f");
    glow(c, w * 0.5, h * 0.7, h * 0.8, moon ? color : "#315c47", 0.26);
    const unit = Math.min(w, h),
      count = Math.max(3, Math.min(6, Math.round((w / h) * 2.1)));
    for (let i = 0; i < count; i++) {
      const life = bloomLife(p, random(i + 18, seed) * 0.3),
        variation = random(i, seed);
      const x = w * ((i + 0.5) / count),
        root = h * 1.02;
      const height = h * (0.5 + variation * 0.2) * life.stem;
      const sway = Math.sin(a + variation * TAU) * unit * 0.035 * life.stem;
      const topx = x + sway,
        topy = root - height;
      const r =
        unit *
        (sunflower ? 0.21 : moon ? 0.19 : 0.18) *
        (0.85 + variation * 0.23);
      // Solid stems with a narrow highlight, drawn from root to growing bud.
      c.beginPath();
      c.moveTo(x, root);
      c.bezierCurveTo(
        x - unit * 0.045,
        root - height * 0.35,
        x + sway * 1.5,
        root - height * 0.7,
        topx,
        topy,
      );
      c.lineCap = "round";
      c.strokeStyle = moon ? "#547d95" : "#36664b";
      c.lineWidth = unit * 0.014;
      c.stroke();
      c.strokeStyle = moon ? "#a4d3c9" : "#8db981";
      c.lineWidth = unit * 0.003;
      c.stroke();
      for (let leaf = 0; leaf < 3; leaf++) {
        const side = leaf % 2 ? -1 : 1,
          fraction = 0.24 + leaf * 0.17,
          lx = x + sway * fraction,
          ly = root - height * fraction;
        c.save();
        c.translate(lx, ly);
        c.rotate(side * 0.98);
        c.scale(Math.max(0.001, life.stem), Math.max(0.001, life.stem));
        c.beginPath();
        c.moveTo(0, 0);
        c.bezierCurveTo(
          -unit * 0.065,
          -unit * 0.03,
          -unit * 0.06,
          -unit * 0.12,
          0,
          -unit * 0.16,
        );
        c.bezierCurveTo(
          unit * 0.065,
          -unit * 0.12,
          unit * 0.055,
          -unit * 0.02,
          0,
          0,
        );
        const lg = c.createLinearGradient(
          -unit * 0.04,
          0,
          unit * 0.05,
          -unit * 0.16,
        );
        lg.addColorStop(0, moon ? "#233d66" : "#204f3a");
        lg.addColorStop(0.5, moon ? "#8fd6d0" : "#7ab36e");
        lg.addColorStop(1, "#234b42");
        c.fillStyle = lg;
        c.fill();
        line(
          c,
          [
            [0, 0],
            [0, -unit * 0.145],
          ],
          rgba("#c9e9ad", 0.5),
          unit * 0.002,
        );
        for (let v = 1; v < 5; v++)
          line(
            c,
            [
              [0, -unit * v * 0.026],
              [side * unit * 0.03, -unit * (v * 0.026 + 0.018)],
            ],
            rgba("#c9e9ad", 0.23),
            unit * 0.001,
          );
        c.restore();
      }
      if (life.stem < 0.005) continue;
      c.save();
      c.translate(topx, topy);
      c.rotate((sway / unit) * 0.9);
      const bloom = life.petals,
        bud = Math.max(0.03, life.stem * (1 - bloom));
      oval(
        c,
        0,
        -r * 0.05,
        r * 0.19 * bud,
        r * 0.32 * bud,
        moon ? "#a7cbb9" : "#8ea66a",
      );
      if (bloom > 0.001) {
        c.scale(bloom, bloom * (0.94 + 0.03 * Math.sin(a + variation)));
        if (moon) glow(c, 0, 0, r * 1.65, color, 0.18);
        const petals = sunflower ? 24 : moon ? 12 : 16;
        for (let layer = 0; layer < 2; layer++)
          for (let j = 0; j < petals; j++) {
            c.save();
            c.rotate(
              (j / petals) * TAU + (layer * Math.PI) / petals + variation * 0.4,
            );
            const len = r * (layer ? 0.86 : 1),
              width = r * (moon ? 0.43 : sunflower ? 0.23 : 0.27);
            petal(
              c,
              len,
              width,
              sunflower
                ? hslHex(tone + (j % 3) * 5, 0.85, 0.5)
                : moon
                  ? hslHex(tone + j * 2, 0.55, 0.64)
                  : "#fff8ec",
              moon,
            );
            c.restore();
          }
        const cr = r * (sunflower ? 0.38 : moon ? 0.17 : 0.27);
        const g = c.createRadialGradient(-cr * 0.28, -cr * 0.3, 0, 0, 0, cr);
        g.addColorStop(0, sunflower ? "#926132" : moon ? "#fff4c8" : "#ffdd78");
        g.addColorStop(1, sunflower ? "#30201f" : moon ? color : "#b87826");
        c.fillStyle = g;
        c.beginPath();
        c.arc(0, 0, cr, 0, TAU);
        c.fill();
        const seeds = sunflower ? 145 : 52;
        for (let j = 0; j < seeds; j++) {
          const rr = Math.sqrt((j + 0.5) / seeds) * cr * 0.94,
            theta = j * 2.399963;
          oval(
            c,
            Math.cos(theta) * rr,
            Math.sin(theta) * rr,
            cr * (sunflower ? 0.045 : 0.065),
            cr * (sunflower ? 0.035 : 0.055),
            j % 3 === 0 ? "#e1b55d" : sunflower ? "#bd8c45" : "#fff0ac",
            theta,
          );
        }
      }
      c.restore();
    }
    for (let i = 0; i < 30; i++) {
      const x =
        random(i, seed + 8) * w +
        Math.sin(a + random(i, seed) * TAU) * unit * 0.04;
      const y =
        h * (0.12 + random(i + 38, seed) * 0.8) +
        Math.cos(a + random(i + 3, seed) * TAU) * unit * 0.06;
      glow(
        c,
        x,
        y,
        unit * 0.006,
        moon ? color : "#fff2bc",
        0.18 * (0.5 + 0.5 * Math.sin(a + i)),
      );
    }
  };
export const flowerPainters = {
  "sprouting-daisies": flowers("daisy"),
  "sunflower-bloom": flowers("sunflower"),
  "moonflower-bloom": flowers("moon"),
};
