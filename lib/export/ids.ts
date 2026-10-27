import { createHash } from "node:crypto";

// Deterministic GUIDs: the same seed always gives the same sequence, so the
// same plan always produces the same export file.
export function idMaker(seed: string) {
  let n = 0;
  return () => {
    const h = createHash("sha1").update(`${seed}:${n++}`).digest("hex");
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
  };
}
