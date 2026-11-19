/* 仪表盘：POST 内存计数 · ISA 插卡 · 8088 · BOOT 文字屏 */
(function (LS8) {
  var ctxBoot;
  var bw, bh;
  var dom = {};

  function mkCanvas(id, h) {
    var c = document.getElementById(id);
    var w = c.clientWidth || 200;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = w * dpr; c.height = h * dpr;
    c.style.height = h + "px";
    var ctx = c.getContext("2d");
    ctx.scale(dpr, dpr);
    return { ctx: ctx, w: w, h: h };
  }

  function buildDOM() {
    document.getElementById("dash").innerHTML =
      '<section class="panel"><header><i class="dot" style="background:#5b8cff"></i><b>内存计数</b><span class="meta">POST · 4 BANKS x 9 x 4116</span></header>' +
      '<div class="body"><div style="display:flex;align-items:center;gap:10px">' +
      '<div style="font-size:26px;font-weight:800;line-height:1" id="mem-kb">0</div>' +
      '<div style="font-size:9px;color:rgba(232,228,216,.6)">KB<br>OK</div>' +
      '<div style="flex:1;display:grid;grid-template-columns:repeat(9,1fr);gap:2px" id="mem-grid"></div>' +
      '</div>' +
      '<div class="axis"><span id="mem-bank">待测 —</span><span id="mem-test">—</span></div></div></section>' +

      '<section class="panel"><header><i class="dot" style="background:#e8c53c"></i><b>ISA 插槽 × 5</b><span class="meta">62 PIN CARD EDGE</span></header>' +
      '<div class="body"><div id="isa-rows"></div></div></section>' +

      '<section class="panel"><header><i class="dot" style="background:#57c46b"></i><b>处理器 8088</b><span class="meta">4.77 MHZ · 14.318 / 3</span></header>' +
      '<div class="body"><div class="iq-stats" style="height:80px">' +
      '<div class="r"><span>CS:IP</span><b id="cpu-ip">F000:FFF0</b></div>' +
      '<div class="r"><span>AX</span><b id="cpu-ax">0000</b></div>' +
      '<div class="r"><span>SP</span><b id="cpu-sp">0000</b></div>' +
      '<div class="r"><span>节拍 TICKS</span><b id="cpu-tk">000000</b></div>' +
      '<div class="iq-chips" style="margin-top:auto"><span class="chip" id="ch-post">POST</span><span class="chip" id="ch-beep">BEEP</span><span class="chip" id="ch-boot">BOOT</span></div>' +
      '</div></div></section>' +

      '<section class="panel"><header><i class="dot" style="background:#e84f8e"></i><b>启动屏幕</b><span class="meta">BIOS · CASSETTE BASIC</span></header>' +
      '<div class="body"><canvas id="c-boot"></canvas></div></section>';

    // 内存芯片网格 36 格
    var grid = document.getElementById("mem-grid");
    for (var i = 0; i < 36; i++) {
      var cell = document.createElement("div");
      cell.style.cssText = "height:8px;border-radius:2px;background:rgba(232,228,216,.12)";
      grid.appendChild(cell);
    }

    var rows = document.getElementById("isa-rows");
    ["MDA VIDEO", "FLOPPY CTRL", "空置", "空置", "空置"].forEach(function (n, i) {
      var row = document.createElement("div");
      row.className = "rail-row";
      row.innerHTML = '<span class="name">槽位 ' + (i + 1) + '</span><span class="bar"><i id="isa-' + i + '"></i></span><span class="val" id="isan-' + i + '">' + n + '</span>';
      rows.appendChild(row);
    });

    var b = mkCanvas("c-boot", 92); ctxBoot = b.ctx; bw = b.w; bh = b.h;

    dom = {
      memKb: document.getElementById("mem-kb"),
      cells: grid.children,
      memBank: document.getElementById("mem-bank"), memTest: document.getElementById("mem-test"),
      isaRows: [0, 1, 2, 3, 4].map(function (i) { return document.getElementById("isa-" + i); }),
      isaNames: [0, 1, 2, 3, 4].map(function (i) { return document.getElementById("isan-" + i); }),
      ip: document.getElementById("cpu-ip"), ax: document.getElementById("cpu-ax"),
      sp: document.getElementById("cpu-sp"), tk: document.getElementById("cpu-tk"),
      post: document.getElementById("ch-post"), beep: document.getElementById("ch-beep"), boot: document.getElementById("ch-boot")
    };
  }

  var bootLines = [];
  function bootType(line) {
    bootLines.push(line);
    if (LS8.Audio) LS8.Audio.play("type");
    if (bootLines.length > 6) bootLines.shift();
  }
  function bootClear() { bootLines = []; }

  function drawBoot(st) {
    var ctx = ctxBoot, W = bw, H = bh;
    ctx.fillStyle = "#05070b";
    ctx.fillRect(0, 0, W, H);
    if (!st.bootOn) {
      ctx.fillStyle = "rgba(232,228,216,0.18)";
      ctx.font = "9px monospace";
      ctx.fillText(st.postOn ? "MEMORY TEST ..." : "— POWER OFF —", 10, H / 2);
      return;
    }
    ctx.fillStyle = "#e8e4d8";
    ctx.font = "10px monospace";
    bootLines.forEach(function (ln, i) {
      ctx.fillText(ln, 8, 16 + i * 13);
    });
    if (Math.sin(st.time * 6) > 0 && st.bootOn) {
      ctx.fillStyle = "#e8e4d8";
      var y = 16 + Math.min(bootLines.length, 6) * 13 - 3;
      ctx.fillText("█", 8, y);
    }
  }

  function update(st, dt) {
    drawBoot(st);
    dom.memKb.textContent = Math.floor(st.memKb);
    for (var i = 0; i < 36; i++) {
      dom.cells[i].style.background = i < st.memKb ? "#5b8cff" : "rgba(232,228,216,.12)";
    }
    var bank = Math.min(4, Math.floor(st.memKb / 16) + 1);
    dom.memBank.textContent = st.postOn ? "测试第 " + bank + " / 4 组" : "待测 —";
    dom.memTest.textContent = st.postOn ? "读写校验通过 @" + (Math.floor(st.memKb * 1024)).toString(16).toUpperCase() : "—";

    var cardNames = ["MDA VIDEO", "FLOPPY CTRL"];
    for (var s = 0; s < 5; s++) {
      var filled = s < st.cardFill;
      dom.isaRows[s].style.width = filled ? "100%" : "0%";
      dom.isaRows[s].style.background = filled ? ["#57c46b", "#e84f8e"][s] : "transparent";
      dom.isaNames[s].textContent = filled ? cardNames[s] : "空置";
      dom.isaNames[s].style.color = filled ? "#f2eee2" : "rgba(232,228,216,0.4)";
    }

    dom.ip.textContent = "F000:" + st.ip.toString(16).toUpperCase().padStart(4, "0");
    dom.ax.textContent = st.ax.toString(16).toUpperCase().padStart(4, "0");
    dom.sp.textContent = st.sp.toString(16).toUpperCase().padStart(4, "0");
    dom.tk.textContent = String(Math.floor(st.ticks)).padStart(6, "0");
    dom.post.className = "chip" + (st.postOn ? " on" : "");
    dom.beep.className = "chip" + (st.beep ? " lock" : "");
    dom.boot.className = "chip" + (st.bootOn ? " on" : "");
  }

  LS8.Dashboard = {
    build: buildDOM,
    update: update,
    bootType: bootType,
    bootClear: bootClear
  };
})(window.LS8 = window.LS8 || {});
