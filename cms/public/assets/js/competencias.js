/* Trilha das competências: os cartões são HTML do servidor; a linha que os liga é
   calculada em SVG a partir da posição real de cada número. Usa só transform,
   opacity e stroke-dashoffset. A classe orgr--pronto, no fim, avisa que o texto
   de reserva não é necessário: se algo falhar antes disso, o texto entra no lugar. */
(function () {
  "use strict";
  var SVGNS = "http://www.w3.org/2000/svg";
  var reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var R = 12;
  var entre = function (v) { return Math.max(0, Math.min(1, v)); };
  var saidaOut = function (t) { return 1 - Math.pow(1 - t, 3); };
  var saidaBack = function (t) { var c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

  document.querySelectorAll("[data-cmp]").forEach(function (raiz) {
    var palco = raiz.querySelector(".cmp__palco");
    var svg = palco.querySelector(".cmp__fios");
    var itens = Array.prototype.map.call(palco.querySelectorAll(".cmp__item"), function (li) {
      return { li: li, num: li.querySelector(".cmp__num"), txt: li.querySelector(".cmp__txt") };
    });
    var fios = [], raf = 0, montado = false, iniciado = false, visivel = false;

    function caixa(el) { // offset* ignora o transform da animação
      var x = 0, y = 0, e = el;
      while (e && e !== palco) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; }
      var w = el.offsetWidth, h = el.offsetHeight;
      return { l: x, t: y, r: x + w, b: y + h, cx: x + w / 2, cy: y + h / 2 };
    }

    /* Trecho entre dois números, sem o "M" inicial: assim os trechos se emendam
       num caminho só, e o pulso percorre a trilha inteira sem reiniciar. */
    function trecho(a, b, fimDaLinha, W) {
      if (Math.abs(a.cy - b.cy) < 2) return "H" + b.cx;
      if (Math.abs(a.cx - b.cx) < 2) return "V" + b.cy;
      var dir = W - 9, esq = 9, meio = (fimDaLinha + caixa(b.el.parentNode).t) / 2;
      return "H" + (dir - R) + "Q" + dir + "," + a.cy + " " + dir + "," + (a.cy + R) +
        "V" + (meio - R) + "Q" + dir + "," + meio + " " + (dir - R) + "," + meio +
        "H" + (esq + R) + "Q" + esq + "," + meio + " " + esq + "," + (meio + R) +
        "V" + (b.cy - R) + "Q" + esq + "," + b.cy + " " + (esq + R) + "," + b.cy + "H" + b.cx;
    }

    function desenhar() {
      var W = palco.scrollWidth, H = palco.scrollHeight;
      svg.setAttribute("viewBox", "0 0 " + W + " " + H);
      svg.setAttribute("width", W);
      svg.setAttribute("height", H);
      svg.style.width = W + "px";
      svg.style.height = H + "px";
      svg.innerHTML = "";
      fios = [];

      var pos = itens.map(function (it) {
        var c = caixa(it.num);
        c.el = it.num;
        c.base = caixa(it.li).b;
        return c;
      });
      var inicio = "M" + pos[0].cx + "," + pos[0].cy, corpo = "";
      for (var i = 0; i < pos.length - 1; i++) {
        var a = pos[i];
        var fimDaLinha = Math.max.apply(null, pos.filter(function (p) { return Math.abs(p.cy - a.cy) < 2; }).map(function (p) { return p.base; }));
        var t = trecho(a, pos[i + 1], fimDaLinha, W);
        corpo += t;
        var base = document.createElementNS(SVGNS, "path");
        base.setAttribute("d", "M" + a.cx + "," + a.cy + t);
        base.setAttribute("class", "cmp__fio");
        svg.appendChild(base);
        var compr = base.getTotalLength();
        base.style.strokeDasharray = compr + " " + compr;
        base.style.strokeDashoffset = montado ? 0 : compr;
        fios.push({ el: base, compr: compr });
      }
      var pulso = document.createElementNS(SVGNS, "path");
      pulso.setAttribute("d", inicio + corpo);
      pulso.setAttribute("class", "cmp__pulso");
      pulso.setAttribute("pathLength", "1000");
      svg.appendChild(pulso);
    }

    function preparar() {
      itens.forEach(function (it) {
        it.num.style.opacity = 0;
        it.num.style.transform = "scale(.4)";
        it.txt.style.opacity = 0;
        it.txt.style.transform = "translateY(14px)";
      });
    }
    function concluir() {
      raf = 0;
      montado = true;
      itens.forEach(function (it) {
        it.num.style.opacity = it.num.style.transform = it.txt.style.opacity = it.txt.style.transform = "";
      });
      fios.forEach(function (f) { f.el.style.strokeDashoffset = 0; });
      atualizarFluxo();
    }
    function tocar() {
      if (reduzir) { montado = true; desenhar(); return; }
      cancelAnimationFrame(raf);
      montado = false;
      raiz.classList.remove("is-fluindo");
      desenhar();
      preparar();
      var PASSO = 0.27, DUR = 0.45, total = itens.length * PASSO + DUR + 0.2, t0 = performance.now();
      function quadro(agora) {
        var t = (agora - t0) / 1000;
        itens.forEach(function (it, i) {
          var ini = 0.1 + i * PASSO;
          var q = entre((t - ini) / DUR), s = saidaBack(q);
          if (q > 0) {
            it.num.style.opacity = entre(q * 3);
            it.num.style.transform = "scale(" + (0.4 + 0.6 * s) + ")";
          }
          var r = entre((t - ini - 0.08) / DUR);
          if (r > 0) {
            it.txt.style.opacity = entre(r * 2);
            it.txt.style.transform = "translateY(" + (14 * (1 - saidaOut(r))) + "px)";
          }
          var f = fios[i];
          if (f) f.el.style.strokeDashoffset = f.compr * (1 - saidaOut(entre((t - ini - 0.1) / PASSO)));
        });
        if (t < total) raf = requestAnimationFrame(quadro); else concluir();
      }
      raf = requestAnimationFrame(quadro);
    }

    function atualizarFluxo() { raiz.classList.toggle("is-fluindo", montado && visivel && !reduzir); }

    var repetir = raiz.querySelector("[data-cmp-repetir]");
    if (repetir) {
      if (reduzir) repetir.hidden = true;
      repetir.addEventListener("click", tocar);
    }

    new IntersectionObserver(function (e) {
      visivel = e[0].isIntersecting;
      if (visivel && !iniciado) { iniciado = true; tocar(); }
      atualizarFluxo();
    }, { threshold: 0.05 }).observe(palco);

    var largura = raiz.clientWidth;
    new ResizeObserver(function () {
      if (raiz.clientWidth === largura) return;
      largura = raiz.clientWidth;
      if (raf) { cancelAnimationFrame(raf); concluir(); }
      desenhar();
    }).observe(raiz);

    if (!reduzir) preparar();
    desenhar();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (!raf) desenhar(); });
    raiz.classList.add("orgr--pronto");
  });
})();
