import { glow, line, oval } from "./common";
import { shaped, velvet } from "./characterArt";
import { tint } from "./materials";

export type ChaseCharacter =
  | "cat"
  | "mouse"
  | "fox"
  | "rabbit"
  | "ghost"
  | "pumpkin"
  | "robot"
  | "alien"
  | "snowman"
  | "penguin";
type C = CanvasRenderingContext2D;

function curve(c: C, color: string, width: number, draw: () => void) {
  c.beginPath();
  draw();
  c.strokeStyle = color;
  c.lineWidth = width;
  c.lineCap = "round";
  c.lineJoin = "round";
  c.stroke();
}

function eye(
  c: C,
  x: number,
  y: number,
  size: number,
  look: number,
  blink: number,
  iris = "#68bbad",
) {
  c.save();
  c.translate(x, y);
  c.scale(size, size);
  velvet(c, 0, 0.015, 0.19, 0.245, "#26303c");
  c.scale(1, blink);
  velvet(c, 0, 0, 0.165, 0.218, "#fff8e9");
  velvet(c, look * 0.055 + 0.025, 0.025, 0.105, 0.145, iris);
  oval(c, look * 0.06 + 0.035, 0.025, 0.063, 0.109, "#11151f");
  oval(c, look * 0.055 + 0.008, -0.038, 0.038, 0.052, "#ffffff");
  oval(c, 0.055, 0.095, 0.017, 0.022, "#ffffffb0");
  c.restore();
}

function scarf(c: C, color: string, stride: number, y = -1.16) {
  shaped(c, color, () => {
    c.moveTo(-0.24, y);
    c.bezierCurveTo(
      -0.69,
      y - 0.1,
      -0.91,
      y - 0.3 + Math.sin(stride) * 0.09,
      -1.18,
      y - 0.12,
    );
    c.lineTo(-1.1, y + 0.04);
    c.bezierCurveTo(-0.75, y - 0.04, -0.56, y + 0.22, -0.18, y + 0.16);
  });
  curve(c, tint(color, 1.3, 15), 0.035, () => {
    c.moveTo(-1.09, y - 0.07);
    c.quadraticCurveTo(-0.71, y - 0.1, -0.28, y + 0.08);
  });
  velvet(c, 0.02, y + 0.055, 0.36, 0.12, color);
  velvet(c, 0.31, y + 0.06, 0.12, 0.13, tint(color, 0.85));
}

function limb(
  c: C,
  side: number,
  stride: number,
  coat: string,
  foot: string,
  short = false,
) {
  const s = Math.sin(stride + side * Math.PI),
    lift = Math.max(0, Math.cos(stride + side * Math.PI)),
    hipX = side ? 0.22 : -0.22,
    endX = hipX + s * (short ? 0.3 : 0.45),
    endY = -0.035 - lift * (short ? 0.2 : 0.3);
  line(
    c,
    [
      [hipX, -0.55],
      [hipX - s * 0.15, -0.33 - lift * 0.08],
      [endX, endY - 0.06],
    ],
    coat,
    short ? 0.15 : 0.19,
  );
  line(
    c,
    [
      [hipX + 0.035, -0.5],
      [hipX - s * 0.13 + 0.025, -0.31 - lift * 0.08],
    ],
    tint(coat, 1.2, 10),
    0.045,
  );
  velvet(c, endX + 0.08, endY, short ? 0.22 : 0.24, 0.105, foot);
  curve(c, tint(foot, 0.55), 0.022, () => {
    c.moveTo(endX + 0.12, endY - 0.06);
    c.lineTo(endX + 0.15, endY - 0.012);
  });
}

function arm(
  c: C,
  stride: number,
  coat: string,
  back = false,
  carrying = false,
) {
  const swing = Math.sin(stride + (back ? Math.PI : 0));
  const points = carrying
    ? [
        [0.25, -1.02],
        [0.4, -0.67],
        [0.7, -0.74],
      ]
    : [
        [back ? -0.19 : 0.2, -1.03],
        [0.16 + swing * 0.31, -0.84],
        [0.35 + swing * 0.38, -1.02 + Math.cos(stride) * 0.08],
      ];
  line(c, points, coat, 0.15);
  const [x, y] = points[2];
  velvet(c, x, y, 0.14, 0.12, tint(coat, 1.08));
}

