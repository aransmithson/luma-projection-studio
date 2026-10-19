import {
  background,
  hslHex,
  hue,
  line,
  oval,
  random,
  rgba,
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
  stitch,
} from "./imaginationArt";
import { weaveHeight } from "./imaginationMotion";

export const livingComic = imaginationPainter((c, p, color, seed) => {
  const a = p * TAU,
    ink = "#172238";
  background(c, 1000, 650, "#eaddbd", "#f5ead2");
  for (let panel = 0; panel < 3; panel++) {
    const x = 28 + panel * 326,
      tint = panel === 1 ? "#669dde" : panel === 0 ? color : "#ee85a1";
    c.save();
    c.beginPath();
    c.rect(x, 28, 304, 594);
    c.clip();
    c.fillStyle = tint;
    c.fillRect(x, 28, 304, 594);
    for (let y = 40; y < 650; y += 20)
      for (let dx = 0; dx < 320; dx += 20)
        oval(
          c,
          x + dx + (y % 40 ? 10 : 0),
          y,
          2.8 + random(dx + y, seed) * 1.2,
          2.8,
          rgba(ink, 0.17),
        );
    for (let i = 0; i < 12; i++) {
      const angle = (i * TAU) / 12;
      polygon(
        c,
        [
          [x + 152, 350],
          [x + 152 + Math.cos(angle) * 640, 350 + Math.sin(angle) * 640],
          [
            x + 152 + Math.cos(angle + 0.08) * 640,
            350 + Math.sin(angle + 0.08) * 640,
          ],
        ],
        "#ffffff28",
      );
    }
    c.restore();
    rounded(c, x, 28, 304, 594, 2, "#00000000", ink, 9);
  }
  // A bold, inked little hero crosses the panel border with its reaching hand.
  c.save();
  c.translate(490 + Math.sin(a) * 35, 415 + Math.sin(a * 2) * 8);
  c.rotate(Math.sin(a) * 0.07);
  shadow(c, 0, 132, 85, 16);
  for (const side of [-1, 1]) {
    line(
      c,
      [
        [side * 23, 35],
        [side * 48, 90],
        [side * 57, 128],
      ],
      ink,
      25,
    );
    line(
      c,
      [
        [side * 23, 35],
        [side * 48, 90],
        [side * 57, 128],
      ],
      "#f4f0dc",
      14,
    );
    rounded(c, side * 57 - 25, 118, 50, 22, 8, ink);
  }
  polygon(
    c,
    [
      [-45, -75],
      [49, -75],
      [38, 43],
      [-37, 43],
    ],
    color,
    ink,
    8,
  );
  for (const side of [-1, 1]) {
    const handX = side * (115 + Math.sin(a * 2) * 13),
      handY = -99 + (side === 1 ? Math.sin(a * 4) * 38 : 35);
    line(
      c,
      [
        [side * 36, -62],
        [side * 82, -15],
        [handX, handY],
      ],
      ink,
      22,
    );
    line(
      c,
      [
        [side * 36, -62],
        [side * 82, -15],
        [handX, handY],
      ],
      "#f9f2db",
      12,
    );
    oval(c, handX, handY, 19, 24, "#fff8e8");
    ring(c, handX, handY, 19, 24, ink, 5);
  }
  oval(c, 0, -124, 64, 66, "#fff8e8");
  ring(c, 0, -124, 64, 66, ink, 7);
  face(c, 0, -132, 100, p, ink);
  polygon(
    c,
    [
      [-19, -54],
      [13, -55],
      [2, -30],
      [25, -32],
      [-7, 3],
      [0, -22],
      [-19, -21],
    ],
    "#ffffff",
    ink,
    2,
  );
  c.restore();
  c.save();
  c.translate(195, 153);
  c.scale(1 + Math.sin(a * 2) * 0.06, 1 + Math.sin(a * 2) * 0.06);
  rounded(c, -120, -70, 240, 128, 52, "#fffdf0", ink, 6);
  polygon(
    c,
    [
      [43, 53],
      [94, 100],
      [79, 39],
    ],
    "#fffdf0",
    ink,
    5,
  );
  c.fillStyle = ink;
  c.font = "900 43px Segoe UI";
  c.textAlign = "center";
  c.fillText("HELLO!", 0, 9);
  c.restore();
  const punch = 0.7 + 0.3 * Math.sin(a * 3) ** 6;
  c.save();
  c.translate(825 + Math.sin(a * 6) * punch * 3, 325);
  c.rotate(Math.sin(a * 3) * 0.055);
  c.scale(punch, punch);
  polygon(
    c,
    Array.from({ length: 24 }, (_, i) => {
      const angle = (i * TAU) / 24,
        r = i % 2 ? 93 : 142;
      return [Math.cos(angle) * r, Math.sin(angle) * r * 0.78];
    }),
    color,
    ink,
    7,
  );
  c.fillStyle = ink;
  c.font = "900 italic 55px Segoe UI";
  c.textAlign = "center";
  c.fillText("POW!", 0, 18);
  c.restore();
});

