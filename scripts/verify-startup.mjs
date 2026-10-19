import { spawn, execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

// Exercise the same native startup as a double click, without inspector or CDP
// flags. Use a separate profile, identify the actual versioned editor window,
// and close only the process belonging to this test.
const mode = process.argv[2] || "portable";
const hidden = process.argv.includes("--hidden");
const copySavedProfile = process.argv.includes("--copy-saved-profile");
const releaseRoot = path.resolve(process.env.LUMA_RELEASE_DIR || "release");
if (!["local", "unpacked", "portable"].includes(mode))
  throw new Error("Use local, unpacked or portable.");
const root = path.resolve("."),
  artifacts = path.join(root, "test-results");
const { version } = JSON.parse(await readFile("package.json", "utf8"));
await mkdir(artifacts, { recursive: true });
const profile = await mkdtemp(path.join(artifacts, `startup-${mode}-`));
if (copySavedProfile) {
  await cp(path.join(process.env.APPDATA, "luma-projection-studio"), profile, {
    recursive: true,
  });
}
const psQuote = (value) => `'${value.replaceAll("'", "''")}'`;
const powershell = async (code) =>
  (
    await promisify(execFile)(
      "powershell.exe",
      ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", code],
      { windowsHide: true, timeout: 15000 },
    )
  ).stdout.trim();
const findEditor = async () => {
  const text = await powershell(`
    $lumaTestProfile = ${psQuote(profile)}
    Get-CimInstance Win32_Process | Where-Object {
      $_.Name -in @('electron.exe', 'Nox Projection Studio.exe') -and
      $_.CommandLine -and $_.CommandLine.Contains($lumaTestProfile) -and
      $_.CommandLine -notmatch '--type='
    } | ForEach-Object {
      $lumaTestProcess = Get-Process -Id $_.ProcessId -ErrorAction SilentlyContinue
      if ($lumaTestProcess) {
        [pscustomobject]@{ pid = $_.ProcessId; title = $lumaTestProcess.MainWindowTitle; window = $lumaTestProcess.MainWindowHandle.ToInt64() }
      }
    } | ConvertTo-Json -Compress
  `);
  const processes = JSON.parse(text || "[]");
  return Array.isArray(processes) ? processes : [processes];
};
let runtimeMatches = null;
if (mode !== "local") {
  const sha = async (file) =>
    createHash("sha256")
      .update(await readFile(file))
      .digest("hex");
  runtimeMatches =
    (await sha(
      path.join(releaseRoot, "win-unpacked/Nox Projection Studio.exe"),
    )) === (await sha("node_modules/electron/dist/electron.exe"));
  if (!runtimeMatches)
    throw new Error(
      "Packaged runtime was modified. This release must preserve the original Electron executable.",
    );
}
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
delete env.VITE_DEV_SERVER_URL;
// Exercise the same extraction directory as Explorer, not an agent's temp root.
const userTemp = await powershell(
  "[Environment]::GetEnvironmentVariable('TEMP', 'User')",
);
if (userTemp) {
  env.TEMP = userTemp;
  env.TMP = userTemp;
}
const executable =
  mode === "local"
    ? "powershell.exe"
    : mode === "unpacked"
      ? path.join(releaseRoot, "win-unpacked/Nox Projection Studio.exe")
      : path.join(releaseRoot, `Nox-Projection-Studio-${version}.exe`);
const args =
  mode === "local"
    ? [
        "-NoLogo",
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        `& ${psQuote(path.join(root, "Start Nox.cmd"))} ${psQuote(`--user-data-dir=${profile}`)}`,
      ]
    : [`--user-data-dir=${profile}`];
const startedAt = Date.now();
const child = spawn(executable, args, {
  cwd: root,
  env,
  // Hide the local launcher's shell, but let a GUI executable show its editor.
  windowsHide: mode === "local" || hidden,
  stdio: ["ignore", "ignore", "pipe"],
});
let stderr = "",
  launchError;
child.stderr.on("data", (data) => {
  stderr += data.toString();
});
child.on("error", (error) => {
  launchError = error;
});
try {
  let editor;
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    if (launchError) throw launchError;
    if (child.exitCode !== null && child.exitCode !== 0)
      throw new Error(`Launch exited ${child.exitCode}: ${stderr}`);
    editor = (await findEditor()).find(
      (process) =>
        process.window &&
        process.title.includes(`Projection Studio ${version}`),
    );
    if (editor) break;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!editor)
    throw new Error(
      `No Nox ${version} editor window appeared during normal ${mode} startup. ${stderr}`,
    );
  const startupMs = Date.now() - startedAt;
  await new Promise((resolve) => setTimeout(resolve, 2000));
  const stable = (await findEditor()).find(
    (process) => process.pid === editor.pid && process.window,
  );
  if (!stable) throw new Error("The editor closed immediately after startup.");
  await writeFile(
    path.join(artifacts, `startup-${mode}${hidden ? "-hidden" : ""}.json`),
    JSON.stringify(
      {
        version,
        mode,
        debuggingFlags: false,
        hiddenLauncher: hidden,
        copiedSavedProfile: copySavedProfile,
        releaseRoot,
        startupMs,
        runtimeMatches,
        ...stable,
        checkedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  console.log(
    `PASS: ${mode} ${version} opens its native editor in ${(startupMs / 1000).toFixed(1)}s without debugging flags${hidden ? " from a hidden launcher" : ""}; versioned window remains open.`,
  );
} finally {
  for (const process of await findEditor()) {
    await powershell(
      `$lumaTestProcess = Get-Process -Id ${process.pid} -ErrorAction SilentlyContinue; if ($lumaTestProcess) { $null = $lumaTestProcess.CloseMainWindow() }`,
    );
  }
  await new Promise((resolve) => setTimeout(resolve, 1500));
  for (const process of await findEditor())
    await powershell(
      `Stop-Process -Id ${process.pid} -ErrorAction SilentlyContinue`,
    );
  if (child.exitCode === null) child.kill();
}
