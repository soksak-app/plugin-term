// Reads the screen of a term view: the text of its cell rows, a read that waits by notification for later output, and a read whose
// frame the image region of the view presented.
import assert from "node:assert/strict";

/** The text of each cell row of `screen.lines`; a cell without a character is `width` spaces, and each row loses its trailing spaces. */
export function textLines(screen) {
  assert.ok(screen && Array.isArray(screen.lines), `invalid term screen: ${JSON.stringify(screen)}`);
  return screen.lines.map((row) => row.map((cell) => {
    assert.ok(Number.isInteger(cell.width) && cell.width >= 0, "cell width is required");
    return cell.ch === undefined ? " ".repeat(cell.width) : cell.ch;
  }).join("").trimEnd());
}

/**
 * Reads the screen of the term view `surface` once (term.screen.read) and waits by notification until `predicate` holds for its lines
 * (term.screen). A resize is also reflected in this read. Returns the lines.
 */
export async function readScreenUntil(session, surface, predicate, message) {
  await session.run("term.screen.read", {}, surface);
  const screen = await session.until("term.screen", (lines) => predicate(textLines({ lines })), message, { surface });
  return textLines({ lines: screen });
}

/**
 * Reads the screen of the term view `surface` and waits until its image region presents the frame that shows that screen: the `frame`
 * of the screen read names it ({generation, raster, sequence}), and `host.window` reports the presented frame of each region. A pixel
 * read after it shows the screen of the read, not an earlier frame. Returns the screen.
 */
export async function presentedScreen(session, surface) {
  const screen = await session.run("term.screen.read", {}, surface);
  const frame = screen?.frame;
  assert.ok(frame && Number.isInteger(frame.generation) && Number.isInteger(frame.raster) && Number.isInteger(frame.sequence),
    `the screen read of ${surface} names no frame: ${JSON.stringify(frame)}`);
  await session.until("host.window", (host) => host.regions.some((region) => region.surface === surface &&
    region.name === "view" && region.presented && region.presented.generation === frame.generation &&
    region.presented.raster === frame.raster && region.presented.sequence >= frame.sequence),
  `the image region of ${surface} did not present frame ${JSON.stringify(frame)}`);
  return screen;
}