function ear(
  c: C,
  x: number,
  angle: number,
  coat: string,
  kind: ChaseCharacter,
) {
  c.save();
  c.translate(x, -1.88);
  c.rotate(angle);
  if (kind === "mouse") {
    velvet(c, 0, -0.13, 0.28, 0.29, coat);
    velvet(c, 0.025, -0.12, 0.19, 0.19, "#eaa5b5");
    oval(c, -0.025, -0.2, 0.055, 0.075, "#ffe7e359", -0.3);
  } else if (kind === "rabbit") {
    velvet(c, 0, -0.29, 0.15, 0.52, coat);
    velvet(c, 0.015, -0.31, 0.075, 0.36, "#f0abb9");
    oval(c, -0.04, -0.4, 0.025, 0.19, "#ffffff66", -0.06);
  } else {
    shaped(c, coat, () => {
      c.moveTo(-0.23, 0.12);
      c.quadraticCurveTo(-0.24, -0.13, -0.08, -0.43);
      c.quadraticCurveTo(0.17, -0.25, 0.25, 0.1);
    });
    shaped(c, kind === "fox" ? "#4a2b37" : "#d98a8d", () => {
      c.moveTo(-0.13, 0.02);
      c.lineTo(-0.07, -0.29);
      c.lineTo(0.14, 0.04);
    });
  }
  c.restore();
}

