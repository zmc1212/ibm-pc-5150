/* IBM 5150 布线：键盘螺旋线 / 扬声器线 / 软盘排线 / 电源束 */
(function (LS8) {
  var cables = [];
  var root = null;
  var running = false, t0 = 0, done = false;

  var SPECS = [
    { // 键盘螺旋线（DIN → 板上插座 → 出画面）
      pts: [[-1.15, 0.12, -0.32], [-1.45, 0.1, -0.15], [-1.25, 0.16, 0.05],
            [-1.5, 0.12, 0.25], [-1.3, 0.17, 0.45], [-1.6, 0.12, 0.65], [-1.95, 0.12, 0.95]],
      color: 0x2a2d33, r: 0.016, delay: 0, strands: 1
    },
    { // 扬声器线（红黑对）
      pts: [[1.42, 0.12, 0.5], [1.15, 0.11, 0.5], [1.05, 0.1, 0.53]],
      color: 0xc0392b, r: 0.009, delay: 0.5, strands: 2
    },
    { // 软盘排线（FDC 卡 → 前缘）
      pts: [[-0.17, 0.25, -0.58], [0.3, 0.16, -0.35], [0.6, 0.12, -0.1], [0.7, 0.12, 0.3]],
      color: 0x000000, r: 0.008, delay: 0.9, strands: 8, ribbon: true
    },
    { // 电源束（AT 插头 → 出画面）
      pts: [[1.2, 0.12, -0.6], [1.5, 0.14, -0.85], [1.9, 0.12, -1.15]],
      color: 0x17181d, r: 0.012, delay: 1.4, strands: 1
    }
  ];

  function init() {
    root = new THREE.Group();
    LS8.Scene3D.scene.add(root);
  }

  function buildCable(spec) {
    var meshes = [];
    var offs = [];
    if (spec.ribbon) {
      for (var s = 0; s < spec.strands; s++) offs.push((s - (spec.strands - 1) / 2) * 0.02);
    } else {
      for (var k = 0; k < spec.strands; k++) offs.push(spec.strands === 2 ? (k - 0.5) * 0.02 : 0);
    }
    offs.forEach(function (off, idx) {
      var pts = spec.pts.map(function (p) {
        return new THREE.Vector3(p[0] + off * 0.5, p[1] + Math.abs(off) * 0.5, p[2] + off);
      });
      var curve = new THREE.CatmullRomCurve3(pts);
      var geo = new THREE.TubeGeometry(curve, 72, spec.r, 8, false);
      var mat = new THREE.MeshStandardMaterial({
        color: spec.ribbon ? [0xe84f8e, 0xf2a53a, 0xf5e04b, 0x7fd8d8, 0x5b8cff, 0x8b5fd0, 0x57c46b, 0xe8e4da][idx] : spec.color,
        roughness: 0.62, metalness: 0.12
      });
      var m = new THREE.Mesh(geo, mat);
      m.castShadow = true;
      m.geometry.setDrawRange(0, 0);
      root.add(m);
      meshes.push(m);
    });
    return { spec: spec, meshes: meshes };
  }

  function begin(now) {
    running = true; done = false; t0 = now;
    cables = SPECS.map(buildCable);
  }

  function update(now) {
    if (!running || done) return;
    cables.forEach(function (c) {
      var t = (now - t0 - c.spec.delay) / 1.1;
      if (t <= 0) return;
      var f = Math.min(1, t);
      var ease = f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2;
      c.meshes.forEach(function (m) {
        var total = m.geometry.index.count;
        m.geometry.setDrawRange(0, Math.floor(total * ease / 6) * 6);
      });
    });
    if ((now - t0) > 3.4) done = true;
  }

  function completeAll() {
    running = true; done = true;
    if (!cables.length) cables = SPECS.map(buildCable);
    cables.forEach(function (c) {
      c.meshes.forEach(function (m) {
        m.geometry.setDrawRange(0, m.geometry.index.count);
      });
    });
  }

  function reset() {
    running = false; done = false;
    root.traverse(function (o) {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
    root.clear();
    cables = [];
  }

  LS8.Cables = { init: init, begin: begin, update: update, reset: reset, completeAll: completeAll };
})(window.LS8 = window.LS8 || {});
