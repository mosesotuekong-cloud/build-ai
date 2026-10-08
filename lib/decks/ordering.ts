export type Positioned = { id: string; position: number };

// Moves one item up or down within an ordered list and returns the new
// position for every item whose position changed. Positions come back as
// 0, 1, 2… so gaps left by deletions are tidied up as a side effect.
export function moveItem(items: Positioned[], id: string, direction: "up" | "down"): Positioned[] {
  const ordered = [...items].sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
  const from = ordered.findIndex((item) => item.id === id);
  if (from === -1) return [];
  const to = direction === "up" ? from - 1 : from + 1;
  if (to < 0 || to >= ordered.length) return [];

  [ordered[from], ordered[to]] = [ordered[to], ordered[from]];
  return ordered.flatMap((item, index) => (item.position === index ? [] : [{ id: item.id, position: index }]));
}

// The position to give a new item appended to the end of a list.
export function nextPosition(items: Positioned[]): number {
  return items.reduce((max, item) => Math.max(max, item.position + 1), 0);
}