function animal(
  c: C,
  kind: ChaseCharacter,
  stride: number,
  look: number,
  blink: number,
  accent: string,
) {
  const coat =
      kind === "cat"
        ? "#e8a856"
        : kind === "fox"
          ? "#e68142"
          : kind === "mouse"
            ? "#a6acc4"
            : "#ede7e7",
    dark = tint(coat, 0.58),
    light = kind === "fox" || kind === "cat" ? "#ffebc9" : "#fff3ee",
    carrying = kind === "mouse" || kind === "rabbit";
  // Silhouettes are deliberately different: long cat tail, brush, cord and pompom.
  if (kind === "cat" || kind === "mouse") {
    curve(
      c,
      kind === "mouse" ? "#da96aa" : dark,
      kind === "mouse" ? 0.065 : 0.23,
      () => {
        c.moveTo(-0.33, -0.59);
        c.bezierCurveTo(
          -1.1,
          -0.29,
          -1.58,
          -0.92,
          -1.38,
          -1.48 + Math.sin(stride * 0.5) * 0.13,
        );
      },
    );
    if (kind === "cat") {
      curve(c, coat, 0.15, () => {
        c.moveTo(-0.39, -0.62);
        c.bezierCurveTo(
          -1.1,
          -0.34,
          -1.55,
          -0.96,
          -1.39,
          -1.48 + Math.sin(stride * 0.5) * 0.13,
        );
      });
      for (let i = 0; i < 3; i++)
        line(
          c,
          [
            [-0.68 - i * 0.24, -0.54 - i * i * 0.07],
            [-0.72 - i * 0.23, -0.43 - i * i * 0.07],
          ],
          "#9c5834",
          0.075,
        );
    }
  } else if (kind === "fox") {
    c.save();
    c.translate(-0.31, -0.65);
    c.rotate(Math.sin(stride * 0.5) * 0.11);
    shaped(c, coat, () => {
      c.moveTo(0, 0.12);
      c.bezierCurveTo(-0.6, 0.47, -1.1, 0.22, -1.35, -0.55);
      c.bezierCurveTo(-0.79, -0.39, -0.35, -0.45, 0, -0.12);
    });
    shaped(c, light, () => {
      c.moveTo(-1.35, -0.55);
      c.quadraticCurveTo(-1.15, -0.06, -0.86, 0.1);
      c.lineTo(-0.87, -0.14);
      c.lineTo(-0.67, -0.15);
      c.lineTo(-0.81, -0.38);
    });
    c.restore();
  } else velvet(c, -0.46, -0.66, 0.23, 0.23, "#ffffff");
  limb(c, 0, stride, dark, dark);
  arm(c, stride, dark, true);
  velvet(c, 0, -0.81, 0.43, 0.55, coat);
  velvet(c, 0.15, -0.79, 0.24, 0.4, light);
  limb(c, 1, stride, coat, kind === "fox" ? "#4a3340" : coat);
  if (kind === "cat") {
    for (let i = 0; i < 3; i++)
      curve(c, "#aa6536", 0.047, () => {
        c.moveTo(-0.37, -0.98 + i * 0.17);
        c.quadraticCurveTo(-0.23, -0.93 + i * 0.17, -0.19, -0.83 + i * 0.17);
      });
  }
  scarf(c, accent, stride);
  c.save();
  c.translate(0.045, -0.015);
  c.rotate(0.06 + look * 0.025);
  ear(c, -0.28, -0.24 + Math.sin(stride) * 0.09, coat, kind);
  ear(c, 0.28, 0.2 + Math.cos(stride) * 0.08, coat, kind);
  velvet(c, 0.02, -1.61, kind === "mouse" ? 0.43 : 0.51, 0.46, coat);
  if (kind === "fox") {
    shaped(c, light, () => {
      c.moveTo(-0.43, -1.56);
      c.quadraticCurveTo(-0.08, -1.4, 0.2, -1.5);
      c.lineTo(0.66, -1.43);
      c.quadraticCurveTo(0.22, -1.06, -0.26, -1.25);
    });
  }
  eye(c, 0, -1.69, kind === "mouse" ? 0.87 : 1, look, blink);
  eye(c, 0.32, -1.68, 0.77, look, blink);
  velvet(c, 0.32, -1.39, kind === "fox" ? 0.29 : 0.23, 0.16, light);
  velvet(c, 0.56, -1.46, 0.105, 0.077, kind === "fox" ? "#322e3c" : "#c76c85");
  oval(c, 0.53, -1.49, 0.032, 0.018, "#ffffff8c");
  curve(c, "#654c57", 0.026, () => {
    c.moveTo(0.38, -1.32);
    c.quadraticCurveTo(0.24, -1.24, 0.18, -1.34);
  });
  oval(c, -0.13, -1.4, 0.1, 0.055, "#eb869866");
  if (kind === "rabbit") {
    c.fillStyle = "#fffefa";
    c.fillRect(0.26, -1.28, 0.09, 0.11);
    line(
      c,
      [
        [0.3, -1.28],
        [0.3, -1.18],
      ],
      "#c1b5bd",
      0.013,
    );
  }
  if (kind === "cat" || kind === "mouse") {
    for (let i = 0; i < 3; i++)
      line(
        c,
        [
          [0.08, -1.38 + i * 0.025],
          [-0.38, -1.44 + i * 0.1],
        ],
        "#f7e8ddaa",
        0.014,
      );
  }
  if (kind === "cat") {
    for (let i = 0; i < 3; i++)
      line(
        c,
        [
          [-0.17 + i * 0.16, -2.0],
          [-0.12 + i * 0.14, -1.89],
        ],
        "#965b3c",
        0.054,
      );
  }
  c.restore();
  if (carrying) {
    c.save();
    c.translate(0.76, -0.91);
    c.rotate(Math.sin(stride) * 0.12);
    if (kind === "mouse") {
      shaped(c, "#ffc75b", () => {
        c.moveTo(-0.22, -0.16);
        c.lineTo(0.27, -0.04);
        c.lineTo(0.2, 0.27);
        c.lineTo(-0.22, 0.18);
      });
      shaped(c, "#fff19b", () => {
        c.moveTo(-0.22, -0.16);
        c.lineTo(0.04, -0.35);
        c.lineTo(0.27, -0.04);
      });
      for (const [x, y, r] of [
        [-0.1, -0.02, 0.056],
        [0.13, 0.07, 0.065],
        [-0.02, 0.16, 0.04],
      ])
        velvet(c, x, y, r, r * 0.8, "#c28230");
    } else {
      shaped(c, "#ff9a42", () => {
        c.moveTo(-0.1, -0.28);
        c.quadraticCurveTo(0.23, -0.33, 0.21, -0.08);
        c.lineTo(-0.03, 0.43);
      });
      for (let i = 0; i < 3; i++) {
        line(
          c,
          [
            [0.025, -0.26],
            [-0.07 + i * 0.13, -0.53 + (i % 2) * 0.05],
          ],
          "#72b875",
          0.065,
        );
        line(
          c,
          [
            [0.0, -0.08 + i * 0.13],
            [0.1 - i * 0.025, -0.06 + i * 0.13],
          ],
          "#d76b30",
          0.02,
        );
      }
    }
    c.restore();
  }
  arm(c, stride, coat, false, carrying);
}

