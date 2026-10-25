// The park: 32x32 fenced map, everything reachable, pond blocks walking, open sky, haze, sun shadows, frame rate
export default async t => {
  await t.boot();
  if (await t.eval("!!__pr3d.clear")) await t.eval("__pr3d.clear('poops')");   // from Task 5 on: keep the views clear
  const W = await t.eval("document.getElementById('view').width"), H = await t.eval("document.getElementById('view').height");
  const sp = await t.eval("__pr3d.spawns()");
  const rows = await t.eval("__pr3d.mapRows()");
  t.assert(rows.length === 32 && rows.every(r => r.length === 32), "map is not 32x32");
  const border = await t.eval(`(() => { for (let i = 0; i < 32; i++) for (const [x, y] of [[i, 0], [i, 31], [0, i], [31, i]])
    if (!__pr3d.solidAt(x + .5, y + .5)) return [x, y]; return null; })()`);
  t.assert(border === null, "border cell not solid: " + border);

  // Everything reachable from the start over walkable cells
  const walk = (x, y) => x >= 0 && y >= 0 && x < 32 && y < 32 && !"FHGBD~*".includes(rows[y][x]);
  const seen = new Set([`${sp.start[0] | 0},${sp.start[1] | 0}`]), q = [[sp.start[0] | 0, sp.start[1] | 0]];
  while (q.length) {
    const [x, y] = q.pop();
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k = `${x + a},${y + b}`;
      if (walk(x + a, y + b) && !seen.has(k)) { seen.add(k); q.push([x + a, y + b]); }
    }
  }
  const targets = [...sp.poops, ...sp.pickups, ["king", ...sp.king]];
  for (const [kind, x, y] of targets) t.assert(seen.has(`${x | 0},${y | 0}`), `${kind} at ${x},${y} is not reachable`);
  t.assert(sp.poops.filter(p => p[0] === "small").length === 12 && sp.poops.filter(p => p[0] === "big").length === 6, "need 12 small + 6 big poops");

  // Water is drawn as floor but can't be walked on
  t.assert(await t.eval("__pr3d.blockedAt(24.5, 14.5) && !__pr3d.solidAt(24.5, 14.5)"), "pond cell should be blocked floor");
  await t.eval("__pr3d.view(24.5, 19.5, -Math.PI / 2)");
  await t.key("KeyW"); await t.eval("__pr3d.tick(3)"); await t.key("KeyW", false);
  const py = await t.eval("__pr3d.state.py");
  t.assert(py > 17.9, "walked into the pond: py = " + py);

  // Open sky above
  // (most of the top row is blue; clouds can cover some of it)
  const blue = await t.eval(`__pr3d.view(16.5, 16.5, 0), __pr3d.tick(0),
    Array.from({ length: 32 }, (_, i) => __pr3d.pixel(i * ${W / 32}, 4)).filter(([r, , b]) => b > 150 && b > r + 30).length`);
  t.assert(blue >= 16, "top of screen is not sky blue: " + blue + "/32 blue samples");

  // Haze: the far fence is closer to the haze colour than the near fence
  const HAZE = [200, 225, 245], dist = c => c.reduce((s, v, i) => s + Math.abs(v - HAZE[i]), 0);
  const far = await t.eval(`__pr3d.view(16.5, 18.5, Math.PI / 2), __pr3d.tick(0), __pr3d.pixel(${W / 2}, ${H / 2 - 2})`);
  const near = await t.eval(`__pr3d.view(16.5, 29.5, Math.PI / 2), __pr3d.tick(0), __pr3d.pixel(${W / 2}, ${H / 2 - 2})`);
  t.assert(dist(far) < dist(near), `no haze: far ${far} near ${near}`);

  // Sun shadow just south of a hedge
  let cell = null;
  for (let y = 1; y < 31 && !cell; y++) for (let x = 1; x < 31 && !cell; x++) if (".,".includes(rows[y][x]) && rows[y - 1][x] === "H") cell = [x, y];
  const sum = l => l[0] + l[1] + l[2];
  const shade = sum(await t.eval(`__pr3d.light(${cell[0] + 0.5}, ${cell[1] + 0.25})`)), lawn = sum(await t.eval("__pr3d.light(16.5, 16.5)"));
  t.assert(shade < 0.85 * lawn, `no hedge shadow at ${cell}: ${shade} vs lawn ${lawn}`);

  // Frame rate on the normal loop
  const frames = await t.eval("new Promise(r => { let n = 0; const t0 = performance.now(); (function f() { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(n); })(); })");
  t.assert(frames >= 90, "too slow: " + frames + " frames in 2 s");
};