export const claymationChaos = imaginationPainter((c, p, color, seed) => {
  const a = (Math.round(p * 96) / 96) * TAU,
    open = 0.5 - 0.5 * Math.cos(a);
  background(c, 1000, 650, "#39325d", "#736b92");
  c.fillStyle = "#428793";
  c.fillRect(0, 500, 1000, 150);
  for (let i = 0; i < 90; i++) {
    const x = random(i, seed) * 1000,
      y = random(i + 200, seed) * 650;
    ring(c, x, y, 7 + random(i + 10, seed) * 12, 2, "#101c3220", 1, -0.5);
  }
  // Fingerprints and hand impressions appear and fade as the clay heals.
  for (let i = 0; i < 4; i++) {
    const x = 90 + i * 275,
      y = 170 + random(i + 4, seed) * 140,
      press = Math.sin(a + i * 1.4) ** 8;
    c.save();
    c.translate(x, y);
    c.rotate((i - 1.5) * 0.25);
    c.globalAlpha = press * 0.45;
    oval(c, 0, 0, 29, 31, "#241e40");
    for (let f = 0; f < 5; f++)
      oval(
        c,
        (f - 2) * 14,
        -34 - Math.sin(f * 0.7) * 15,
        7,
        20,
        "#241e40",
        (f - 2) * 0.13,
      );
    c.restore();
  }
  shadow(c, 510, 532, 220, 34);
  const sx = 1 + Math.sin(a * 2) * 0.045,
    sy = 1 - Math.sin(a * 2) * 0.035;
  c.save();
  c.translate(510, 330);
  c.scale(sx, sy);
  velvet(c, 0, 0, 194, 210, color);
  for (const side of [-1, 1]) {
    velvet(c, side * 157, 145, 64, 43, color);
    velvet(c, side * 192, 5 + Math.sin(a * 2 + side) * 22, 47, 77, color);
  }
  for (let i = 0; i < 9; i++)
    ring(c, -70 + i * 13, -49, 15 + i * 7, 27 + i * 3, "#ffffff0c", 2, 0.35);
  face(c, 0, -113, 118, p);
  const doorHeight = 28 + open * 190;
  rounded(
    c,
    -75,
    188 - doorHeight,
    150,
    doorHeight + 14,
    [74, 74, 9, 9],
    "#332946",
    "#da80a3",
    7,
  );
  rounded(c, -64, 199 - doorHeight, 128, doorHeight, 58, "#1c2439");
  for (let i = 0; i < 6; i++)
    oval(c, (i - 2.5) * 22, 199 - doorHeight, 9, 6, "#f9ded0");
  c.restore();
  const travel = Math.sin(a) * 225,
    step = Math.sin(a * 12);
  c.save();
  c.translate(510 + travel, 475 + Math.abs(step) * 5);
  c.rotate(Math.sin(a * 4) * 0.09);
  shadow(c, 0, 54, 70, 15);
  const blue = hslHex(hue(color) + 155, 0.5, 0.66);
  for (const side of [-1, 1])
    velvet(c, side * 31, 43 + step * side * 7, 27, 17, blue);
  velvet(c, 0, -10, 63 + step * 2, 67 - step * 3, blue);
  velvet(c, -35, -67, 17, 39, blue);
  velvet(c, 35, -67, 17, 39, blue);
  face(c, 0, -17, 83, p + 0.08);
  c.restore();
});

