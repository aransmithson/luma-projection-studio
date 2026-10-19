const { contextBridge, ipcRenderer } = require('electron');
const subscribe = (channel, callback) => {
  const listener = (_event, value) => callback(value);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
};
contextBridge.exposeInMainWorld('luma', {
  listMedia: () => ipcRenderer.invoke('luma:list-media'),
  importMedia: expectedId => ipcRenderer.invoke('luma:import-media', expectedId),
  completeMedia: asset => ipcRenderer.invoke('luma:complete-media', asset),
  onMediaChanged: callback => subscribe('luma:media-changed', callback),
  setAudioCapture: source => ipcRenderer.invoke('luma:audio-capture', source),
  updateAudioFrame: frame => ipcRenderer.send('luma:audio-frame', frame),
  onAudioFrame: callback => subscribe('luma:audio-frame', callback),
  getDisplays: () => ipcRenderer.invoke('luma:displays'),
  openOutput: (displayId, state) => ipcRenderer.invoke('luma:open-output', displayId, state),
  closeOutput: () => ipcRenderer.invoke('luma:close-output'),
  controlOutput: action => ipcRenderer.invoke('luma:control-output', action),
  updateOutput: state => ipcRenderer.send('luma:update-output', state),
  updateOutputPointer: point => ipcRenderer.send('luma:output-pointer', point),
  onOutputPointer: callback => subscribe('luma:output-pointer', callback),
  copyShapes: data => ipcRenderer.invoke('luma:copy-shapes', data),
  pasteShapes: () => ipcRenderer.invoke('luma:paste-shapes'),
  getOutputState: () => ipcRenderer.invoke('luma:get-output-state'),
  onOutputState: callback => subscribe('luma:output-state', callback),
  onOutputStatus: callback => subscribe('luma:output-status', callback),
  onOutputControl: callback => subscribe('luma:output-control', callback),
  saveProject: (data, suggestedName) => ipcRenderer.invoke('luma:save-project', data, suggestedName),
  openProject: () => ipcRenderer.invoke('luma:open-project'),
});
