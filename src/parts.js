/* IBM 5150 零件 + 飞行/垂直插卡控制器 */
(function (LS8) {
  var list = [];
  var root = null;
  var seatedCount = 0;
  var flying = false, phaseOut = false;
  var t0 = 0;

  function chipTop(text, sub) {
    return LS8.Textures.makeTex(128, 64, function (ctx, w, h) {
      ctx.fillStyle = "#14151a";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = "bold 15px monospace";
      ctx.textAlign = "center";
      ctx.fillText(text, w / 2, 26);
      if (sub) { ctx.font = "11px monospace"; ctx.fillText(sub, w / 2, 46); }
    });
  }

  function setAnchor(g, y) { g.userData.tagAnchor = new THREE.Vector3(0, y, 0); }

  function build() {
    var M = LS8.Scene3D.M, mesh = LS8.Scene3D.mesh;
    var defs = [];

    function def(id, name, sub, pos, yaw, anchorY, buildFn, delay, mid) {
      var g = buildFn();
      g.position.set(pos[0], pos[1], pos[2]);
      g.rotation.y = yaw || 0;
      setAnchor(g, anchorY);
      root.add(g);
      defs.push({ id: id, name: name, sub: sub, group: g, target: g.position.clone(),
        yaw: yaw || 0, anchorY: anchorY, delay: delay || 0, mid: mid || null });
    }

    function dip(len, label, sub, pins) {
      var g = new THREE.Group();
      var body = new THREE.Mesh(new THREE.BoxGeometry(len, 0.045, 0.12),
        new THREE.MeshStandardMaterial({ map: chipTop(label, sub), roughness: 0.5 }));
      body.castShadow = true;
      g.add(body);
      for (var i = 0; i < (pins || 8); i++) {
        var dx = -len / 2 + 0.02 + i * (len - 0.04) / (pins - 1);
        g.add(mesh(new THREE.BoxGeometry(0.012, 0.012, 0.028), M.gold, dx, -0.01, 0.065));
        g.add(mesh(new THREE.BoxGeometry(0.012, 0.012, 0.028), M.gold, dx, -0.01, -0.065));
      }
      return g;
    }

    function isaCard(col, label) {
      var g = new THREE.Group();
      var tex = LS8.Textures.pcb(col, "rgba(120,200,165,0.45)", "", "");
      g.add(mesh(new THREE.BoxGeometry(0.02, 0.34, 0.3), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }), 0, 0, 0));
      g.add(mesh(new THREE.BoxGeometry(0.024, 0.07, 0.3), M.gold, 0, -0.18, 0));
      g.add(mesh(new THREE.BoxGeometry(0.03, 0.09, 0.1), M.chip, 0, 0.07, -0.07));
      g.add(mesh(new THREE.BoxGeometry(0.03, 0.06, 0.08), M.chip, 0, -0.03, 0.08));
      g.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.03, 8), M.silver, 0, 0.12, 0.06));
      return g;
    }

    function ramBank(i) {
      var g = new THREE.Group();
      for (var c = 0; c < 9; c++) {
        g.add(mesh(new THREE.BoxGeometry(0.1, 0.045, 0.05), M.chip, c * 0.12, 0, 0));
      }
      return g;
    }

    /* 1 · Intel 8088（DIP-40） */
    def("cpu", "英特尔 8088", "INTEL 8088 · 4.77 MHZ", [-0.35, 0.115, 0.0], 0.06, 0.12,
      function () { return dip(0.38, "INTEL 8088", "L4130025", 20); }, 0);
    /* 2 · 8087 FPU 空座（DIP-40） */
    def("fpu", "8087 协处理器", "FPU · EMPTY SOCKET", [0.02, 0.115, 0.0], -0.06, 0.12,
      function () { return dip(0.36, "8087", "NPU", 20); }, 1);
    /* 3-6 · Intel 支援芯片（真实 DIP 引脚数：8253=24 / 8237=40 / 8259=28 / 8255=40） */
    def("t8253", "8253 定时器", "TIMER · SPEAKER CLK", [0.35, 0.115, -0.1], 0.1, 0.1,
      function () { return dip(0.24, "8253-5", "TIMER", 12); }, 2);
    def("t8237", "8237 DMA 控制器", "DMA · 4 CH", [0.62, 0.115, -0.02], -0.08, 0.1,
      function () { return dip(0.26, "8237-5", "DMA", 20); }, 3);
    def("t8259", "8259 中断控制器", "PIC · 8 LEVEL", [0.88, 0.115, 0.06], 0.12, 0.1,
      function () { return dip(0.24, "8259A", "PIC", 14); }, 4);
    def("t8255", "8255 并行接口", "PPI · PARALLEL", [-0.72, 0.115, 0.2], -0.1, 0.1,
      function () { return dip(0.24, "8255A-5", "PPI", 20); }, 5);
    /* 6b · 8284 时钟发生器 + 8288 总线控制器 */
    def("t8284", "8284 时钟发生器", "CLOCK GEN · DIP-18 · ÷3 CRYSTAL", [-0.75, 0.115, -0.16], -0.04, 0.1,
      function () { return dip(0.24, "8284A", "CLK GEN", 9); }, 5.5);
    def("t8288", "8288 总线控制器", "BUS CTRL · DIP-20", [-0.4, 0.115, 0.26], 0.05, 0.1,
      function () { return dip(0.24, "8288", "BUS CTRL", 10); }, 6);
    /* 7-11 · ROM ×5：BIOS 8K（U33）+ CASSETTE BASIC 8K ×4（U29-U32，真实为 5 颗 DIP-24） */
    def("bios1", "BIOS ROM", "8K · IBM · U33", [1.08, 0.115, -0.2], 0.05, 0.1,
      function () { return dip(0.26, "IBM BIOS", "1501311", 12); }, 6.5);
    def("bios2", "BASIC ROM 1", "8K · IBM · U32", [1.08, 0.115, -0.02], -0.05, 0.1,
      function () { return dip(0.26, "IBM BASIC", "C1.10", 12); }, 7);
    def("bios3", "BASIC ROM 2", "8K · IBM · U31", [1.08, 0.115, 0.16], 0.04, 0.1,
      function () { return dip(0.26, "IBM BASIC", "C1.10", 12); }, 7.2);
    def("bios4", "BASIC ROM 3", "8K · IBM · U30", [1.08, 0.115, 0.34], -0.04, 0.1,
      function () { return dip(0.26, "IBM BASIC", "C1.10", 12); }, 7.4);
    def("bios5", "BASIC ROM 4", "8K · IBM · U29", [1.08, 0.115, 0.52], 0.05, 0.1,
      function () { return dip(0.26, "IBM BASIC", "C1.10", 12); }, 7.6);
    /* 12 · 晶振 */
    def("xtal", "晶振 14.318", "CRYSTAL · 14.318 MHZ", [-0.05, 0.115, -0.2], 0.35, 0.1,
      function () {
        var g = new THREE.Group();
        g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.09, 10), M.silver, 0, 0, 0).rotateX(Math.PI / 2));
        return g;
      }, 8);
    /* 13-16 · RAM banks ×4（9 × 4116 · 每组 16KB，POST 数到 64K） */
    for (var b = 0; b < 4; b++) {
      (function (bi) {
        def("bank" + (bi + 1), "内存组 " + (bi + 1), "RAM BANK " + (bi + 1) + " · 9 x 4116 · 16K", [0.93, 0.115, -0.62 + bi * 0.11], 0, 0.1,
          function () { return ramBank(bi); }, bi);
      })(b);
    }
    /* 14-15 · ISA 卡 ×2（垂直插入） */
    def("mda", "MDA 显示卡", "IBM MDA VIDEO · ISA SLOT 1", [-0.61, 0.36, -0.62], 0, 0.36,
      function () { return isaCard("#3f7f52", "MDA"); },
      0, { mid: [-0.61, 1.55, -0.62] });
    def("fdc", "软盘控制器", "FLOPPY CTRL · ISA SLOT 2", [-0.17, 0.36, -0.62], 0, 0.36,
      function () { return isaCard("#2b2f38", "FDC"); },
      1, { mid: [-0.17, 1.55, -0.62] });
    /* 17 · 扬声器（在机箱前左侧，由导线接到板上接线头） */
    def("spk", "扬声器 2.25 IN", "SPEAKER · 8 OHM · CASE-MOUNTED", [1.75, 0.115, 1.05], 0.3, 0.1,
      function () {
        var g = new THREE.Group();
        g.add(mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.05, 16), M.plastic, 0, 0.025, 0));
        g.add(mesh(new THREE.SphereGeometry(0.05, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.dark, 0, 0.045, 0));
        return g;
      }, 1);
    /* 18 · 螺丝盒 */
    def("tray", "螺丝盒", "SCREWS · 6-32", [-2.35, 0.093, 1.9], -0.2, 0.16,
      function () {
        var g = new THREE.Group();
        g.add(mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.1, 20), M.plastic, 0, 0.05, 0));
        g.add(mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.02, 20), M.dark, 0, 0.1, 0));
        for (var i = 0; i < 6; i++) {
          var s = mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.055, 6), M.silver,
            (Math.random() - 0.5) * 0.22, 0.12, (Math.random() - 0.5) * 0.22);
          s.rotation.z = Math.PI / 2 + (Math.random() - 0.5);
          g.add(s);
        }
        return g;
      }, 0);

    return defs;
  }

  /* ============ 飞行控制（通用骨架） ============ */
  function easeInOut(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function init() {
    root = new THREE.Group();
    LS8.Scene3D.scene.add(root);
    list = build();
    list.forEach(function (p) {
      p.duration = 1.15;
      p.start = new THREE.Vector3(-7.8 - Math.random() * 2, 0.6 + Math.random() * 1.6, -1.6 + Math.random() * 2.2);
      p.midPoint = p.mid && p.mid.mid
        ? new THREE.Vector3(p.mid.mid[0], p.mid.mid[1], p.mid.mid[2])
        : new THREE.Vector3(
            p.start.x + (p.target.x - p.start.x) * 0.42,
            1.9 + Math.random() * 0.7,
            p.start.z + (p.target.z - p.start.z) * 0.55 - 0.3
          );
      p.group.visible = false;
      p.begun = false;
    });
  }

  function bez(p0, p1, p2, t) {
    var a = (1 - t) * (1 - t), b = 2 * t * (1 - t), c = t * t;
    return new THREE.Vector3(
      a * p0.x + b * p1.x + c * p2.x,
      a * p0.y + b * p1.y + c * p2.y,
      a * p0.z + b * p1.z + c * p2.z
    );
  }

  function begin(now, ids, span) {
    flying = true; phaseOut = false;
    t0 = now;
    /* 阶段内归一化错峰：按 ids 顺序均分 span，保证全部零件在本阶段内落座 */
    var seq = [];
    if (ids) {
      ids.forEach(function (id) {
        for (var k = 0; k < list.length; k++) if (list[k].id === id) { seq.push(list[k]); break; }
      });
    } else {
      seq = list.slice();
    }
    var step = seq.length > 1 ? Math.max(0.18, (span || 2.2) / (seq.length - 1)) : 0;
    seq.forEach(function (p, i) {
      p.flyDelay = i * step;
      p.begun = true;
      p.sealed = false;
      p.landed = false; p.tagShown = false;
      p.group.visible = false;
      if (p.line) { LS8.Scene3D.scene.remove(p.line); p.line = null; }
      var pts = [];
      for (var k = 0; k <= 30; k++) pts.push(bez(p.start, p.midPoint, p.target, k / 30));
      var geo = new THREE.BufferGeometry().setFromPoints(pts);
      var line = new THREE.Line(geo, new THREE.LineDashedMaterial({
        color: 0xff7ab8, dashSize: 0.11, gapSize: 0.075, transparent: true, opacity: 0.8
      }));
      line.computeLineDistances();
      LS8.Scene3D.scene.add(line);
      p.line = line;
      p.lineUntil = Infinity;
    });
  }

  function flyOut(now) {
    if (!flying) return;
    phaseOut = true;
    t0 = now;
    list.forEach(function (p, i) {
      if (!p.begun || !p.group.visible) return;
      p.outDelay = i * 0.12;
      p.outDone = false;
      p.outStart = p.group.position.clone();
      p.outMid = new THREE.Vector3(p.outStart.x - 2.2, 2.4, p.outStart.z - 0.6);
      var pts = [];
      for (var k = 0; k <= 30; k++) pts.push(bez(p.outStart, p.outMid, p.start, k / 30));
      var geo = new THREE.BufferGeometry().setFromPoints(pts);
      var line = new THREE.Line(geo, new THREE.LineDashedMaterial({
        color: 0xff7ab8, dashSize: 0.11, gapSize: 0.075, transparent: true, opacity: 0.6
      }));
      line.computeLineDistances();
      LS8.Scene3D.scene.add(line);
      p.outLine = line;
    });
  }

  function update(now) {
    if (!flying) return;
    list.forEach(function (p) {
      if (!p.begun || p.sealed) return;
      if (!phaseOut) {
        if (p.landed) {
          /* 已落座：钉在目标位，阶段切换 t0 清零也不重飞 */
          p.group.position.copy(p.target);
          p.group.rotation.y = p.yaw;
        } else {
          var t = (now - t0 - p.flyDelay) / p.duration;
          if (t <= 0) return;
          if (!p.tagShown) {
            p.tagShown = true;
            p.group.visible = true;
            LS8.Labels.announce(p.id, p.group, p.name, p.sub, performance.now(), 2600);
          }
          var tt = easeInOut(Math.min(t, 1));
          p.group.position.copy(bez(p.start, p.midPoint, p.target, tt));
          p.group.rotation.y = p.yaw + (1 - tt) * (p.mid && p.mid.mid ? 0.3 : 1.2);
          if (t >= 1 && !p.landed) {
            p.landed = true;
            seatedCount++;
            if (LS8.Audio) LS8.Audio.play("land");
            p.lineUntil = now + 0.55;
          }
        }
        if (p.line) {
          if (now > p.lineUntil) {
            LS8.Scene3D.scene.remove(p.line);
            p.line.geometry.dispose(); p.line.material.dispose();
            p.line = null;
          } else if (p.landed) {
            p.line.material.opacity = Math.max(0, (p.lineUntil - now) / 0.55) * 0.8;
          }
        }
      } else {
        if (!p.begun || p.outDone || !p.group.visible) return;
        var ot = (now - t0 - p.outDelay) / 0.85;
        if (ot <= 0) return;
        var ott = easeInOut(Math.min(ot, 1));
        p.group.position.copy(bez(p.outStart, p.outMid, p.start, ott));
        p.group.rotation.y = p.yaw + ott * 1.6;
        if (p.outLine) p.outLine.material.opacity = Math.max(0.1, 0.6 - ott * 0.5);
        if (ot >= 1) {
          p.outDone = true;
          seatedCount = Math.max(0, seatedCount - 1);
          p.group.visible = false;
          if (p.outLine) {
            LS8.Scene3D.scene.remove(p.outLine);
            p.outLine.geometry.dispose(); p.outLine.material.dispose();
            p.outLine = null;
          }
        }
      }
    });
  }

  function sealAll() {
    flying = true; phaseOut = false;
    list.forEach(function (p) {
      p.sealed = true;
      p.begun = true; p.landed = true; p.tagShown = true;
      p.group.visible = true;
      p.group.position.copy(p.target);
      p.group.rotation.y = p.yaw;
      if (p.line) { LS8.Scene3D.scene.remove(p.line); p.line = null; }
    });
    seatedCount = list.length;
  }

  function reset() {
    flying = false; phaseOut = false; seatedCount = 0;
    list.forEach(function (p) {
      p.begun = false; p.landed = false; p.sealed = false;
      p.group.visible = false;
      if (p.line) { LS8.Scene3D.scene.remove(p.line); p.line = null; }
      if (p.outLine) { LS8.Scene3D.scene.remove(p.outLine); p.outLine = null; }
    });
  }

  function groupById(id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i].group;
    return null;
  }

  LS8.Parts = {
    init: init, begin: begin, flyOut: flyOut, update: update, reset: reset,
    group: groupById, sealAll: sealAll,
    get seatedCount() { return seatedCount; },
    get flying() { return flying && !phaseOut; },
    list: function () { return list; }
  };
})(window.LS8 = window.LS8 || {});
