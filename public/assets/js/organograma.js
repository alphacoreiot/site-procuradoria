/*
 * Organograma animado da PGM (substitui a imagem organograma.png).
 * Cartões em HTML + conexões em SVG calculadas a partir das posições reais
 * dos cartões. Animação de montagem em requestAnimationFrame (só transform,
 * opacity e stroke-dashoffset) e fluxo contínuo nas linhas depois de montado.
 * Uso: PGMOrg.mount(elemento) e PGMOrg.play() / PGMOrg.stop().
 */
(function () {
  "use strict";

  var ORG = {
    chief: "Procurador-Geral",
    // pares [esquerda, direita], na mesma altura (como no organograma oficial)
    staff: [
      [{ name: "Conselho de Procuradores", c: "verde" },
       { name: "Comissões Permanentes", c: "verde",
         children: ["CP de Estudos e Informações Jurídicas", "CP de Precatórios e Requisição de Pequenos Valores"] }],
      [{ name: "Diretoria de Tecnologia da Informação", c: "laranja" },
       { name: "Grupo de Apoio ao Executivo Fiscal", c: "roxo" }],
      [{ name: "Assessoria Técnica", c: "laranja" },
       { name: "Assessoria do Procurador Geral", c: "roxo" }]
    ],
    sub: "Sub-Procurador Geral",
    group: "Procuradorias Especiais",
    units: [
      { s: "PROAD", n: "Procuradoria Administrativa", c: "roxo" },
      { s: "PCCT", n: "Procuradoria do Contencioso, Cível e Trabalhista", c: "vermelho" },
      { s: "PROFIS", n: "Procuradoria Fiscal e Tributária", c: "verde" },
      { s: "PROAES", n: "Procuradoria de Ações Estratégicas", c: "grafite" }
    ],
    cda: { s: "CDA", n: "Coordenadoria da Dívida Ativa", c: "laranja" }
  };

  var SVGNS = "http://www.w3.org/2000/svg";
  var root, stage, svg, nodes = [], wires = [], raf = null, ro = null;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var built = false, t0 = 0, compact = false;

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  function node(kind, title, opts) {
    opts = opts || {};
    var n = el("div", "org__node org__node--" + kind);
    n.tabIndex = 0;
    if (opts.c) n.style.setProperty("--c", "var(--org-" + opts.c + ")");
    if (opts.sigla) {
      n.appendChild(el("strong", "org__sigla", opts.sigla));
      n.appendChild(el("span", "org__name", title));
    } else {
      n.appendChild(el("span", "org__name", title));
    }
    if (opts.children) {
      var ul = el("ul", "org__subs");
      opts.children.forEach(function (c) { ul.appendChild(el("li", null, c)); });
      n.appendChild(ul);
    }
    n.setAttribute("aria-label", (opts.sigla ? opts.sigla + " — " : "") + title +
      (opts.parent ? ". Vinculado a: " + opts.parent : "") +
      (opts.children ? ". Inclui: " + opts.children.join("; ") : ""));
    nodes.push({ el: n, parent: opts.parentNode || null, delay: 0 });
    return n;
  }
  function rec(n) { return nodes[nodes.length - 1]; }

  function build() {
    root.innerHTML = "";
    nodes = []; wires = [];

    stage = el("div", "org__stage");
    svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("class", "org__wires");
    svg.setAttribute("aria-hidden", "true");
    stage.appendChild(svg);

    var chiefEl = node("chief", ORG.chief);
    var chief = rec();
    var top = el("div", "org__row org__row--chief"); top.appendChild(chiefEl); stage.appendChild(top);

    var staff = el("div", "org__staff");
    ORG.staff.forEach(function (pair) {
      pair.forEach(function (s, side) {
        var n = node("staff", s.name, { c: s.c, children: s.children, parent: ORG.chief, parentNode: chief });
        rec().side = side ? "r" : "l";
        rec().kind = "staff";
        n.classList.add(side ? "is-right" : "is-left");
        staff.appendChild(n);
      });
    });
    stage.appendChild(staff);

    var subEl = node("sub", ORG.sub, { parent: ORG.chief, parentNode: chief });
    var sub = rec(); sub.kind = "sub";
    var mid = el("div", "org__row org__row--sub"); mid.appendChild(subEl); stage.appendChild(mid);

    var bottom = el("div", "org__bottom");
    var group = el("div", "org__group");
    var gEl = node("group", ORG.group, { parent: ORG.sub, parentNode: sub });
    var g = rec(); g.kind = "group";
    group.appendChild(gEl);
    var units = el("div", "org__units");
    ORG.units.forEach(function (u) {
      units.appendChild(node("unit", u.n, { sigla: u.s, c: u.c, parent: ORG.group, parentNode: g }));
      rec().kind = "unit";
    });
    group.appendChild(units);
    bottom.appendChild(group);
    var cdaWrap = el("div", "org__cda");
    cdaWrap.appendChild(node("unit", ORG.cda.n, { sigla: ORG.cda.s, c: ORG.cda.c, parent: ORG.sub, parentNode: sub }));
    rec().kind = "unit";
    bottom.appendChild(cdaWrap);
    stage.appendChild(bottom);

    root.appendChild(stage);

    var foot = el("p", "org__foot");
    var replay = el("button", "org__replay", "Repetir animação");
    replay.type = "button";
    replay.addEventListener("click", function () { play(true); });
    var link = el("a", "org__img", "Ver organograma em imagem");
    link.href = "assets/img/organograma-pgm.png"; // gerada a partir desta animação (3x)
    link.target = "_blank"; link.rel = "noopener";
    foot.appendChild(replay); foot.appendChild(link);
    root.appendChild(foot);

    // destaque do caminho até o Procurador-Geral
    nodes.forEach(function (n) {
      function on() { light(n, true); }
      function off() { light(n, false); }
      if (canHover) {                       // em tela de toque o destaque "grudaria"
        n.el.addEventListener("mouseenter", on);
        n.el.addEventListener("mouseleave", off);
      }
      n.el.addEventListener("focus", on);
      n.el.addEventListener("blur", off);
    });

    built = true;
  }

  // ---- geometria das conexões ------------------------------------------------
  function box(e) {
    var s = stage.getBoundingClientRect(), r = e.getBoundingClientRect();
    return { l: r.left - s.left, t: r.top - s.top, r: r.right - s.left, b: r.bottom - s.top,
             cx: (r.left + r.right) / 2 - s.left, cy: (r.top + r.bottom) / 2 - s.top };
  }
  var R = 12; // raio das curvas
  function elbowDown(x1, y1, x2, y2, my) {          // desce, vira, desce
    if (Math.abs(x2 - x1) < 1) return "M" + x1 + "," + y1 + "V" + y2;
    var d = x2 > x1 ? 1 : -1, r = Math.min(R, Math.abs(x2 - x1) / 2, (y2 - my), (my - y1));
    return "M" + x1 + "," + y1 + "V" + (my - r) + "Q" + x1 + "," + my + " " + (x1 + d * r) + "," + my +
           "H" + (x2 - d * r) + "Q" + x2 + "," + my + " " + x2 + "," + (my + r) + "V" + y2;
  }
  function rail(x1, y1, x2, y2) {                    // desce pelo trilho e entra pela esquerda
    var r = Math.min(R, (y2 - y1) / 2, (x2 - x1) / 2);
    return "M" + x1 + "," + y1 + "V" + (y2 - r) + "Q" + x1 + "," + y2 + " " + (x1 + r) + "," + y2 + "H" + x2;
  }

  function addWire(d, from, to, start, dur) {
    var p = document.createElementNS(SVGNS, "path");
    p.setAttribute("d", d);
    p.setAttribute("class", "org__wire");
    var f = document.createElementNS(SVGNS, "path");
    f.setAttribute("d", d);
    f.setAttribute("class", "org__flow");
    svg.appendChild(p); svg.appendChild(f);
    var len = p.getTotalLength();
    var w = { p: p, f: f, len: len, from: from, to: to, start: start, dur: dur };
    wires.push(w);
    return w;
  }

  function layout() {
    if (!built) return;
    compact = root.clientWidth < 760;
    root.classList.toggle("org--compact", compact);
    svg.innerHTML = "";
    wires = [];
    var W = stage.scrollWidth, H = stage.scrollHeight;
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("width", W); svg.setAttribute("height", H);
    svg.style.width = W + "px"; svg.style.height = H + "px"; // o CSS global reduz <svg> a 1em

    var chief = nodes[0], sub = nodes.filter(function (n) { return n.kind === "sub"; })[0];
    var group = nodes.filter(function (n) { return n.kind === "group"; })[0];
    var staff = nodes.filter(function (n) { return n.kind === "staff"; });
    var units = nodes.filter(function (n) { return n.kind === "unit"; });
    var cB = box(chief.el), sB = box(sub.el), gB = box(group.el);

    // linha do tempo (ms)
    var SPINE0 = 260, SPINE = 1000;
    chief.delay = 0;
    var spineX = compact ? cB.l + 22 : cB.cx;
    var spineY0 = cB.b, spineY1 = sB.t;
    addWire("M" + spineX + "," + spineY0 + "V" + spineY1, chief, sub, SPINE0, SPINE);
    function atSpine(y) { return SPINE0 + SPINE * Math.max(0, Math.min(1, (y - spineY0) / (spineY1 - spineY0))); }

    staff.forEach(function (n) {
      var b = box(n.el), st = atSpine(b.cy);
      var d = compact ? rail(spineX, b.cy - 0.01, b.l, b.cy)
                      : "M" + spineX + "," + b.cy + "H" + (n.side === "l" ? b.r : b.l);
      addWire(d, chief, n, st, 360);
      n.delay = st + 220;
    });
    sub.delay = SPINE0 + SPINE - 80;

    var S2 = sub.delay + 260;
    var cda = units[units.length - 1];
    [group, cda].forEach(function (n, i) {
      var b = box(n.el);
      var d = compact ? rail(sB.l + 22, sB.b, b.l, b.cy)
                      : elbowDown(sB.cx, sB.b, b.cx, b.t, sB.b + (Math.min(gB.t, box(cda.el).t) - sB.b) / 2);
      addWire(d, sub, n, S2 + i * 120, 480);
      n.delay = S2 + i * 120 + 380;
    });

    var S3 = group.delay + 220;
    units.slice(0, -1).forEach(function (n, i) {
      var b = box(n.el);
      var firstTop = box(units[0].el).t;
      var d = compact ? rail(gB.l + 22, gB.b, b.l, b.cy)
                      : elbowDown(gB.cx, gB.b, b.cx, b.t, gB.b + (firstTop - gB.b) / 2);
      addWire(d, group, n, S3 + i * 110, 460);
      n.delay = S3 + i * 110 + 340;
    });
    group.end = S3 + 3 * 110 + 460 + 300;
  }

  // ---- destaque ---------------------------------------------------------------
  function light(n, on) {
    if (!stage) return;
    stage.classList.toggle("is-focus", on);
    nodes.forEach(function (x) { x.el.classList.remove("is-lit"); });
    wires.forEach(function (w) { w.p.classList.remove("is-lit"); w.f.classList.remove("is-lit"); });
    if (!on) return;
    var cur = n;
    while (cur) {
      cur.el.classList.add("is-lit");
      wires.forEach(function (w) {
        if (w.to === cur) { w.p.classList.add("is-lit"); w.f.classList.add("is-lit"); }
      });
      cur = cur.parent;
    }
  }

  // ---- animação ---------------------------------------------------------------
  function outBack(t) { var c = 1.4; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }
  function outCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  function frame(now) {
    var t = now - t0, done = true;
    nodes.forEach(function (n) {
      var k = clamp((t - n.delay) / 520);
      if (k < 1) done = false;
      var e = outBack(k);
      n.el.style.opacity = String(outCubic(k));
      n.el.style.transform = "translate3d(0," + ((1 - e) * 18).toFixed(2) + "px,0) scale(" + (0.94 + 0.06 * e).toFixed(4) + ")";
    });
    wires.forEach(function (w) {
      var k = clamp((t - w.start) / w.dur);
      if (k < 1) done = false;
      w.p.style.strokeDashoffset = (w.len * (1 - outCubic(k))).toFixed(2);
    });
    if (done) { finish(); return; }
    raf = requestAnimationFrame(frame);
  }

  function finish() {
    raf = null;
    nodes.forEach(function (n) { n.el.style.opacity = ""; n.el.style.transform = ""; });
    wires.forEach(function (w) { w.p.style.strokeDasharray = ""; w.p.style.strokeDashoffset = ""; });
    root.classList.add("is-flowing");
  }

  function play(force) {
    if (!built) return;
    stop();
    layout();
    root.classList.remove("is-flowing");
    if (reduce) { finish(); return; }
    nodes.forEach(function (n) { n.el.style.opacity = "0"; });
    wires.forEach(function (w) {
      w.p.style.strokeDasharray = w.len + " " + w.len;
      w.p.style.strokeDashoffset = w.len;
    });
    t0 = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = null;
  }

  function mount(target) {
    root = target;
    if (!built) build();
    if (!ro && "ResizeObserver" in window) {
      var last = 0;
      ro = new ResizeObserver(function () {
        if (root.hidden || Math.abs(root.clientWidth - last) < 2) return;
        last = root.clientWidth;
        var animating = raf !== null;
        if (animating) play(); else { layout(); root.classList.add("is-flowing"); }
      });
      ro.observe(root);
    }
  }

  window.PGMOrg = { mount: mount, play: play, stop: stop };
})();
