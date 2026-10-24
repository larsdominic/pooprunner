// Fixes from the final review: held Space on end screens, kid/Easy pick after a game, King-close speed,
// older Safari without roundRect, the out-of-rolls hint not getting buried
export const opts = [
  { label: "desktop" },
  { label: "old Safari", init: "delete CanvasRenderingContext2D.prototype.roundRect" },
  { label: "phone King close", w: 480, h: 300, touch: true },
];

export default async (t, o) => {
  if (o.label === "old Safari") {
    let ready = false;
    for (let i = 0; i < 40 && !ready; i++) { ready = await t.eval("!!(window.__pr3d && __pr3d.state.ready)"); if (!ready) await t.sleep(250); }
    t.assert(ready, "game never got ready without canvas roundRect");
    return;
  }
  await t.boot();
  const st = () => t.eval("__pr3d.state");

  if (o.label === "phone King close") {
    // The boss fight up close has to stay quick on a phone-sized frame
    await t.eval("__pr3d.clear('poops'), __pr3d.tick(0.05), __pr3d.view(27.5, 8.1, -Math.PI / 2)");
    const ms = await t.eval("(() => { __pr3d.tick(0); const t0 = performance.now(); for (let i = 0; i < 30; i++) __pr3d.tick(0); return (performance.now() - t0) / 30; })()");
    t.assert(ms <= 6, "King 1.6 units away takes " + ms.toFixed(1) + " ms per frame");
    return;
  }

  // Holding Space (key auto-repeat) as the game ends must not click straight through the end screen
  const holdSpace = async () => {
    await t.send("Input.dispatchKeyEvent", { type: "rawKeyDown", code: "Space", key: " ", windowsVirtualKeyCode: 32 });
    for (let i = 0; i < 5; i++) { await t.send("Input.dispatchKeyEvent", { type: "rawKeyDown", code: "Space", key: " ", windowsVirtualKeyCode: 32, autoRepeat: true }); await t.sleep(30); }
    await t.send("Input.dispatchKeyEvent", { type: "keyUp", code: "Space", key: " ", windowsVirtualKeyCode: 32 });
    await t.sleep(50);
  };
  await t.key("Space"); await t.eval("__pr3d.tick(0.1), __pr3d.set({ win: true })");
  await holdSpace();
  t.assert((await st()).over === "win", "held Space skipped the win screen: " + JSON.stringify([(await st()).over, (await st()).phase]));

  // The end screen lets you switch kid and Easy for the next game
  for (const id of ["pick-harry", "easy"]) t.assert(!(await t.eval(`document.getElementById("${id}").closest("[hidden]") !== null`)), id + " hidden on the win screen");
  await t.eval("document.getElementById('pick-harry').click(), document.getElementById('easy').click(), document.getElementById('ov-btn').click(), __pr3d.hold(true)");
  let s = await st();
  t.assert(s.kid === "harry" && s.easy === true, `next game: kid ${s.kid}, easy ${s.easy}`);

  // Out of rolls: the gate hint stays findable, and a bark doesn't bury it
  await t.eval("__pr3d.clear('tp'), __pr3d.set({ rolls: 0 }), __pr3d.tick(0.1)");
  await t.key("Space"); await t.eval("__pr3d.tick(0.5)"); await t.key("Space", false);
  t.assert(/gate/.test((await st()).msg), "out-of-rolls message lost the gate hint: " + (await st()).msg);
  await t.eval("__pr3d.place('small', __pr3d.state.dog.x + 1, __pr3d.state.dog.y), __pr3d.tick(0.3)");
  t.assert(/gate/.test((await st()).msg), "a bark buried the gate hint: " + (await st()).msg);
};