function ghost(
  c: C,
  stride: number,
  look: number,
  blink: number,
  accent: string,
) {
  glow(c, 0, -1.25, 1.24, accent, 0.2);
  shaped(c, "#d4edf7", () => {
    c.moveTo(-0.55, -1.43);
    c.bezierCurveTo(-0.68, -2.35, 0.64, -2.42, 0.65, -1.47);
    c.bezierCurveTo(0.63, -0.85, 0.98, -0.52, 0.78, -0.46);
    c.quadraticCurveTo(0.48, -0.29, 0.36, -0.63);
    for (let i = 0; i < 4; i++) {
      const x = 0.36 - i * 0.25;
      c.quadraticCurveTo(
        x - 0.12,
        -0.27 + Math.sin(stride + i) * 0.07,
        x - 0.25,
        -0.62,
      );
    }
    c.quadraticCurveTo(-0.44, -0.9, -0.55, -1.43);
  });
  curve(c, "#ffffffb0", 0.04, () => {
    c.moveTo(-0.42, -1.52);
    c.quadraticCurveTo(-0.41, -2.02, 0.02, -2.05);
  });
  eye(c, 0.02, -1.64, 1.1, look, blink, accent);
  eye(c, 0.36, -1.62, 0.85, look, blink, accent);
  oval(c, -0.14, -1.37, 0.13, 0.058, "#ef9dbb8c");
  velvet(c, 0.25, -1.27, 0.12, 0.11, "#253b62");
  oval(c, 0.25, -1.22, 0.067, 0.034, "#ef95b2");
  for (const back of [true, false]) {
    c.save();
    c.translate(back ? -0.38 : 0.47, -1.15);
    c.rotate(-0.5 + Math.sin(stride) * 0.2);
    velvet(c, 0.18, 0, 0.36, 0.13, back ? "#8ab8d3" : "#e4faff");
    c.restore();
  }
  for (let i = 0; i < 3; i++) {
    curve(c, `${accent}55`, 0.022, () => {
      c.moveTo(-0.83, -0.72 - i * 0.22);
      c.quadraticCurveTo(
        -1.16,
        -0.93 - i * 0.17 + Math.sin(stride + i) * 0.06,
        -1.48 - i * 0.11,
        -0.73 - i * 0.2,
      );
    });
  }
}

function pumpkin(
  c: C,
  stride: number,
  look: number,
  blink: number,
  accent: string,
) {
  limb(c, 0, stride, "#588b50", "#51406a", true);
  arm(c, stride, "#447b47", true);
  velvet(c, 0, -0.99, 0.67, 0.68, "#b85d25");
  for (const [x, rx, color] of [
    [-0.42, 0.23, "#df782d"],
    [0.39, 0.26, "#e88430"],
    [-0.16, 0.31, "#f99b39"],
    [0.16, 0.25, "#ffb14c"],
  ] as const)
    velvet(c, x, -1.0, rx, 0.66, color);
  c.save();
  c.translate(0, -1.6);
  c.rotate(Math.sin(stride) * 0.12);
  shaped(c, "#729b50", () => {
    c.moveTo(-0.12, 0.08);
    c.lineTo(-0.08, -0.24);
    c.lineTo(0.09, -0.32);
    c.lineTo(0.13, -0.23);
    c.lineTo(0.1, 0.06);
  });
  shaped(c, accent, () => {
    c.moveTo(0, 0);
    c.quadraticCurveTo(0.15, -0.39, 0.45, -0.2);
    c.quadraticCurveTo(0.27, 0.01, 0, 0);
  });
  line(
    c,
    [
      [0.07, -0.04],
      [0.35, -0.18],
    ],
    "#fff4ca66",
    0.017,
  );
  c.restore();
  eye(c, -0.06, -1.18, 1.1, look, blink, "#ffcb56");
  eye(c, 0.34, -1.15, 0.9, look, blink, "#ffcb56");
  shaped(c, "#6a3b32", () => {
    c.moveTo(-0.12, -0.87);
    c.quadraticCurveTo(0.23, -0.69, 0.5, -0.87);
    c.quadraticCurveTo(0.24, -0.39, -0.12, -0.87);
  });
  shaped(c, "#ffe68a", () => {
    c.moveTo(-0.01, -0.81);
    c.lineTo(0.09, -0.8);
    c.lineTo(0.1, -0.67);
    c.lineTo(0.23, -0.65);
    c.lineTo(0.25, -0.77);
    c.lineTo(0.4, -0.8);
    c.quadraticCurveTo(0.25, -0.53, -0.01, -0.81);
  });
  limb(c, 1, stride, "#75a857", "#665080", true);
  arm(c, stride, "#71984f");
}

