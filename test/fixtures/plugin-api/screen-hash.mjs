// The screen module of the plugin API fixtures (`@soksak/plugin-api/screen-hash`). The page applies each screen message to the screen it
// holds and hashes the screen for its frame records. The functions implement the rules that the core specification states in
// docs/spec/persistent-services.md#screen-message (the messages) and docs/spec/replay.md#screen-hash (the hash), as written there; they
// are not taken from core's code, and this module holds no copy of core's test vectors.
import { createHash } from "node:crypto";

const MAGIC = Buffer.from("SKSCR1", "ascii");

/** The error of a value that the screen form refuses: the message names the member, as the page reports it. */
function refuse(member, detail) {
  throw new Error(`${member} ${detail}`);
}

function colorBytes(color, member) {
  if (color === null) return Buffer.from([0, 0, 0, 0]);
  if (Number.isInteger(color)) {
    if (color < 0 || color > 255) refuse(member, "indexed color outside 0 to 255");
    return Buffer.from([1, 0, 0, color]);
  }
  if (typeof color === "string" && /^#[0-9a-f]{6}$/.test(color)) {
    return Buffer.from([2, Number.parseInt(color.slice(1, 3), 16), Number.parseInt(color.slice(3, 5), 16), Number.parseInt(color.slice(5, 7), 16)]);
  }
  return refuse(member, "is neither null, an indexed color nor a true color");
}

/** The SHA-256 of the canonical bytes of a screen, as 64 lowercase hexadecimal characters. The screen is {rows, cols, cursor, cells}. */
export async function screenHash(screen) {
  const { rows, cols, cursor, cells } = screen;
  if (!Number.isInteger(rows) || rows < 1 || !Number.isInteger(cols) || cols < 1) refuse("size", "must be positive integers");
  if (cells.length !== rows * cols) refuse("cells", "count differs from rows times cols");
  const header = Buffer.alloc(6 + 4 + 4 + 1 + 4 + 4);
  MAGIC.copy(header, 0);
  header.writeUInt32BE(rows, 6);
  header.writeUInt32BE(cols, 10);
  header[14] = cursor.visible ? 1 : 0;
  header.writeUInt32BE(cursor.row, 15);
  header.writeUInt32BE(cursor.col, 19);
  const parts = [header];
  for (const cell of cells) {
    const grapheme = Buffer.from(cell.grapheme, "utf8");
    const cellHeader = Buffer.alloc(4);
    cellHeader.writeUInt32BE(grapheme.length, 0);
    const tail = Buffer.alloc(1 + 4 + 4 + 1);
    tail[0] = cell.width;
    colorBytes(cell.fg, "fg").copy(tail, 1);
    colorBytes(cell.bg, "bg").copy(tail, 5);
    tail[9] = cell.attributes;
    parts.push(cellHeader, grapheme, tail);
  }
  return createHash("sha256").update(Buffer.concat(parts)).digest("hex");
}

/**
 * Applies one screen message to the result of the message before it (or null), and returns {sequence, segment, number, screen}. The
 * full form carries every cell; the change form carries the rows that differ from the screen named by `previous`.
 */
export function applyScreenMessage(previous, message) {
  if (!Number.isInteger(message.sequence)) refuse("sequence", "missing");
  if (typeof message.segment !== "string" || message.segment === "") refuse("segment", "missing");
  if (!Number.isInteger(message.number)) refuse("number", "missing");
  if (!Number.isInteger(message.rows) || message.rows < 1) refuse("rows", "must be a positive integer");
  if (!Number.isInteger(message.cols) || message.cols < 1) refuse("cols", "must be a positive integer");
  const { sequence, segment, number } = message;
  const cursor = { visible: message.cursor.visible, row: message.cursor.row, col: message.cursor.col };
  if (message.base === true) {
    if (!Array.isArray(message.cells) || message.cells.length !== message.rows * message.cols) refuse("cells", "count differs from rows times cols");
    for (const cell of message.cells) {
      if (!Number.isInteger(cell.attributes) || cell.attributes < 0 || cell.attributes > 255) refuse("attributes", "missing or outside one byte");
      if (cell.fg === undefined || cell.bg === undefined) refuse("fg", "or bg missing");
    }
    return { sequence, segment, number, screen: { rows: message.rows, cols: message.cols, cursor, cells: message.cells } };
  }
  if (previous === null || previous.number !== message.previous) refuse("previous", `${message.previous} needs the screen of number ${message.previous}`);
  const cells = previous.screen.cells.slice();
  for (const { row, cells: rowCells } of message.changed) cells.splice(row * message.cols, message.cols, ...rowCells);
  return { sequence, segment, number, screen: { rows: message.rows, cols: message.cols, cursor, cells } };
}
