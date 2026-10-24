// TP packs (+12), air freshener (-30 stink, only when stinky), a new TP pack when you run dry, the border collie
export default async t => {
  await t.boot();
  const st = () => t.eval("__pr3d.state");
  let s = await st();
  t.assert(s.kinds.tp === 4 && s.kinds.fresh === 3, `pickups placed: tp ${s.kinds.tp}, fresh ${s.kinds.fresh}`);

  await t.eval("__pr3d.place('tp', __pr3d.state.px, __pr3d.state.py), __pr3d.tick(0.1)");
  s = await st();
  t.assert(s.rolls === 42 && s.kinds.tp === 4, `TP pack: rolls ${s.rolls}, packs left ${s.kinds.tp}`);

  await t.eval("__pr3d.set({ stink: 50 }), __pr3d.place('fresh', __pr3d.state.px, __pr3d.state.py), __pr3d.tick(0.1)");
  t.assert((await st()).stink === 20, "freshener: stink " + (await st()).stink);
  await t.eval("__pr3d.set({ stink: 0 }), __pr3d.place('fresh', __pr3d.state.px, __pr3d.state.py), __pr3d.tick(0.1)");
  t.assert((await st()).kinds.fresh === 4, "freshener taken when not stinky");
  await t.eval("__pr3d.set({ stink: 20 }), __pr3d.tick(0.1)");
  t.assert((await st()).stink === 0, "freshener should clamp stink at 0: " + (await st()).stink);

  // Review Focus 3: no rolls and no TP packs left -> a new pack by the gate
  await t.eval("__pr3d.clear('tp'), __pr3d.set({ rolls: 0 }), __pr3d.tick(0.1)");
  s = await st();
  t.assert(s.kinds.tp === 1 && /by the gate/.test(s.msg), `safety net: tp ${s.kinds.tp}, msg "${s.msg}"`);

  // The dog keeps up, out in front where you can see it, a few steps away
  const ahead = s => {
    const ex = s.dog.x - s.px, ey = s.dog.y - s.py, d = Math.hypot(ex, ey);
    return { d, cos: (ex * Math.cos(s.angle) + ey * Math.sin(s.angle)) / (d || 1) };
  };
  await t.eval("__pr3d.clear('poops', 'tp'), __pr3d.view(16.5, 24.5, -Math.PI / 2)");
  await t.key("KeyW"); await t.eval("__pr3d.tick(2)"); await t.key("KeyW", false);
  await t.eval("__pr3d.tick(3)");
  let a = ahead(await st());
  t.assert(a.d > 2 && a.d < 5.5 && a.cos > 0.6, `dog not out in front: ${a.d.toFixed(1)} away, cos ${a.cos.toFixed(2)}`);
  // Turn round: it runs back round in front
  await t.eval("__pr3d.view(__pr3d.state.px, __pr3d.state.py, Math.PI / 2), __pr3d.tick(3)");
  a = ahead(await st());
  t.assert(a.d > 2 && a.d < 5.5 && a.cos > 0.6, `dog did not come round in front after a turn: ${a.d.toFixed(1)} away, cos ${a.cos.toFixed(2)}`);

  // ...and barks at poops
  await t.eval("__pr3d.place('small', __pr3d.state.dog.x + 2, __pr3d.state.dog.y), __pr3d.tick(1)");
  t.assert((await st()).msg === "Woof!", "no bark: " + (await st()).msg);

  // Rolls fly past the dog
  await t.eval("__pr3d.clear('poops'), __pr3d.view(16.5, 24.5, -Math.PI / 2), __pr3d.place('dog', 16.5, 22.5), __pr3d.set({ rolls: 5 })");
  await t.key("Space"); await t.eval("__pr3d.tick(1 / 60)"); await t.key("Space", false);
  await t.eval("__pr3d.tick(0.3)");
  s = await st();
  t.assert(s.kinds.roll === 1 && s.kinds.puff === 0, `roll stopped by the dog: rolls flying ${s.kinds.roll}, puffs ${s.kinds.puff}`);
};