function panel(
  c: C,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  color: string,
) {
  const g = c.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, tint(color, 1.18, 20));
  g.addColorStop(0.4, color);
  g.addColorStop(1, tint(color, 0.5));
  c.fillStyle = g;
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  c.fill();
  c.strokeStyle = tint(color, 1.3, 20);
  c.lineWidth = 0.025;
  c.stroke();
}

function robot(
  c: C,
  stride: number,
  look: number,
  blink: number,
  accent: string,
) {
  for (const side of [0, 1]) {
    const s = Math.sin(stride + side * Math.PI),
      x = (side ? 0.22 : -0.22) + s * 0.4,
      y = -0.02 - Math.max(0, Math.cos(stride + side * Math.PI)) * 0.28;
    line(
      c,
      [
        [side ? 0.22 : -0.22, -0.63],
        [x * 0.3, -0.34],
        [x, y - 0.08],
      ],
      "#596f8e",
      0.14,
    );
    velvet(c, x * 0.3, -0.34, 0.11, 0.11, "#b8d2e5");
    panel(c, x - 0.15, y - 0.1, 0.4, 0.17, 0.06, side ? "#bed6e6" : "#7d92ad");
    line(
      c,
      [
        [x - 0.12, y + 0.05],
        [x + 0.2, y + 0.05],
      ],
      "#25374d",
      0.045,
    );
  }
  arm(c, stride, "#63788e", true);
  panel(c, -0.41, -1.31, 0.82, 0.75, 0.18, "#a9c6d9");
  panel(c, -0.25, -1.17, 0.46, 0.37, 0.07, "#233b59");
  for (let i = 0; i < 3; i++) {
    line(
      c,
      [
        [-0.17, -1.08 + i * 0.1],
        [0.1, -1.08 + i * 0.1],
      ],
      i === 0 ? accent : "#587993",
      0.036,
    );
  }
  for (const x of [-0.27, 0.25]) velvet(c, x, -0.69, 0.035, 0.035, "#e7f6ff");
  c.save();
  c.translate(0.05, -0.03);
  c.rotate(Math.sin(stride) * 0.045);
  line(
    c,
    [
      [-0.05, -1.98],
      [-0.12, -2.3],
    ],
    "#c3d4df",
    0.055,
  );
  glow(c, -0.12, -2.32, 0.24, accent, 0.35);
  velvet(c, -0.12, -2.32, 0.1, 0.1, accent);
  velvet(c, -0.49, -1.7, 0.15, 0.23, "#526d8a");
  panel(c, -0.49, -2.02, 1.02, 0.66, 0.2, "#bed5e3");
  panel(c, -0.32, -1.88, 0.8, 0.34, 0.1, "#11233b");
  for (const x of [-0.09, 0.25]) {
    c.save();
    c.translate(x + look * 0.04, -1.71);
    c.scale(1, blink);
    glow(c, 0, 0, 0.17, accent, 0.22);
    panel(c, -0.06, -0.1, 0.12, 0.2, 0.035, accent);
    c.restore();
  }
  line(
    c,
    [
      [0.08, -1.44],
      [0.29, -1.44],
    ],
    "#55758a",
    0.028,
  );
  line(
    c,
    [
      [-0.3, -1.96],
      [0.23, -1.96],
    ],
    "#ffffff80",
    0.025,
  );
  c.restore();
  arm(c, stride, "#9cbace");
}

