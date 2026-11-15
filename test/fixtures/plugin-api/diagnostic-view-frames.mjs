// The diagnostic module of the plugin API fixtures (`@soksak/plugin-api/diagnostic-view-frames`), which a diagnostic build of the page
// imports. observeViewDocumentFrames starts the observation of the frames of the view document and returns the function that stops it;
// each frame is a record of the log that the page passes (docs/spec/plugin-processes.md, command `<plugin>.view.frames`). The frames
// come from the test through emitFrame, so a test states each frame it expects.

/** The observations that the page started in this process, in order. */
const observations = [];

/** Starts the observation of the view document frames for the options of the page, and returns the function that stops it. */
export function observeViewDocumentFrames(options) {
  if (options === null || typeof options !== "object" || typeof options.log?.trace !== "function") {
    throw new TypeError("observeViewDocumentFrames requires the log of the view");
  }
  const observation = { document: options.document, log: options.log, running: true };
  observations.push(observation);
  return () => { observation.running = false; };
}

/** The most recent observation that the page started. */
export function lastObservation() {
  return observations.at(-1);
}

/** Writes one content-frame record to the log of each running observation, as the observation writes a frame of the document. */
export function emitFrame(fields) {
  for (const observation of observations) if (observation.running) observation.log.trace("view.content_frame", fields);
}
