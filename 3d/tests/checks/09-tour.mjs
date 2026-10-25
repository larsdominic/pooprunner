// Full tour on the real game loop: screenshots of every area and moment, frame rate, 20 s of random play without errors
const shot = (t, name) => t.shot(new URL(`../shots/09-${name}.png`, import.meta.url).pathname);
const fps = t => t.eval("new Promise(r => { let n = 0; const t0 = performance.now(); (function f() { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(n / 2); })(); })");

export default async t => {
  for (let i = 0; i < 40 && !(await t.eval("!!(window.__pr3d && __pr3d.state.ready)")); i++) await t.sleep(250);
  await shot(t, "01-start");
  await t.boot();
  const place = async (name, v, extra = "") => { await t.eval(`__pr3d.hold(true), __pr3d.view(${v}), ${extra || "0"}, __pr3d.tick(0)`); await t.sleep(60); await shot(t, name); };

  await t.eval("__pr3d.hold(false), __pr3d.view(3.5, 29.5, -Math.PI / 2)");
  const gate = await fps(t);
  await t.eval("__pr3d.view(1.5, 9.5, -Math.PI / 2)");
  const maze = await fps(t);
  t.assert(gate >= 45 && maze >= 45, `frame rate: gate ${gate}, maze ${maze}`);

  await place("02-gate", "3.5, 28.5, Math.PI / 2");
  await place("03-maze", "1.5, 9.5, -Math.PI / 2");
  await place("04-lawn", "16.5, 22.5, -Math.PI / 2");
  await place("05-pond", "19.5, 14.5, 0");
  await place("06-playground", "18.5, 23.5, 0.5");
  await place("07-toilets", "27.5, 11.5, -Math.PI / 2");
  await place("08-poop-hop", "16.5, 20.5, -Math.PI / 2", "__pr3d.clear('poops'), __pr3d.place('small', 16.5, 18.2, { awake: true }), __pr3d.place('big', 15.2, 16.5), __pr3d.tick(0.12)");
  await t.key("Space"); await t.eval("__pr3d.tick(0.15)"); await t.key("Space", false);
  await place("09-roll", "16.5, 20.5, -Math.PI / 2", "__pr3d.tick(0.05)");
  await place("10-poof", "16.5, 20.5, -Math.PI / 2", "__pr3d.tick(0.2)");
  await place("11-splat", "16.5, 20.5, -Math.PI / 2", "__pr3d.place('small', 16.5, 19.9, { awake: true }), __pr3d.tick(0.2)");
  await place("12-king", "27.5, 12.5, -Math.PI / 2", "__pr3d.set({ stink: 0 }), __pr3d.clear('poops'), __pr3d.tick(0.1), __pr3d.view(27.5, 12.5, -Math.PI / 2), __pr3d.tick(1.6)");
  await t.eval("__pr3d.set({ win: true })"); await t.sleep(100); await shot(t, "13-win");
  await t.eval("document.getElementById('ov-btn').click(), __pr3d.hold(true), __pr3d.set({ stink: 99 }), __pr3d.place('small', __pr3d.state.px, __pr3d.state.py - 0.6, { awake: true }), __pr3d.tick(0.3)");
  await t.sleep(100); await shot(t, "14-lose");

  // 20 s of random play on the real loop
  await t.eval("document.getElementById('ov-btn').click(), __pr3d.hold(false)");
  const keys = ["KeyW", "KeyA", "KeyD", "ArrowLeft", "ArrowRight", "Space", "KeyS"];
  const t0 = Date.now();
  let r = 7;
  while (Date.now() - t0 < 20000) {
    r = (r * 1103515245 + 12345) % 2147483648;
    const k = keys[r % keys.length];
    await t.key(k); await t.sleep(150 + (r % 400)); await t.key(k, false);
    if ((await t.eval("__pr3d.state")).over) await t.eval("document.getElementById('ov-btn').click()");
  }
  t.assert(t.logs.filter(l => /^(EXCEPTION|error)/.test(l)).length === 0, "errors during play");
};
