// Start screen (kid pick, Easy), HUD (face goes green with stink, stink bar, poops left), phone layouts + Throw button
export const opts = [
  { label: "desktop" },
  { label: "phone landscape", w: 480, h: 300, touch: true },
  { label: "wide phone landscape", w: 844, h: 390, touch: true },
  { label: "phone portrait", w: 390, h: 844, touch: true },
];

export default async (t, o) => {
  for (let i = 0; i < 40 && !(await t.eval("!!(window.__pr3d && __pr3d.state.ready)")); i++) await t.sleep(250);
  // Phones are sideways only: held upright, a notice asks you to turn
  const notice = await t.eval("getComputedStyle(document.querySelector('.rotate-notice')).display");
  if (o.h > o.w) { t.assert(notice === "flex", "no turn-sideways notice in portrait"); return; }
  t.assert(notice === "none", "turn-sideways notice showing sideways");

  if (o.touch) {
    // The picture matches the game frame's shape, and sideways the frame is the whole screen
    const fill = await t.eval(`(() => { const c = document.getElementById("view"), r = c.getBoundingClientRect();
      return { h: c.height, aspect: c.width / c.height, frame: r.width / r.height, w: r.width, fh: r.height }; })()`);
    t.assert(fill.h === 270, "phone canvas should be 270 rows: " + fill.h);
    t.assert(Math.abs(fill.aspect - fill.frame) < 0.02, `picture ${fill.aspect.toFixed(2)} does not match the frame ${fill.frame.toFixed(2)}`);
    t.assert(fill.w === o.w && fill.fh === o.h, `game frame ${fill.w}x${fill.fh} does not fill the ${o.w}x${o.h} screen`);
    const off = await t.eval(`["pick-james", "pick-harry", "easy", "ov-btn"].filter(id => {
      const r = document.getElementById(id).getBoundingClientRect();
      return !(r.width > 0 && r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight);
    })`);
    t.assert(off.length === 0, "not fully on screen: " + off.join(", "));
    await t.boot();
    t.assert(!(await t.eval("document.getElementById('touch-ui').hidden")), "touch controls hidden");
    const r = await t.eval("(() => { const r = document.getElementById('fire-btn').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()");
    await t.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: r[0], y: r[1], id: 1 }] });
    await t.eval("__pr3d.tick(0.05)");
    await t.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    t.assert((await t.eval("__pr3d.state")).rolls === 29, "Throw button did not throw: rolls " + (await t.eval("__pr3d.state")).rolls);

    // Pause offers a way back to the game menu, on screen; the Resume screen goes back to play
    t.assert(await t.eval("document.getElementById('ov-menu').hidden"), "Back to menu showing while playing");
    await t.eval("document.getElementById('pause-btn').click()");
    const menu = await t.eval(`(() => { const a = document.getElementById("ov-menu"), r = a.getBoundingClientRect();
      return { shown: !a.hidden && r.width > 0 && r.right <= innerWidth && r.bottom <= innerHeight, href: a.href, menu: new URL("../", location.href).href }; })()`);
    t.assert(menu.shown, "no Back to menu button on the pause screen");
    t.assert(menu.href === menu.menu, "Back to menu goes to " + menu.href);   // the game picker, one folder up
    await t.eval("document.getElementById('ov-btn').click()");
    t.assert((await t.eval("__pr3d.state")).running, "Resume did not resume");
    return;
  }

  await t.boot({ kid: "harry" });
  t.assert((await t.eval("__pr3d.state")).kid === "harry", "picked Harry but kid is " + (await t.eval("__pr3d.state")).kid);
  const face = () => t.eval(`(() => {
    const c = document.getElementById("hud-face"), d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
    let n = 0, gr = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 128) { n++; gr += d[i + 1] - d[i]; }
    return { n, gr: gr / Math.max(1, n) };
  })()`);
  await t.sleep(100);
  const clean = await face();
  t.assert(clean.n > 1000, "HUD face is empty: " + clean.n);
  await t.eval("__pr3d.set({ stink: 80 })"); await t.sleep(150);
  const stinky = await face();
  t.assert(stinky.gr >= clean.gr + 25, `face not greener at 80% stink: ${clean.gr.toFixed(0)} -> ${stinky.gr.toFixed(0)}`);
  t.assert(await t.eval("document.querySelector('#hud-stink i').style.width") === "80%", "stink bar width wrong");
  t.assert(await t.eval("document.getElementById('hud-poops').textContent") === "18 left", "poops counter wrong");
  t.assert(await t.eval("localStorage.getItem('pr3d-kid')") === "harry", "kid pick not remembered");
};
