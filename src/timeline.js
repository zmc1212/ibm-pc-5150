/* 时间线：核心 → 内存组 → ISA 卡 → 外设 → 上电 → POST → BASIC → 归位 */
(function (LS8) {
  var phases = [
    { id: "core", name: "核心芯片 · 8088", dur: 7.0, dot: "blue",
      cam: { theta: -0.62, phi: 0.96, r: 6.2, target: [0.1, 0.2, 0.08] }, drift: 0.04 },
    { id: "banks", name: "内存组 · 36 × 4116", dur: 4.4, dot: "blue",
      cam: { theta: -1.5, phi: 0.95, r: 3.8, target: [0.95, 0.15, -0.3] }, drift: 0.015 },
    { id: "cards", name: "ISA 插卡 · MDA + FDC", dur: 3.6, dot: "teal",
      cam: { theta: -1.9, phi: 1.0, r: 3.8, target: [-0.5, 0.3, -0.55] }, drift: 0.012 },
    { id: "io", name: "外设接线 · 扬声器", dur: 2.8, dot: "teal",
      cam: { theta: -2.6, phi: 0.98, r: 3.6, target: [1.3, 0.15, 0.4] }, drift: 0.012 },
    { id: "power", name: "通电 · +5V", dur: 2.4, dot: "green",
      cam: { theta: -1.0, phi: 0.88, r: 3.6, target: [0.1, 0.15, 0.08] }, drift: 0.012 },
    { id: "post", name: "POST 自检 · 内存计数", dur: 4.4, dot: "yellow",
      cam: { theta: -1.55, phi: 1.02, r: 4.2, target: [0.1, 0.15, 0.08] }, drift: 0.01 },
    { id: "boot", name: "启动 · CASSETTE BASIC", dur: 4.6, dot: "pink",
      cam: { theta: -0.7, phi: 0.94, r: 5.4, target: [0.1, 0.15, 0.08] }, drift: 0.02 },
    { id: "home", name: "零件归位", dur: 5.0, dot: "yellow",
      cam: { theta: -0.62, phi: 1.0, r: 7.6, target: [0.1, 0.25, 0.1] }, drift: 0.03 }
  ];

  var PINNED = {
    banks: function () {
      return [
        { id: "p-b1", obj: LS8.Parts.group("bank1"), text: "内存组 1", sub: "9 x 4116 · 16K" },
        { id: "p-b4", obj: LS8.Parts.group("bank4"), text: "内存组 4", sub: "RAM BANK 4", tone: "white" }
      ];
    },
    cards: function () {
      return [
        { id: "p-md", obj: LS8.Parts.group("mda"), text: "单色显示适配器", sub: "IBM MDA" },
        { id: "p-fd", obj: LS8.Parts.group("fdc"), text: "软盘适配器", sub: "FDC · NECDIP", tone: "white" }
      ];
    },
    post: function () {
      return [{ id: "p-cpu", obj: LS8.Parts.group("cpu"), text: "POST 内存自检", sub: "POST · 64K CHECK" }];
    },
    boot: function () {
      return [{ id: "p-bio", obj: LS8.Parts.group("bios1"), text: "BIOS 启动", sub: "BIOS · F0000" }];
    }
  };

  var POWER_AT = 4;

  var state = {};
  var idx = -1, pt = 0, paused = false;
  var typed = 0;
  var dom = {};

  function resetState() {
    state = {
      time: 0, power: false, postOn: false, bootOn: false, beep: false,
      memKb: 0, cardFill: 0, ticks: 0,
      ip: 0xFFF0, ax: 0x0000, sp: 0x0000
    };
    typed = 0;
    LS8.Dashboard.bootClear();
  }

  function $(id) { return document.getElementById(id); }

  function cacheDom() {
    dom = {
      mode: $("st-mode"), clk: $("st-clk"), ram: $("st-ram"), parts: $("st-parts"),
      pill: $("phase-text"), dot: $("phase-dot")
    };
  }

  function smooth(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }

  var PHASE_SFX = { cards: "insert", power: "power", post: "beep", boot: "chime" };

  function enterPhase(i) {
    idx = i; pt = 0;
    var ph = phases[i];
    if (ph.id === "core") {
      LS8.Parts.begin(0, ["cpu", "fpu", "t8253", "t8237", "t8259", "t8255", "t8284", "t8288",
        "bios1", "bios2", "bios3", "bios4", "bios5", "xtal", "tray"], ph.dur - 1.4);
      LS8.Labels.clearAnnounce();
    } else if (ph.id === "banks") {
      LS8.Parts.begin(0, ["bank1", "bank2", "bank3", "bank4"], ph.dur - 1.4);
    } else if (ph.id === "cards") {
      LS8.Parts.begin(0, ["mda", "fdc"], ph.dur - 1.4);
    } else if (ph.id === "io") {
      LS8.Parts.begin(0, ["spk"], ph.dur - 1.4);
      LS8.Cables.begin(0);
    } else if (ph.id === "power") {
      state.power = true;
    } else if (ph.id === "post") {
      state.postOn = true;
    } else if (ph.id === "boot") {
      state.bootOn = true;
    } else if (ph.id === "home") {
      LS8.Parts.flyOut(0);
    }
    if (LS8.Audio && PHASE_SFX[ph.id]) LS8.Audio.play(PHASE_SFX[ph.id]);
    var pins = PINNED[ph.id];
    LS8.Labels.setPinned(pins ? pins() : []);
  }

  function restartCycle() {
    LS8.Parts.reset();
    LS8.Cables.reset();
    LS8.Labels.clearAnnounce();
    resetState();
    enterPhase(0);
  }

  var BOOT_SCRIPT = [
    [0.6, "The IBM Personal Computer Basic"],
    [1.6, "Version C1.10 Copyright IBM Corp 1981"],
    [2.6, "61404 Bytes free"],
    [3.6, "Ok"]
  ];

  function update(dt) {
    if (paused) return;
    dt = Math.min(dt, 0.12);
    state.time += dt;
    pt += dt;

    var ph = phases[idx];
    if (pt >= ph.dur) {
      if (idx >= phases.length - 1) restartCycle();
      else enterPhase(idx + 1);
      ph = phases[idx];
    }

    LS8.orbitCtl.autoDrift = ph.drift;
    LS8.orbitCtl.flyTo(ph.cam);

    LS8.Parts.update(pt);
    LS8.Cables.update(pt);
    state.cardFill = idx >= 3 ? 2 : (ph.id === "cards" ? (pt > 1.2 ? 1 : 0) + (pt > 2.4 ? 1 : 0) : 0);

    /* POST 内存计数（仅 post 阶段推进） */
    if (ph.id === "post") {
      state.beep = pt > 3.4;
      var target = smooth(pt / 3.2) * 64;
      state.memKb = Math.floor(target);
      var bank = Math.min(4, Math.floor(target / 16) + (target > 0 ? 1 : 0));
      state.ip = 0xFFF0;
      state.ax = Math.floor(target) & 0xffff;
      state.sp = Math.floor(target) * 16;
      state.ticks += dt * 7.8;
    }
    if (state.bootOn) {
      var t = (state.bootT = (state.bootT || 0) + dt);
      while (typed < BOOT_SCRIPT.length && t > BOOT_SCRIPT[typed][0]) {
        LS8.Dashboard.bootType(BOOT_SCRIPT[typed][1]);
        typed++;
      }
      state.ticks += dt * 7.8;
    }

    /* DOM */
    dom.mode.textContent = state.bootOn ? "运行 BASIC" : (state.postOn ? "自检 POST" : (state.power ? "就绪 READY" : "关机 OFF"));
    dom.mode.className = "mode" + (state.bootOn ? " lock" : "");
    dom.clk.textContent = state.power ? "4.77 MHZ" : "—";
    dom.ram.textContent = Math.floor(state.memKb) + " KB";
    var partsN = LS8.Parts.seatedCount;
    dom.parts.textContent = partsN + " / 22";
    var label = ph.name;
    if (ph.id === "core" || ph.id === "banks") label = ph.name + " · " + partsN + " / 22";
    dom.pill.textContent = label;
    dom.dot.className = ph.dot;

    LS8.Dashboard.update(state, dt);
  }

  LS8.Timeline = {
    init: function () { resetState(); cacheDom(); },
    start: function () { enterPhase(0); },
    restart: restartCycle,
    seek: function (id) {
      var i = -1;
      for (var k = 0; k < phases.length; k++) if (phases[k].id === id) i = k;
      if (i < 0) return;
      LS8.Parts.reset();
      LS8.Cables.reset();
      LS8.Labels.clearAnnounce();
      resetState();
      if (i >= 1) { LS8.Parts.begin(0); LS8.Parts.sealAll(); }
      if (i >= POWER_AT) {
        LS8.Cables.completeAll();
        state.power = true;
        state.cardFill = 2;
      }
      enterPhase(i);
      if (i >= 6) {
        state.postOn = true;
        state.memKb = 64;
        state.beep = true;
        state.bootOn = true;
        state.bootT = 5;
        while (typed < BOOT_SCRIPT.length && 5 > BOOT_SCRIPT[typed][0]) {
          LS8.Dashboard.bootType(BOOT_SCRIPT[typed][1]);
          typed++;
        }
      }
    },
    update: update,
    togglePause: function () { paused = !paused; return paused; },
    get paused() { return paused; },
    get phaseId() { return phases[idx] ? phases[idx].id : ""; },
    get phaseIds() { return phases.map(function (p) { return p.id; }); }
  };
})(window.LS8 = window.LS8 || {});
