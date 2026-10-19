const { app, BrowserWindow, ipcMain, dialog, screen, powerSaveBlocker, clipboard, protocol } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const { configureAudio, copyAudioFrame } = require('./audio.cjs');
const { createMediaLibrary } = require('./media.cjs');

protocol.registerSchemesAsPrivileged([{ scheme: 'luma-media', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true } }]);

let editor = null;
let output = null;
let renderState = null;
let outputPointer = null;
let audioFrame = null;
let outputDisplayId = null;
let powerBlocker = null;
const devUrl = process.env.VITE_DEV_SERVER_URL;
const ownsInstance = app.requestSingleInstanceLock();
if (!ownsInstance) app.quit();

function showEditor() {
  if (!editor || editor.isDestroyed()) return;
  if (editor.isMinimized()) editor.restore();
  // Windows can inherit a hidden launch state from a shell or launcher.
  // Show explicitly after creation/loading, even with BrowserWindow's default show.
  editor.show();
  editor.focus();
}
app.on('second-instance', showEditor);
app.on('activate', showEditor);

function secureWindow(win) {
  win.setMenu(null);
  win.on('page-title-updated', event => event.preventDefault());
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', event => event.preventDefault());
}
function loadWindow(win, isOutput = false) {
  if (devUrl) return win.loadURL(`${devUrl}${isOutput ? '/?output=1' : '/'}`);
  return win.loadFile(path.join(__dirname, '../dist/index.html'), isOutput ? { query: { output: '1' } } : {});
}
const preferences = () => ({ preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false });
function status() { return { open: !!output && !output.isDestroyed(), displayId: outputDisplayId }; }
function notifyStatus() { if (editor && !editor.isDestroyed()) editor.webContents.send('luma:output-status', status()); }
function requireEditor(event) { if (!editor || event.sender !== editor.webContents) throw new Error('This operation is only available in the editor.'); }
function checkState(state) {
  if (!state || state.project?.version !== 1 || !Array.isArray(state.project.surfaces) || state.project.surfaces.length > 32 || JSON.stringify(state).length > 2_000_000) throw new Error('Invalid projection state.');
  return { ...state, pointer: outputPointer, audio: audioFrame };
}

