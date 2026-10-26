// Sleeping poops can't be shot from afar: a roll bounces off (no damage) and wakes the poop, which then comes for
// you; once awake it can be hit as usual
export default async t => {
  await t.boot();
  const st = () => t.eval("__pr3d.state");
  const shoot = async () => { await t.key("Space"); await t.eval("__pr3d.tick(1 / 60)"); await t.key("Space", false); };
  // A poop 12 units up the long lawn, too far to have woken up
  await t.eval("__pr3d.clear('poops', 'tp'), __pr3d.view(16.5, 30.5, -Math.PI / 2), __pr3d.place('small', 16.5, 18.5), __pr3d.tick(0.05)");
  t.assert(!(await t.eval("__pr3d.find('small').length === 1 && __pr3d.awake()")), "poop 12 away is already awake");
  await shoot(); await t.eval("__pr3d.tick(1.6)");
  let s = await st();
  t.assert(s.kinds.small === 1, "a roll killed a sleeping poop from afar");
  t.assert(await t.eval("__pr3d.awake()"), "the bonk did not wake the poop");
  t.assert(/woke/.test(s.msg), "no wake-up message: " + s.msg);
  // Now awake it comes closer and a roll gets it
  for (let i = 0; i < 12 && (await st()).kinds.small; i++) {
    await t.eval("(() => { const p = __pr3d.find('small')[0], s = __pr3d.state; if (p) __pr3d.view(s.px, s.py, Math.atan2(p.y - s.py, p.x - s.px)); __pr3d.set({ stink: 0 }); })()");
    await shoot(); await t.eval("__pr3d.tick(0.5)");
  }
  t.assert((await st()).kinds.small === 0, "could not hit the poop once it was awake");
};
