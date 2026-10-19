import { _electron as electron, expect } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp } from "node:fs/promises";
import path from "node:path";
import electronPath from "electron";

const artifacts = path.resolve("test-results");
await mkdir(artifacts, { recursive: true });
const profile = await mkdtemp(path.join(artifacts, "startup-recovery-"));
const packaged = process.argv.includes("--packaged");
const executable = packaged
  ? path.resolve(
      process.env.LUMA_RELEASE_DIR || "release",
      "win-unpacked/Nox Projection Studio.exe",
    )
  : electronPath;
const args = [
  ...(packaged ? [] : [path.resolve(".")]),
  `--user-data-dir=${profile}`,
];
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
delete env.VITE_DEV_SERVER_URL;
const app = await electron.launch({
  executablePath: executable,
  args,
  env,
  timeout: 60000,
});
const children = [];
try {
  const page = await app.firstWindow();
  await expect(
    page.getByRole("heading", { name: "Map your space." }),
  ).toBeVisible();
  const originalId = await app.evaluate(
    ({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].id,
  );
  for (const state of ["hide", "minimize"]) {
    await app.evaluate(
      ({ BrowserWindow }, state) => BrowserWindow.getAllWindows()[0][state](),
      state,
    );
    await expect
      .poll(() =>
        app.evaluate(({ BrowserWindow }, state) => {
          const win = BrowserWindow.getAllWindows()[0];
          return state === "hide" ? !win.isVisible() : win.isMinimized();
        }, state),
      )
      .toBe(true);
    const child = spawn(executable, args, {
      env,
      windowsHide: true,
      stdio: "ignore",
    });
    children.push(child);
    await expect
      .poll(
        () =>
          app.evaluate(({ BrowserWindow }) => {
            const win = BrowserWindow.getAllWindows()[0];
            return win.isVisible() && !win.isMinimized();
          }),
        { timeout: 15000 },
      )
      .toBe(true);
    await expect.poll(() => child.exitCode, { timeout: 10000 }).toBe(0);
    expect(
      await app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows().map((win) => win.id),
      ),
    ).toEqual([originalId]);
    console.log(
      `PASS: reopening Nox restores the ${state === "hide" ? "hidden" : "minimized"} editor and exits the duplicate process.`,
    );
  }
  await page
    .getByRole("button", { name: "Placement mesh", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Placement mesh", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({
    path: path.join(artifacts, "luma-startup-recovered.png"),
  });
} finally {
  for (const child of children) if (child.exitCode === null) child.kill();
  await app.close();
}