if (ownsInstance) app.whenReady().then(async () => {
  const media = createMediaLibrary(path.join(app.getPath('userData'), 'media'));
  protocol.handle('luma-media', request => media.serve(request));
  const notifyMedia = () => {
    for (const win of [editor, output]) if (win && !win.isDestroyed()) win.webContents.send('luma:media-changed');
  };
  ipcMain.handle('luma:list-media', event => { requireEditor(event); return media.list(); });
  ipcMain.handle('luma:import-media', async (event, expectedId) => {
    requireEditor(event);
    const result = await dialog.showOpenDialog(editor, { title: expectedId ? 'Locate the original animation' : 'Import animation', properties: ['openFile'], filters: [{ name: 'Animations (MP4 video or GIF)', extensions: ['mp4', 'gif'] }] });
    if (result.canceled || !result.filePaths[0]) return { canceled: true };
    try { return { canceled: false, asset: await media.importFile(result.filePaths[0], expectedId) }; }
    catch (error) { return { canceled: false, error: error.message }; }
  });
  ipcMain.handle('luma:complete-media', async (event, asset) => {
    requireEditor(event);
    const result = await media.complete(asset); notifyMedia(); return result;
  });
  ipcMain.on('luma:output-pointer', (event, point) => {
    requireEditor(event);
    if (point !== null && (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y) || point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1)) return;
    outputPointer = point === null ? null : { x: point.x, y: point.y };
    if (renderState) renderState = { ...renderState, pointer: outputPointer };
    if (output && !output.isDestroyed()) output.webContents.send('luma:output-pointer', outputPointer);
  });
  ipcMain.handle('luma:copy-shapes', async (event, data) => {
    requireEditor(event);
    if (typeof data !== 'string' || !data.startsWith('LUMA_SHAPES_V1\n') || data.length > 2_000_000) throw new Error('Invalid copied shapes.');
    await clipboard.writeText(data);
  });
  ipcMain.handle('luma:paste-shapes', async event => {
    requireEditor(event);
    const data = await clipboard.readText();
    return data.length <= 2_000_000 && data.startsWith('LUMA_SHAPES_V1\n') ? data : '';
  });
  app.setAppUserModelId('studio.luma.projection');
  editor = new BrowserWindow({ width: 1560, height: 1000, minWidth: 1120, minHeight: 760, title: `Luma · Projection Studio ${app.getVersion()}`, icon: path.join(__dirname, 'icon.png'), backgroundColor: '#101114', autoHideMenuBar: true, webPreferences: preferences() });
  secureWindow(editor);
  const setAudioCapture = configureAudio(editor.webContents.session, () => editor);
  const publishAudio = frame => {
    audioFrame = frame;
    if (renderState) renderState = { ...renderState, audio: frame };
    if (output && !output.isDestroyed()) output.webContents.send('luma:audio-frame', frame);
  };
  ipcMain.handle('luma:audio-capture', (event, source) => { requireEditor(event); setAudioCapture(source); });
  ipcMain.on('luma:audio-frame', (event, frame) => {
    if (!editor || event.sender !== editor.webContents) return;
    try { publishAudio(copyAudioFrame(frame)); } catch { /* Ignore malformed frames. */ }
  });
  editor.webContents.on('did-start-navigation', (_event, _url, _inPlace, isMainFrame) => {
    if (isMainFrame) { setAudioCapture(null); publishAudio(null); }
  });
  editor.webContents.on('render-process-gone', () => { setAudioCapture(null); publishAudio(null); });
  editor.once('ready-to-show', showEditor);
  editor.on('closed', () => { editor = null; if (output && !output.isDestroyed()) output.close(); });

  ipcMain.handle('luma:displays', event => {
    requireEditor(event);
    const primary = screen.getPrimaryDisplay().id;
    return screen.getAllDisplays().map((display, i) => ({ id: display.id, label: display.label || `Display ${i + 1}`, width: display.size.width, height: display.size.height, primary: display.id === primary, scaleFactor: display.scaleFactor }));
  });
  ipcMain.handle('luma:open-output', async (event, displayId, state) => {
    requireEditor(event); renderState = checkState(state);
    const display = screen.getAllDisplays().find(d => d.id === displayId);
    if (!display) throw new Error('That display is no longer connected. Refresh the display list.');
    const isPrimary = display.id === screen.getPrimaryDisplay().id;
    outputDisplayId = display.id;
    if (output && !output.isDestroyed()) {
      output.setFullScreen(false);
      output.setBounds(isPrimary ? { x: display.bounds.x + 80, y: display.bounds.y + 80, width: Math.min(1080, display.workArea.width - 160), height: Math.min(680, display.workArea.height - 160) } : display.bounds);
      output.setFullScreen(!isPrimary);
      output.webContents.send('luma:output-state', renderState); output.show(); notifyStatus(); return status();
    }
    output = new BrowserWindow({ ...(isPrimary ? { x: display.bounds.x + 80, y: display.bounds.y + 80, width: Math.min(1080, display.workArea.width - 160), height: Math.min(680, display.workArea.height - 160) } : display.bounds), title: 'Luma · Projector output · F: fullscreen · Esc: close', show: false, backgroundColor: '#000000', autoHideMenuBar: true, fullscreen: !isPrimary, webPreferences: preferences() });
    secureWindow(output);
    output.webContents.on('before-input-event', (inputEvent, input) => {
      if (input.type !== 'keyDown') return;
      if (input.key === 'Escape') { inputEvent.preventDefault(); output?.close(); }
      if (input.key.toLowerCase() === 'f' && !input.control && !input.alt && !input.meta) { inputEvent.preventDefault(); output?.setFullScreen(!output.isFullScreen()); }
    });
    output.on('closed', () => {
      output = null; outputDisplayId = null;
      if (powerBlocker !== null && powerSaveBlocker.isStarted(powerBlocker)) powerSaveBlocker.stop(powerBlocker);
      powerBlocker = null; notifyStatus();
    });
    powerBlocker = powerSaveBlocker.start('prevent-display-sleep');
    try { await loadWindow(output, true); output?.show(); } catch (error) { output?.close(); throw error; }
    notifyStatus(); return status();
  });
  ipcMain.handle('luma:close-output', event => { requireEditor(event); output?.close(); return status(); });
  ipcMain.handle('luma:control-output', (event, action) => {
    if (!output || event.sender !== output.webContents) throw new Error('Only the projector window can use its output controls.');
    if (action === 'close') output.close();
    else if (action === 'fullscreen') output.setFullScreen(!output.isFullScreen());
    else if (action === 'mesh' && editor && !editor.isDestroyed()) editor.webContents.send('luma:output-control', 'mesh');
  });
  ipcMain.on('luma:update-output', (event, state) => {
    if (!editor || event.sender !== editor.webContents) return;
    try { renderState = checkState(state); if (output && !output.isDestroyed()) output.webContents.send('luma:output-state', renderState); } catch { /* Ignore malformed, untrusted IPC. */ }
  });
  ipcMain.handle('luma:get-output-state', event => {
    if (!output || event.sender !== output.webContents) return null;
    return renderState;
  });
  ipcMain.handle('luma:save-project', async (event, data, suggestedName) => {
    requireEditor(event);
    if (typeof data !== 'string' || data.length > 2_000_000) return { canceled: false, error: 'Invalid project data.' };
    const safeName = String(suggestedName || 'Luma project').replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').slice(0, 100);
    const result = await dialog.showSaveDialog(editor, { title: 'Save Luma project', defaultPath: `${safeName}.luma`, filters: [{ name: 'Luma project', extensions: ['luma'] }] });
    if (result.canceled || !result.filePath) return { canceled: true };
    try {
      const missing = await media.exportProject(data, result.filePath);
      await fs.writeFile(result.filePath, data, 'utf8');
      return { canceled: false, path: result.filePath, missing };
    }
    catch (error) { return { canceled: false, error: `Could not save this project: ${error.message}` }; }
  });
  ipcMain.handle('luma:open-project', async event => {
    requireEditor(event);
    const result = await dialog.showOpenDialog(editor, { title: 'Open Luma project', properties: ['openFile'], filters: [{ name: 'Luma project', extensions: ['luma', 'json'] }] });
    if (result.canceled || !result.filePaths[0]) return { canceled: true };
    try {
      const filePath = result.filePaths[0]; const stat = await fs.stat(filePath);
      if (stat.size > 2_000_000) return { canceled: false, error: 'Project files must be smaller than 2 MB.' };
      const data = await fs.readFile(filePath, 'utf8');
      const missing = await media.restoreProject(data, filePath);
      notifyMedia();
      return { canceled: false, data, path: filePath, missing };
    } catch (error) { return { canceled: false, error: `Could not open this project: ${error.message}` }; }
  });
  screen.on('display-removed', (_event, display) => { if (display.id === outputDisplayId) output?.close(); });
  await loadWindow(editor);
  showEditor();
}).catch(error => {
  console.error('Luma startup failed:', error);
  dialog.showErrorBox('Luma could not start', `The editor could not be opened.\n\n${error.message || error}\n\nKeep the application and its resources together, then try opening Luma again.`);
  app.quit();
});
app.on('window-all-closed', () => app.quit());