function alien(
  c: C,
  stride: number,
  look: number,
  blink: number,
  accent: string,
) {
  limb(c, 0, stride, "#417e75", "#588c84");
  arm(c, stride, "#468578", true);
  velvet(c, -0.04, -0.9, 0.33, 0.43, "#80c89b");
  velvet(c, 0.07, -0.89, 0.16, 0.29, "#c5e5ad");
  limb(c, 1, stride, "#83b88f", "#9dcaa0");
  for (const x of [-0.29, 0.27]) {
    const tipX = x + Math.sin(stride * 0.5 + x) * 0.1;
    curve(c, "#72b98e", 0.045, () => {
      c.moveTo(x, -1.95);
      c.quadraticCurveTo(x - 0.12, -2.2, tipX, -2.35);
    });
    velvet(c, tipX, -2.35, 0.085, 0.085, accent);
  }
  velvet(c, 0.03, -1.64, 0.56, 0.56, "#a2d6a0");
  for (const [x, angle, size] of [
    [-0.08, -0.22, 1],
    [0.34, 0.22, 0.78],
  ]) {
    c.save();
    c.translate(x, -1.65);
    c.rotate(angle);
    c.scale(size, size * blink);
    velvet(c, 0, 0, 0.2, 0.285, "#294954");
    velvet(c, look * 0.045, 0, 0.16, 0.23, "#292844");
    oval(c, -0.06 + look * 0.04, -0.09, 0.065, 0.09, "#ecffffb3", -0.2);
    oval(c, 0.06, 0.12, 0.025, 0.042, accent);
    c.restore();
  }
  curve(c, "#40766c", 0.026, () => {
    c.moveTo(0.13, -1.23);
    c.quadraticCurveTo(0.24, -1.17, 0.36, -1.26);
  });
  oval(c, 0.19, -1.37, 0.021, 0.027, "#598e76");
  oval(c, 0.27, -1.36, 0.021, 0.027, "#598e76");
  c.save();
  c.translate(0.64, -0.94);
  c.rotate(0.2 + Math.sin(stride) * 0.12);
  panel(c, -0.14, -0.3, 0.28, 0.53, 0.06, "#90b1c3");
  panel(c, -0.07, -0.36, 0.14, 0.08, 0.02, "#d6e9ef");
  panel(c, -0.09, -0.22, 0.18, 0.34, 0.02, accent);
  line(
    c,
    [
      [0.03, -0.18],
      [-0.03, -0.04],
      [0.04, -0.04],
      [-0.03, 0.08],
    ],
    "#f3ffff",
    0.025,
  );
  c.restore();
  arm(c, stride, "#93c99a", false, true);
}

function penguin(
  c: C,
  stride: number,
  look: number,
  blink: number,
  accent: string,
) {
  limb(c, 0, stride, "#d89342", "#d8893c", true);
  velvet(c, 0, -0.86, 0.55, 0.68, "#354053");
  velvet(c, 0.13, -0.81, 0.37, 0.52, "#edf5f3");
  limb(c, 1, stride, "#edb05a", "#f2b559", true);
  scarf(c, accent, stride, -1.27);
  velvet(c, 0.03, -1.67, 0.5, 0.48, "#3f4b61");
  velvet(c, 0.05, -1.6, 0.25, 0.31, "#f3eee5");
  velvet(c, 0.34, -1.58, 0.19, 0.29, "#f3eee5");
  eye(c, 0.03, -1.68, 0.8, look, blink, "#687b93");
  eye(c, 0.35, -1.66, 0.65, look, blink, "#687b93");
  shaped(c, "#ffc268", () => {
    c.moveTo(0.2, -1.45);
    c.quadraticCurveTo(0.48, -1.59, 0.65, -1.4);
    c.quadraticCurveTo(0.38, -1.28, 0.2, -1.45);
  });
  line(
    c,
    [
      [0.26, -1.42],
      [0.56, -1.41],
    ],
    "#c3803c",
    0.025,
  );
  c.save();
  c.translate(-0.35, -1.1);
  c.rotate(Math.sin(stride) * 0.6);
  velvet(c, -0.09, 0.24, 0.15, 0.4, "#48566f");
  c.restore();
  c.save();
  c.translate(0.61, -0.86);
  c.rotate(-0.5 + Math.sin(stride) * 0.12);
  shaped(c, "#9bcddd", () => {
    c.moveTo(-0.2, 0);
    c.lineTo(-0.4, -0.15);
    c.lineTo(-0.39, 0.17);
  });
  velvet(c, 0.02, 0, 0.31, 0.14, "#b4ddeb");
  oval(c, 0.21, -0.035, 0.033, 0.038, "#253d58");
  for (let i = 0; i < 3; i++)
    line(
      c,
      [
        [-0.12 + i * 0.1, -0.06],
        [-0.14 + i * 0.1, 0.07],
      ],
      "#608da870",
      0.018,
    );
  c.restore();
  c.save();
  c.translate(0.3, -1.06);
  c.rotate(-0.7);
  velvet(c, 0.03, 0.24, 0.15, 0.35, "#4b5a71");
  c.restore();
}

