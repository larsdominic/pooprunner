// Toilet-paper blaster: rolls fly at 9 u/s, cooldown, stop at walls with a puff, out-of-rolls message, pause freezes them
export default async t => {
  await t.boot();
  const st = () => t.eval("__pr3d.state");
  const rollY = () => t.eval("(__pr3d.find('roll')[0] || {}).y");
  if (await t.eval("!!__pr3d.clear")) await t.eval("__pr3d.clear('poops')");   // from Task 5 on: nothing in the way

  await t.eval("__pr3d.view(16.5, 20.5, -Math.PI / 2)");
  t.assert((await st()).rolls === 30, "should start with 30 rolls");
  await t.key("Space"); await t.eval("__pr3d.tick(0.05)");
  let s = await st();
  t.assert(s.rolls === 29 && s.kinds.roll === 1, `first shot: rolls ${s.rolls}, roll sprites ${s.kinds.roll}`);
  // Still holding: nothing more inside the 0.35 s cooldown, then the next roll
  await t.eval("__pr3d.tick(0.25)");
  t.assert((await st()).rolls === 29, "fired again inside the cooldown");
  await t.eval("__pr3d.tick(0.1)");
  t.assert((await st()).rolls === 28, "holding fire did not repeat after the cooldown");
  await t.key("Space", false);

  // Speed: 9 units per second along the view
  await t.eval("__pr3d.tick(2)");            // let earlier rolls finish
  await t.eval("__pr3d.view(16.5, 20.5, -Math.PI / 2)");
  await t.key("Space"); await t.eval("__pr3d.tick(1 / 60)"); await t.key("Space", false);
  const y0 = await rollY();
  await t.eval("__pr3d.tick(0.5)");
  const moved = y0 - await rollY();
  t.assert(Math.abs(moved - 4.5) <= 0.3, "roll moved " + moved + " in 0.5 s");

  // Hits the hedge 3 units away: roll gone, a paper puff left
  await t.eval("__pr3d.tick(2)");
  await t.eval("__pr3d.view(14, 24.5, Math.PI)");
  await t.key("Space"); await t.eval("__pr3d.tick(1 / 60)"); await t.key("Space", false);
  await t.eval("__pr3d.tick(0.45)");
  s = await st();
  t.assert(s.kinds.roll === 0 && s.kinds.puff >= 1, `at the hedge: rolls flying ${s.kinds.roll}, puffs ${s.kinds.puff}`);

  // Out of rolls
  await t.eval("__pr3d.tick(1), __pr3d.set({ rolls: 0 })");
  await t.key("Space"); await t.eval("__pr3d.tick(0.05)"); await t.key("Space", false);
  s = await st();
  t.assert(s.rolls === 0 && /Out of rolls/.test(s.msg), `empty: rolls ${s.rolls}, msg "${s.msg}"`);

  // Review Focus 1: pausing freezes a flying roll; resuming continues it, no extra shot
  await t.eval("__pr3d.tick(1), __pr3d.set({ rolls: 10 }), __pr3d.view(16.5, 20.5, -Math.PI / 2)");
  await t.key("Space"); await t.eval("__pr3d.tick(0.1)"); await t.key("Space", false);
  const before = await rollY(), puffs = (await st()).kinds.tail;
  await t.key("KeyP"); await t.key("KeyP", false);
  await t.sleep(500);
  s = await st();
  t.assert(s.running === false, "P did not pause");
  t.assert(await rollY() === before, "roll moved while paused");
  t.assert(s.kinds.tail === puffs, "paper tail aged while paused");
  await t.eval("document.getElementById('ov-btn').click()");
  await t.eval("__pr3d.tick(0.1)");
  t.assert(await rollY() < before - 0.5, "roll did not continue after resume");
  t.assert((await st()).rolls === 9, "rolls changed by more than one shot: " + (await st()).rolls);
};
