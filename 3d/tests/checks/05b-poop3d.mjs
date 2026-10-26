// Poops are real 3D shapes: smoothly shaded, lit by the sun from the side it's actually on, eyes facing you from any side
export default async t => {
  await t.boot();
  const W = await t.eval("document.getElementById('view').width");
  // Brown pixels in the middle of the screen: count, distinct colours, brightness left vs right of their centre
  const look = (view, awake = true) => t.eval(`(() => {
    __pr3d.clear('poops'); __pr3d.view(${view}); __pr3d.place('small', 16.5, 18.5, { awake: ${awake} }); __pr3d.tick(0);
    const pts = [];
    let white = 0;
    for (let y = 0; y < ${W * 0.625}; y++) for (let x = ${W / 2 - 100}; x < ${W / 2 + 100}; x++) {
      const [r, g, b] = __pr3d.pixel(x, y);
      if (r > 1.8 * b && r > g * 1.2 && r < 235) pts.push([x, r + g + b, r * 65536 + g * 256 + b]);
      if (r > 215 && g > 215 && b > 215 && y > ${W * 0.3}) white++;
    }
    const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
    const mean = f => { const q = pts.filter(f); return q.reduce((s, p) => s + p[1], 0) / q.length; };
    return { n: pts.length, colours: new Set(pts.map(p => p[2])).size, left: mean(p => p[0] < cx), right: mean(p => p[0] > cx), white };
  })()`);

  // From the south looking north, the sun (north-west) is on the left
  const a = await look("16.5, 20.5, -Math.PI / 2");
  t.assert(a.n > 2000, "poop barely visible: " + a.n + " px");
  t.assert(a.colours >= 60, "poop is flat-shaded: " + a.colours + " colours");
  t.assert(a.left > a.right * 1.08, `sun side (left) not brighter: ${a.left.toFixed(0)} vs ${a.right.toFixed(0)}`);
  t.assert(a.white > 40, "no eyes facing you from the south: " + a.white);
  // From the north looking south, the sun is now on the right: the lighting turns with the world, not the camera
  const b = await look("16.5, 16.5, Math.PI / 2");
  t.assert(b.right > b.left * 1.08, `sun side (right) not brighter from the north: ${b.left.toFixed(0)} vs ${b.right.toFixed(0)}`);
  t.assert(b.white > 40, "no eyes facing you from the north: " + b.white);
  // Asleep (not woken yet): eyes closed
  const c = await look("16.5, 20.5, -Math.PI / 2", false);
  t.assert(c.n > 2000 && c.white < a.white - 30, `sleeping poop's eyes not closed: ${c.white} white px (awake ${a.white})`);
};