function snowman(
  c: C,
  stride: number,
  look: number,
  blink: number,
  accent: string,
) {
  limb(c, 0, stride, "#9ebbc9", "#dae6e9", true);
  for (const back of [true, false]) {
    const s = Math.sin(stride + (back ? Math.PI : 0)),
      x = (back ? -0.31 : 0.36) + s * 0.37;
    line(
      c,
      [
        [back ? -0.39 : 0.38, -1.1],
        [x, -1.04],
        [x + 0.21, -1.35],
      ],
      back ? "#735345" : "#ab7d55",
      0.07,
    );
    line(
      c,
      [
        [x + 0.12, -1.24],
        [x + 0.06, -1.39],
      ],
      "#a77952",
      0.045,
    );
  }
  velvet(c, -0.04, -0.8, 0.58, 0.64, "#e0eef3");
  velvet(c, -0.21, -1.02, 0.2, 0.28, "#f2f8fb");
  for (let i = 0; i < 3; i++)
    velvet(c, 0.17, -1.02 + i * 0.24, 0.045, 0.047, "#30465a");
  limb(c, 1, stride, "#d5e4eb", "#eef5f4", true);
  scarf(c, accent, stride, -1.28);
  velvet(c, 0.06, -1.68, 0.46, 0.43, "#e9f1f6");
  eye(c, 0.0, -1.72, 0.72, look, blink, "#54758c");
  eye(c, 0.3, -1.7, 0.58, look, blink, "#54758c");
  shaped(c, "#ffa657", () => {
    c.moveTo(0.24, -1.59);
    c.lineTo(0.81, -1.53);
    c.quadraticCurveTo(0.28, -1.35, 0.24, -1.59);
  });
  for (let i = 0; i < 4; i++)
    oval(
      c,
      0.02 + i * 0.095,
      -1.4 + Math.sin((i / 3) * Math.PI) * 0.045,
      0.022,
      0.025,
      "#476071",
    );
  oval(c, -0.19, -1.51, 0.09, 0.045, "#e9a0b566");
  c.save();
  c.translate(0.02, -2.03);
  c.rotate(-0.12 + Math.sin(stride) * 0.07);
  panel(c, -0.28, -0.4, 0.56, 0.43, 0.045, "#394357");
  panel(c, -0.29, -0.12, 0.58, 0.12, 0.015, accent);
  velvet(c, 0, 0.01, 0.47, 0.09, "#4b586c");
  line(
    c,
    [
      [-0.19, -0.34],
      [-0.19, -0.17],
    ],
    "#b1c9d366",
    0.03,
  );
  c.restore();
}

export function drawChaseCharacter(
  c: C,
  kind: ChaseCharacter,
  stride: number,
  look: number,
  blink: number,
  accent: string,
) {
  c.save();
  if (["cat", "mouse", "fox", "rabbit"].includes(kind))
    animal(c, kind, stride, look, blink, accent);
  else if (kind === "ghost") ghost(c, stride, look, blink, accent);
  else if (kind === "pumpkin") pumpkin(c, stride, look, blink, accent);
  else if (kind === "robot") robot(c, stride, look, blink, accent);
  else if (kind === "alien") alien(c, stride, look, blink, accent);
  else if (kind === "penguin") penguin(c, stride, look, blink, accent);
  else snowman(c, stride, look, blink, accent);
  c.restore();
}
