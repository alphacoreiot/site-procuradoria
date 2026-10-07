/*
 * Motion design das seções (scroll effects).
 *  • Títulos de seção: palavras sobem com máscara ao entrar na tela.
 *  • Varredura: faixas da marca cruzam o topo de cada seção conforme a rolagem.
 *  • Parallax: abertura e seção "Nossos sistemas".
 *  • "Quem somos": palavra gigante em deriva, linha do tempo de Missão/Visão/
 *    Valores preenchida pela rolagem e cartões que chegam girando + tilt 3D.
 * Tudo em requestAnimationFrame, só transform/opacity; desligado com
 * prefers-reduced-motion.
 */
(function () {
  "use strict";

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var doc = document.documentElement;
  doc.classList.add("motion");

  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function outCubic(t) { return 1 - Math.pow(1 - t, 3); }
  var scrubs = [];   // funções chamadas a cada quadro com a rolagem
  var vh = window.innerHeight;

  // --- 1. Títulos: palavras com máscara -------------------------------------
  var heads = document.querySelectorAll(".section__head, .about__copy, .cta-band__inner > div");
  heads.forEach(function (head) {
    var h2 = head.querySelector("h2");
    if (!h2 || h2.dataset.split) return;
    h2.dataset.split = "1";
    var words = h2.textContent.trim().split(/\s+/);
    h2.setAttribute("aria-label", words.join(" "));
    h2.textContent = "";
    words.forEach(function (w, i) {
      var outer = document.createElement("span");
      outer.className = "w";
      outer.setAttribute("aria-hidden", "true");
      var inner = document.createElement("span");
      inner.textContent = w;
      inner.style.setProperty("--i", i);
      outer.appendChild(inner);
      h2.appendChild(outer);
      if (i < words.length - 1) h2.appendChild(document.createTextNode(" "));
    });
    head.classList.add("m-head");
  });
  if ("IntersectionObserver" in window) {
    var hio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-in"); hio.unobserve(e.target); }
      });
    }, { threshold: 0.35 });
    document.querySelectorAll(".m-head").forEach(function (h) { hio.observe(h); });
  } else {
    document.querySelectorAll(".m-head").forEach(function (h) { h.classList.add("is-in"); });
  }

  // --- 2. Varredura das faixas da marca no topo de cada seção ----------------
  document.querySelectorAll("main > .section").forEach(function (sec) {
    var sw = document.createElement("div");
    sw.className = "sweep";
    sw.setAttribute("aria-hidden", "true");
    ["vermelho", "verde", "laranja", "roxo"].forEach(function (c) {
      var s = document.createElement("span");
      s.className = "s-" + c;
      sw.appendChild(s);
    });
    sec.insertBefore(sw, sec.firstChild);
    var bars = sw.children;
    scrubs.push(function () {
      var r = sec.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      var p = clamp((vh - r.top) / (vh * 0.75));
      for (var i = 0; i < bars.length; i++) {
        var k = outCubic(clamp(p * 1.35 - i * 0.12));
        bars[i].style.transform = "scaleX(" + k.toFixed(4) + ")";
      }
    });
  });

  // --- 3. Parallax ------------------------------------------------------------
  var heroTrack = document.querySelector(".hero .carousel__track");
  var heroCtrl = document.querySelector(".hero .carousel__controls");
  if (heroTrack) {
    scrubs.push(function () {
      var y = window.scrollY;
      if (y > vh * 1.2) return;
      var k = Math.min(y / (vh * 0.8), 1);
      heroTrack.style.transform = "translate3d(0," + (y * 0.28).toFixed(1) + "px,0)";
      heroTrack.style.opacity = String(1 - k * 0.85);
      if (heroCtrl) heroCtrl.style.opacity = String(1 - k);
    });
  }
  var sys = document.getElementById("sistemas");
  var sysSlants = sys && sys.querySelector(".slants");
  if (sysSlants) {
    scrubs.push(function () {
      var r = sys.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      var p = (vh - r.top) / (vh + r.height);
      sysSlants.style.transform = "translate3d(" + ((0.5 - p) * 160).toFixed(1) + "px," + ((0.5 - p) * 60).toFixed(1) + "px,0)";
    });
  }

  // --- 4. "Quem somos" ----------------------------------------------------------
  var about = document.getElementById("sobre");
  if (about) {
    about.classList.add("m-about");

    // 4a. palavra gigante vazada em deriva
    var big = document.createElement("div");
    big.className = "about__bigword";
    big.setAttribute("aria-hidden", "true");
    big.textContent = "PROCURADORIA · PROGER · PROCURADORIA · PROGER · ";
    about.insertBefore(big, about.firstChild);
    scrubs.push(function () {
      var r = about.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      var p = (vh - r.top) / (vh + r.height);
      big.style.transform = "translate3d(" + (-p * 38).toFixed(2) + "%,0,0)";
    });

    // 4b. linha do tempo de Missão / Visão / Valores
    var mvv = about.querySelector(".mvv");
    if (mvv) {
      var rail = document.createElement("span");
      rail.className = "mvv__rail";
      rail.setAttribute("aria-hidden", "true");
      var fill = document.createElement("i");
      rail.appendChild(fill);
      mvv.appendChild(rail);
      var items = Array.prototype.slice.call(mvv.querySelectorAll(".mvv__item"));
      mvv.querySelectorAll(".mvv__values li").forEach(function (li, i) { li.style.setProperty("--i", i); });
      scrubs.push(function () {
        var r = mvv.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh) return;
        var p = clamp((vh * 0.7 - r.top) / r.height);
        fill.style.transform = "scaleY(" + p.toFixed(4) + ")";
        var reach = r.top + p * r.height;
        items.forEach(function (it) {
          it.classList.toggle("is-on", it.getBoundingClientRect().top + 14 <= reach);
        });
      });
    }

    // 4c. cartões chegando pelas laterais
    var pillars = about.querySelector(".pillars");
    if (pillars) {
      pillars.classList.remove("reveal");
      var cards = Array.prototype.slice.call(pillars.children);
      scrubs.push(function () {
        var r = pillars.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        var p = clamp((vh - r.top) / (vh * 0.62));
        cards.forEach(function (li, i) {
          var dir = i % 2 ? 1 : -1;
          var k = outCubic(clamp(p * 1.25 - Math.floor(i / 2) * 0.18));
          li.style.opacity = String(Math.min(1, k * 1.4));
          li.style.transform = "translate3d(" + (dir * (1 - k) * 90).toFixed(1) + "px," + ((1 - k) * 40).toFixed(1) + "px,0) rotate(" + (dir * (1 - k) * 7).toFixed(2) + "deg)";
        });
      });

      // tilt 3D ao passar o mouse
      if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
        pillars.querySelectorAll(".pillar").forEach(function (btn) {
          btn.addEventListener("mousemove", function (e) {
            var b = btn.getBoundingClientRect();
            var x = (e.clientX - b.left) / b.width - 0.5, y = (e.clientY - b.top) / b.height - 0.5;
            btn.style.transform = "perspective(700px) rotateX(" + (-y * 10).toFixed(2) + "deg) rotateY(" + (x * 12).toFixed(2) + "deg) translateY(-3px)";
            btn.style.setProperty("--gx", ((x + 0.5) * 100).toFixed(1) + "%");
            btn.style.setProperty("--gy", ((y + 0.5) * 100).toFixed(1) + "%");
          });
          btn.addEventListener("mouseleave", function () { btn.style.transform = ""; });
        });
      }
    }
  }

  // --- laço: só roda quando há rolagem/redimensionamento ---------------------
  var ticking = false;
  function run() {
    ticking = false;
    for (var i = 0; i < scrubs.length; i++) scrubs[i]();
  }
  function request() {
    if (!ticking) { ticking = true; requestAnimationFrame(run); }
  }
  window.addEventListener("scroll", request, { passive: true });
  window.addEventListener("resize", function () { vh = window.innerHeight; request(); });
  request();
})();
