export function computeKDE(
  points: { x: number; y: number }[],
  gridW = 30,
  gridH = 15,
  bandwidth = 0.08,
): number[][] {
  const grid: number[][] = Array.from({ length: gridH }, () => new Array(gridW).fill(0));
  if (points.length === 0) return grid;
  for (let gy = 0; gy < gridH; gy++) {
    for (let gx = 0; gx < gridW; gx++) {
      const cx = (gx + 0.5) / gridW;
      const cy = (gy + 0.5) / gridH;
      let sum = 0;
      for (const p of points) {
        const dx = (p.x - cx) / bandwidth;
        const dy = (p.y - cy) / bandwidth;
        sum += Math.exp(-0.5 * (dx * dx + dy * dy));
      }
      grid[gy][gx] = sum;
    }
  }
  const max = Math.max(...grid.flat(), 1);
  return grid.map(row => row.map(v => v / max));
}
