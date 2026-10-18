// Audio permission is armed only by the editor's Start audio action. Opening
// the projector must never replace these shared-session permission handlers.
function configureAudio(session, getEditor) {
  let source = null;
  const debug = (...args) => {
    if (process.env.LUMA_AUDIO_DEBUG) console.log("[Luma audio]", ...args);
  };
  const owned = (contents) => {
    const editor = getEditor();
    return !!editor && !editor.isDestroyed() && contents === editor.webContents;
  };
  session.setPermissionCheckHandler(
    (contents, permission, _origin, details) => {
      debug("check", source, permission, details.mediaType, owned(contents));
      if (!owned(contents)) return false;
      if (permission === "display-capture") return source === "system";
      return (
        permission === "media" &&
        source === "microphone" &&
        details.mediaType === "audio"
      );
    },
  );
  session.setPermissionRequestHandler(
    (contents, permission, callback, details) => {
      debug("request", source, permission, details.mediaTypes, owned(contents));
      const types = details.mediaTypes;
      callback(
        owned(contents) &&
          ((permission === "display-capture" && source === "system") ||
            // Electron 44 asks for media with an empty mediaTypes list before
            // dispatching getDisplayMedia to our frame-scoped handler.
            (permission === "media" &&
              source === "system" &&
              Array.isArray(types) &&
              types.length === 0) ||
            (permission === "media" &&
              source === "microphone" &&
              Array.isArray(types) &&
              types.length > 0 &&
              types.every((type) => type === "audio"))),
      );
    },
  );
  session.setDisplayMediaRequestHandler((request, callback) => {
    const editor = getEditor();
    debug(
      "display",
      source,
      request.audioRequested,
      request.userGesture,
      request.frame === editor?.webContents.mainFrame,
    );
    if (
      source !== "system" ||
      process.platform !== "win32" ||
      !editor ||
      editor.isDestroyed() ||
      request.frame !== editor.webContents.mainFrame ||
      !request.audioRequested ||
      !request.userGesture
    ) {
      callback(null);
      return;
    }
    // The required video source is only our own editor, never a user's desktop.
    // The renderer immediately stops that track and analyses system sound only.
    callback({ video: request.frame, audio: "loopback" });
  });
  return (value) => {
    if (value !== null && value !== "system" && value !== "microphone")
      throw new Error("Invalid audio source.");
    if (value === "system" && process.platform !== "win32")
      throw new Error(
        "Computer audio capture requires Windows. Choose microphone/line-in.",
      );
    source = value;
  };
}
function validAudioFrame(frame) {
  if (frame === null) return true;
  const unit = (n) =>
    typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1;
  return (
    !!frame &&
    Number.isSafeInteger(frame.sequence) &&
    frame.sequence >= 0 &&
    Number.isFinite(frame.capturedAt) &&
    frame.capturedAt >= 0 &&
    ["bands", "peaks"].every(
      (key) =>
        Array.isArray(frame[key]) &&
        frame[key].length === 32 &&
        frame[key].every(unit),
    ) &&
    Array.isArray(frame.wave) &&
    frame.wave.length === 128 &&
    frame.wave.every(
      (n) => typeof n === "number" && Number.isFinite(n) && n >= -1 && n <= 1,
    ) &&
    ["level", "bass", "mid", "treble", "beat"].every((key) => unit(frame[key]))
  );
}
function copyAudioFrame(frame) {
  if (!validAudioFrame(frame)) throw new Error("Invalid audio frame.");
  if (frame === null) return null;
  const {
    sequence,
    capturedAt,
    bands,
    peaks,
    wave,
    level,
    bass,
    mid,
    treble,
    beat,
  } = frame;
  return {
    sequence,
    capturedAt,
    bands: [...bands],
    peaks: [...peaks],
    wave: [...wave],
    level,
    bass,
    mid,
    treble,
    beat,
  };
}
module.exports = { configureAudio, validAudioFrame, copyAudioFrame };