export const yarnFactory = imaginationPainter((c, p, color, seed) => {
  const a = p * TAU,
    progress = weaveHeight(p),
    top = 540 - progress * 430;
  background(c, 1000, 650, "#172b37", "#0b1625");
  const palette = [color, "#e29bb7", "#edc881", "#7da7cb"];
  rounded(c, 121, 65, 758, 500, 16, "#0a1420", "#526e7c", 7);
  for (let x = 145; x < 860; x += 24)
    line(
      c,
      [
        [x, 75],
        [x, 553],
      ],
      "#bfc9be1a",
      2,
    );
  c.save();
  c.beginPath();
  c.rect(130, top, 740, 550 - top);
  c.clip();
  for (let row = 0; row < 24; row++)
    for (let col = 0; col < 31; col++) {
      const x = 143 + col * 24,
        y = 90 + row * 20,
        band = Math.floor(row / 4);
      stitch(
        c,
        x,
        y,
        23,
        palette[
          (band + Math.floor(col / 8) + Math.floor(random(1, seed) * 4)) % 4
        ],
      );
    }
  // Two knitted dolls are woven into the growing cloth, with button eyes.
  for (const [index, x] of [330, 660].entries()) {
    c.save();
    c.translate(x, 342 + Math.sin(a * 2 + index) * 8);
    c.rotate(Math.sin(a * 2 + index) * 0.06);
    const shade = palette[(index + 1) % 4];
    c.beginPath();
    c.roundRect(-63, -24, 126, 141, 45);
    c.arc(0, -72, 65, 0, TAU);
    c.clip();
    c.fillStyle = shade;
    c.fillRect(-100, -150, 200, 300);
    for (let y = -140; y < 140; y += 17)
      for (let dx = -92; dx < 95; dx += 19) stitch(c, dx, y, 18, shade);
    face(c, 0, -77, 83, p, "#293b44", true);
    c.restore();
    for (const side of [-1, 1]) {
      line(
        c,
        [
          [x + side * 57, 346],
          [x + side * 91, 310 + Math.sin(a * 3 + index) * 13],
        ],
        "#091521",
        23,
      );
      line(
        c,
        [
          [x + side * 57, 346],
          [x + side * 91, 310 + Math.sin(a * 3 + index) * 13],
        ],
        shade,
        15,
      );
      rounded(c, x + side * 33 - 17, 440, 34, 36, 15, shade);
    }
  }
  c.restore();
  const needleX = 500 + Math.sin(a * 6) * 85;
  for (const side of [-1, 1]) {
    line(
      c,
      [
        [needleX + side * 200, top - 35],
        [needleX - side * 40, top + 23],
      ],
      "#101c2b",
      14,
    );
    line(
      c,
      [
        [needleX + side * 200, top - 37],
        [needleX - side * 40, top + 21],
      ],
      "#becdd9",
      8,
    );
    oval(c, needleX + side * 200, top - 37, 11, 11, "#e4f0f3");
  }
  velvet(c, 87, 554, 61, 61, color);
  for (let i = 0; i < 10; i++)
    ring(c, 87, 554, 11 + i * 5, 57, "#eff9ec88", 2, i * 0.24);
  c.beginPath();
  c.moveTo(94, 498);
  c.bezierCurveTo(108, 430, 230, top + 26, needleX, top + 15);
  c.strokeStyle = color;
  c.lineWidth = 5;
  c.stroke();
});
