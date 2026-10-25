// Poops: 12 small + 6 big; rolls clear them into flowers; contact and clouds add stink; hedges block clouds; 100% = lose
export const opts = [{ label: "normal" }, { label: "easy", easy: true }];

export default async (t, o) => {
  await t.boot({ easy: !!o.easy });
  const st = () => t.eval("__pr3d.state");
  const shoot = async () => { await t.key("Space"); await t.eval("__pr3d.tick(1 / 60)"); await t.key("Space", false); };

  if (o.easy) {
    t.assert((await st()).easy === true, "Easy box did not turn on easy mode");
    await t.eval("__pr3d.clear('poops'), __pr3d.view(16.5, 20.5, -Math.PI / 2), __pr3d.place('small', 16.5, 19.9, { awake: true }), __pr3d.tick(0.3)");
    t.assert((await st()).stink === 6, "easy contact stink should be 6, is " + (await st()).stink);
    return;
  }

  let s = await st();
  t.assert(s.easy === false, "easy should be off");
  t.assert(s.poopsLeft === 18 && s.kinds.small === 12 && s.kinds.big === 6 && s.stink === 0, `start: ${JSON.stringify([s.poopsLeft, s.kinds.small, s.kinds.big, s.stink])}`);

  // One roll clears a small poop into flowers
  await t.eval("__pr3d.clear('poops'), __pr3d.view(16.5, 20.5, -Math.PI / 2), __pr3d.place('small', 16.5, 17.5)");
  await shoot(); await t.eval("__pr3d.tick(0.6)");
  s = await st();
  t.assert(s.kinds.small === 0 && s.flowers === 1 && s.kinds.poof === 1, `small hit: small ${s.kinds.small}, flowers ${s.flowers}, poof ${s.kinds.poof}`);

  // A big poop takes two rolls
  await t.eval("__pr3d.tick(1), __pr3d.set({ stink: 0 }), __pr3d.view(16.5, 20.5, -Math.PI / 2), __pr3d.place('big', 16.5, 17.5)");
  await shoot(); await t.eval("__pr3d.tick(0.5)");
  t.assert((await st()).kinds.big === 1, "big poop gone after one roll");
  await shoot(); await t.eval("__pr3d.tick(0.5)");
  t.assert((await st()).kinds.big === 0, "big poop still there after two rolls");

  // A small poop jumping on you: +12 stink and a splat
  await t.eval("__pr3d.clear('poops', 'cloud'), __pr3d.set({ stink: 0 }), __pr3d.view(16.5, 20.5, -Math.PI / 2), __pr3d.place('small', 16.5, 19.9, { awake: true }), __pr3d.tick(0.3)");
  s = await st();
  t.assert(s.stink === 12 && s.splat > 0.5, `contact: stink ${s.stink}, splat ${s.splat}`);

  // A big poop's stink cloud reaches you
  await t.eval("__pr3d.clear('poops'), __pr3d.set({ stink: 0 }), __pr3d.view(16.5, 20.5, -Math.PI / 2), __pr3d.place('big', 16.5, 15.5, { awake: true }), __pr3d.tick(5)");
  t.assert((await st()).stink >= 10, "no stink from the big poop's cloud: " + (await st()).stink);

  // ...but not through a hedge
  await t.eval("__pr3d.clear('poops', 'cloud'), __pr3d.set({ stink: 0 }), __pr3d.view(9.5, 25.5, -Math.PI / 2), __pr3d.place('big', 9.5, 22.5, { awake: true })");
  for (let i = 0; i < 10; i++) {
    await t.eval("__pr3d.tick(0.5)");
    t.assert((await st()).kinds.cloud === 0, "a cloud was thrown at someone behind a hedge");
  }
  t.assert((await st()).stink === 0, "stink through a hedge");

  // Small poop north of the pond, player south: it goes round, never onto the water
  await t.eval("__pr3d.clear('poops'), __pr3d.set({ stink: 0 }), __pr3d.view(24.5, 19.5, -Math.PI / 2), __pr3d.place('small', 24.5, 10.5, { awake: true })");
  for (let i = 0; i < 12; i++) {
    await t.eval("__pr3d.tick(0.5)");
    const p = (await t.eval("__pr3d.find('small')"))[0];
    if (p) t.assert(!(await t.eval(`__pr3d.blockedAt(${p.x}, ${p.y})`)), `poop on the pond at ${p.x},${p.y}`);
  }

  // Full stink = lose
  await t.eval("__pr3d.clear('poops', 'cloud'), __pr3d.set({ stink: 95 }), __pr3d.view(16.5, 20.5, -Math.PI / 2), __pr3d.place('small', 16.5, 19.9, { awake: true }), __pr3d.tick(0.3)");
  s = await st();
  t.assert(s.over === "lose", "not lost at full stink: " + s.over);
  t.assert(await t.eval("document.getElementById('ov-title').textContent") === "Too stinky!", "lose title wrong");
};
