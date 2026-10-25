// King Poop: comes out of the toilets when the park is clear, 20 hits (Easy 14), fan of 3 clouds; win screen; full reset
export const opts = [{ label: "normal" }, { label: "easy", easy: true }];

export default async (t, o) => {
  await t.boot({ easy: !!o.easy });
  const st = () => t.eval("__pr3d.state");
  const shoot = async () => { await t.key("Space"); await t.eval("__pr3d.tick(1 / 60)"); await t.key("Space", false); };

  await t.eval("__pr3d.clear('poops'), __pr3d.tick(0.1)");
  let s = await st();
  t.assert(s.king && s.king.hp === (o.easy ? 14 : 20), "king hp: " + JSON.stringify(s.king));
  if (o.easy) return;
  t.assert(Math.hypot(s.king.x - 27.5, s.king.y - 6.5) < 0.3, "king not at the toilet door: " + JSON.stringify(s.king));
  t.assert(/King Poop/.test(s.msg), "no King Poop message: " + s.msg);

  // A fan of 3 clouds at once
  await t.eval("__pr3d.view(27.5, 12.5, -Math.PI / 2)");
  let most = 0;
  for (let i = 0; i < 30; i++) { await t.eval("__pr3d.set({ stink: 0 }), __pr3d.tick(0.1)"); most = Math.max(most, (await st()).kinds.cloud); }
  t.assert(most >= 3, "never 3 clouds at once: " + most);

  // 20 rolls beat him
  await t.eval("__pr3d.clear('cloud'), __pr3d.set({ rolls: 99 })");
  for (let i = 0; i < 26 && !(await st()).over; i++) {
    await t.eval(`(() => { const s = __pr3d.state; __pr3d.view(s.px, s.py, Math.atan2(s.king.y - s.py, s.king.x - s.px)); __pr3d.set({ stink: 0 }); })()`);
    await shoot(); await t.eval("__pr3d.tick(0.4)");
  }
  s = await st();
  t.assert(s.over === "win", "not won after the rolls: " + s.over + " king " + JSON.stringify(s.king));
  t.assert(await t.eval("document.getElementById('ov-title').textContent") === "Park clean!", "win title wrong");
  t.assert(!(await t.eval("document.getElementById('ov-menu').hidden")), "no Back to menu on the win screen");
  t.assert(/\d+:\d\d/.test(await t.eval("document.getElementById('ov-text').textContent")), "win text has no time");

  // Review Focus 2: Play again resets everything
  await t.eval("document.getElementById('ov-btn').click()");
  await t.eval("__pr3d.hold(true)");
  s = await st();
  const want = { stink: 0, rolls: 30, poopsLeft: 18, king: null, flowers: 0, splat: 0, over: null, msg: "" };
  for (const [k, v] of Object.entries(want)) t.assert(JSON.stringify(s[k]) === JSON.stringify(v), `after Play again ${k} = ${JSON.stringify(s[k])}`);
  t.assert(Math.hypot(s.px - 3.5, s.py - 29.5) < 0.01, "player not back at the gate");

  // Review Focus 5: standing on the King's spawn spot when the last poop goes
  await t.eval("__pr3d.view(27.5, 6.5, Math.PI / 2), __pr3d.clear('poops'), __pr3d.tick(0.1)");
  s = await st();
  t.assert(s.king && Math.hypot(s.king.x - s.px, s.king.y - s.py) >= 1.2, `king on top of the player: ${JSON.stringify(s.king)} vs ${s.px},${s.py}`);
  t.assert(!(await t.eval(`__pr3d.solidAt(${s.px}, ${s.py})`)), "player moved into a wall");
};
