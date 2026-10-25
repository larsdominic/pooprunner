// Minimal Chrome DevTools driver for the checks: launches headless Chrome, runs fn(t), closes Chrome.
import { spawn } from "node:child_process";
import { writeFileSync, rmSync } from "node:fs";

const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const VK = { Space: 32, KeyW: 87, KeyA: 65, KeyS: 83, KeyD: 68, KeyM: 77, KeyP: 80, KeyQ: 81, KeyE: 69,
  ArrowUp: 38, ArrowDown: 40, ArrowLeft: 37, ArrowRight: 39, Escape: 27 };
const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function withPage({ url, w = 640, h = 400, touch = false, init = "" }, fn) {
  const port = 9300 + Math.floor(Math.random() * 600), dir = `/tmp/pr3d-cdp-${port}`;
  const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${port}`, `--window-size=${w},${h}`,
    "--hide-scrollbars", "--autoplay-policy=no-user-gesture-required", "--allow-file-access-from-files",
    `--user-data-dir=${dir}`, "about:blank"], { stdio: "ignore" });
  let ws;
  try {
    for (let i = 0; i < 75 && !ws; i++) {
      try {
        const p = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x => x.type === "page");
        if (p) ws = new WebSocket(p.webSocketDebuggerUrl);
      } catch {}
      if (!ws) await sleep(200);
    }
    if (!ws) throw new Error("Chrome did not start");
    await new Promise(r => ws.onopen = r);
    let id = 0;
    const pending = new Map(), logs = [];
    ws.onmessage = e => {
      const m = JSON.parse(e.data);
      if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
      if (m.method === "Runtime.consoleAPICalled") logs.push(m.params.type + ": " + m.params.args.map(a => a.value ?? a.description).join(" "));
      if (m.method === "Runtime.exceptionThrown") logs.push("EXCEPTION: " + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
      if (m.method === "Log.entryAdded" && m.params.entry.level === "error") logs.push("error: " + m.params.entry.text);
    };
    const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
    await send("Runtime.enable"); await send("Page.enable"); await send("Log.enable");
    await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: touch });
    if (touch) {
      await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
      await send("Emulation.setEmulatedMedia", { features: [{ name: "pointer", value: "coarse" }, { name: "hover", value: "none" }] });
    }
    if (init) await send("Page.addScriptToEvaluateOnNewDocument", { source: init });   // e.g. pretend to be an older browser
    await send("Page.navigate", { url });
    const t = {
      sleep, send, logs, w, h, touch,
      async eval(expr) {
        const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
        if (r.result.exceptionDetails) throw new Error("eval failed: " + expr + "\n" + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text));
        return r.result.result?.value;
      },
      async shot(file) { const r = await send("Page.captureScreenshot", { format: "png" }); writeFileSync(file, Buffer.from(r.result.data, "base64")); },
      key: (code, down = true) => send("Input.dispatchKeyEvent", { type: down ? "rawKeyDown" : "keyUp", code,
        key: code === "Space" ? " " : code.replace(/^Key/, "").toLowerCase(), windowsVirtualKeyCode: VK[code] }),
      async tap(x, y) {
        await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y, id: 1 }] });
        await sleep(30);
        await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      },
      assert(cond, msg) { if (!cond) throw new Error(msg); },
      async boot({ kid = "james", easy = false } = {}) {
        let ready = false;
        for (let i = 0; i < 40 && !ready; i++) { ready = await t.eval("!!(window.__pr3d && __pr3d.state.ready)"); if (!ready) await sleep(250); }
        t.assert(ready, "game not ready within 10 s");
        await t.eval(`(() => {
          const p = document.getElementById("pick-${kid}"); if (p) p.click();
          const e = document.getElementById("easy"); if (e && e.checked !== ${easy}) e.click();
          document.getElementById("ov-btn").click();
          if (__pr3d.hold) __pr3d.hold(true);   // only tick() moves the game, so checks are repeatable
        })()`);
        await sleep(50);
      },
    };
    await fn(t);
    return logs;
  } finally {
    try { ws && ws.close(); } catch {}
    chrome.kill();
    await sleep(100);
    try { rmSync(dir, { recursive: true, force: true }); } catch {}
  }
}
