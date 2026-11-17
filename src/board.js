/* 场景：渲染器 / 灯光 / 木桌 / 蓝绿垫 / IBM 5150 主板 */
(function (LS8) {
  var M = {};

  function mesh(geo, mat, x, y, z, cast, receive) {
    var m = new THREE.Mesh(geo, mat);
    if (x !== undefined) m.position.set(x, y, z);
    m.castShadow = cast !== false;
    m.receiveShadow = receive !== false;
    return m;
  }

  function init() {
    var stage = document.getElementById("stage");
    var renderer = new THREE.WebGLRenderer({ antialias: true });
    var softGL = false;
    try {
      var gl = renderer.getContext();
      var ext = gl.getExtension("WEBGL_debug_renderer_info");
      var gpu = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "";
      softGL = /swiftshader|software|basic render/i.test(String(gpu));
    } catch (e) { /* 默认 */ }
    renderer.setPixelRatio(softGL ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(stage.clientWidth, stage.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = softGL ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.22;
    renderer.physicallyCorrectLights = true;
    stage.appendChild(renderer.domElement);

    var scene = new THREE.Scene();
    scene.background = LS8.Textures.sky({
      stops: ["#dfe9f2", "#e8ecf0", "#dde5ee", "#e0e2ef"],
      blobs: [
        [205, 102, 240, "rgba(140,180,225,0.45)"],
        [819, 153, 260, "rgba(120,160,215,0.4)"]
      ]
    });

    var camera = new THREE.PerspectiveCamera(38, stage.clientWidth / stage.clientHeight, 0.1, 80);
    camera.position.set(4.5, 4.2, 6.4);

    scene.add(new THREE.HemisphereLight(0xfff2df, 0x8a7f66, 1.0));
    var sun = new THREE.DirectionalLight(0xffffff, 1.5);
    sun.position.set(4.5, 8, 3.5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(softGL ? 1024 : 2048, softGL ? 1024 : 2048);
    sun.shadow.camera.left = -6.5; sun.shadow.camera.right = 6.5;
    sun.shadow.camera.top = 6.5; sun.shadow.camera.bottom = -6.5;
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 22;
    sun.shadow.bias = -0.0004;
    scene.add(sun);
    scene.add(new THREE.AmbientLight(0xffffff, 0.18));

    var desk = new THREE.Mesh(
      new THREE.PlaneGeometry(46, 46),
      new THREE.MeshStandardMaterial({ map: LS8.Textures.wood(), roughness: 0.92 })
    );
    desk.rotation.x = -Math.PI / 2;
    desk.receiveShadow = true;
    scene.add(desk);

    var topMat = new THREE.MeshStandardMaterial({
      map: LS8.Textures.mat({ a: "#1a2c3e", b: "#13212f", grid: "rgba(130,170,200,0.14)", grid2: "rgba(140,180,210,0.24)", tick: "rgba(190,215,235,0.4)", title: "IBM 5150 BENCH MAT · 60 x 40" }),
      roughness: 0.82
    });
    var sideMat = new THREE.MeshStandardMaterial({ color: 0x0f1a26, roughness: 0.85 });
    var matMesh = new THREE.Mesh(new THREE.BoxGeometry(7.3, 0.09, 4.8),
      [sideMat, sideMat, topMat, sideMat, sideMat, sideMat]);
    matMesh.position.y = 0.048;
    matMesh.rotation.y = 0.045;
    matMesh.receiveShadow = true;
    matMesh.castShadow = true;
    scene.add(matMesh);

    /* ---- 共享材质 ---- */
    M.plastic = new THREE.MeshStandardMaterial({ color: 0x1d1f26, roughness: 0.85 });
    M.dark = new THREE.MeshStandardMaterial({ color: 0x2a2d36, roughness: 0.8 });
    M.silver = new THREE.MeshStandardMaterial({ color: 0xc9cdd4, metalness: 0.75, roughness: 0.32 });
    M.alu = new THREE.MeshStandardMaterial({ color: 0xd8dade, metalness: 0.6, roughness: 0.4 });
    M.gold = new THREE.MeshStandardMaterial({ color: 0xc9a24b, metalness: 0.85, roughness: 0.35 });
    M.navy = new THREE.MeshStandardMaterial({ color: 0x2a3a66, roughness: 0.5 });
    M.pink = new THREE.MeshStandardMaterial({ color: 0xe84f8e, roughness: 0.5 });
    M.white = new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 0.4 });
    M.chip = new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.4, metalness: 0.2 });
    M.teal = new THREE.MeshStandardMaterial({
      map: LS8.Textures.pcb("#2e6e62", "rgba(104,182,158,0.42)", "IBM 5150", "PERSONAL COMPUTER · PLANAR"),
      roughness: 0.62
    });

    /* ---- 5150 主板（静态） ---- */
    var boardGroup = new THREE.Group();
    boardGroup.position.set(0.1, 0.095, 0.08);
    boardGroup.rotation.y = 0.03;
    var g = boardGroup;

    g.add(mesh(new THREE.BoxGeometry(2.5, 0.04, 1.62), M.teal, 0, 0.02, 0));

    // RAM 插座：4 组 × 9 座（与 bank 零件对齐）
    for (var b = 0; b < 4; b++) {
      for (var c = 0; c < 9; c++) {
        g.add(mesh(new THREE.BoxGeometry(0.11, 0.02, 0.055), M.dark, 0.93 + c * 0.12, 0.05, -0.62 + b * 0.11));
      }
    }
    // 5 个 ISA 插槽（立式黑色连接器，沿后缘）
    for (var s = 0; s < 5; s++) {
      g.add(mesh(new THREE.BoxGeometry(0.16, 0.24, 0.05), M.plastic, -1.05 + s * 0.44, 0.16, -0.62));
    }
    // DIN 键盘座 + 磁带 DIN（后缘左，ISA 槽位外侧）
    g.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 12), M.plastic, -1.25, 0.055, -0.62).rotateX(Math.PI / 2));
    g.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.045, 10), M.plastic, -1.42, 0.05, -0.62).rotateX(Math.PI / 2));
    // 电源插头 ×2（后缘右）
    g.add(mesh(new THREE.BoxGeometry(0.16, 0.06, 0.08), M.plastic, 1.1, 0.05, -0.58));
    g.add(mesh(new THREE.BoxGeometry(0.16, 0.06, 0.08), M.plastic, 1.28, 0.05, -0.58));
    // 扬声器接线头
    g.add(mesh(new THREE.BoxGeometry(0.06, 0.045, 0.05), M.dark, 1.0, 0.05, 0.55));
    // 小散件
    for (var i = 0; i < 12; i++) {
      g.add(mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.03, 8), M.dark, -0.9 + (i % 6) * 0.36, 0.05, 0.3 + Math.floor(i / 6) * 0.14));
    }

    scene.add(boardGroup);

    LS8.Scene3D = {
      scene: scene, camera: camera, renderer: renderer,
      board: boardGroup, mesh: mesh, M: M,
      setFanSpeed: function () { /* 无旋转件 */ }
    };
  }

  function update() { /* 无 */ }

  LS8.SceneInit = init;
  LS8.SceneUpdate = update;
})(window.LS8 = window.LS8 || {});
