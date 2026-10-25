// Code-drawn art: real textures (not flat colours), right sizes, props placed; saves screenshots to look at
export default async t => {
  await t.boot();
  const art = await t.eval("__pr3d.art()");
  for (const k of ["F", "H", "G", "B", "D"]) {
    const [w, h, n] = art.walls[k] || [];
    t.assert(w === 64 && h === 80, `wall ${k} is ${w}x${h}, want 64x80`);
    t.assert(n >= 8, `wall ${k} has only ${n} colours`);
  }
  for (const k of ["grass", "path", "sand", "water0", "water1", "flowers"]) {
    const [w, h, n] = art.flats[k] || [];
    t.assert(w === 64 && h === 64, `flat ${k} is ${w}x${h}`);
    t.assert(n >= 8, `flat ${k} has only ${n} colours`);
  }
  for (const k of ["tree", "bench", "bin", "swings", "slide"]) {
    const s = art.sprites[k];
    t.assert(s && s[2] > 500, `sprite ${k} is missing or empty`);
  }
  const treeH = art.sprites.tree[1] / 192;
  t.assert(treeH >= 2.0 && treeH <= 2.4, "tree is " + treeH.toFixed(2) + " units tall");
  const props = await t.eval("__pr3d.spawns().props.length"), placed = await t.eval("__pr3d.state.props");
  t.assert(placed === props, `${placed} of ${props} props placed`);

  // Wall textures are not mirrored: the toilet door's yellow handle is on the right of the door
  const W = await t.eval("document.getElementById('view').width"), H = await t.eval("document.getElementById('view').height");
  const handleX = await t.eval(`(() => {
    __pr3d.view(27.5, 11.5, -Math.PI / 2); __pr3d.tick(0);
    let sx = 0, n = 0;
    for (let y = ${H / 2 - 60}; y < ${H / 2 + 30}; y++) for (let x = ${W / 2 - 40}; x < ${W / 2 + 40}; x++) {
      const [r, g, b] = __pr3d.pixel(x, y);
      if (r > 110 && r - b > 60 && g - b > 40) { sx += x; n++; }
    }
    return n ? sx / n : null; })()`);
  t.assert(handleX !== null && handleX > W / 2, "door handle not on the right (mirrored texture?): " + handleX);

  const views = { gate: "3.5,28.5,Math.PI/2", maze: "1.5,9.5,-Math.PI/2", pond: "16.5,15.5,0", playground: "18.5,23.5,0.5", toilets: "27.5,11.5,-Math.PI/2" };
  for (const [name, v] of Object.entries(views)) {
    await t.eval(`__pr3d.view(${v}), __pr3d.tick(0)`);
    await t.sleep(80);
    await t.shot(new URL(`../shots/03-${name}.png`, import.meta.url).pathname);
  }
};
