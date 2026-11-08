/* Organograma com ramos: os cartões são HTML do servidor; aqui as ligações são
   calculadas em SVG a partir da posição real de cada cartão. A montagem usa só
   transform, opacity e stroke-dashoffset em requestAnimationFrame. Depois de
   montado, as linhas têm fluxo contínuo (só enquanto estiverem visíveis).
   Sem JavaScript o organograma aparece completo, apenas sem as ligações. */
(function () {
  "use strict";
  var SVGNS = "http://www.w3.org/2000/svg";
  var reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var temHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var R = 12;

  function curva(x1, y1, x2, y2, meio) { // desce, vira, desce
    if (Math.abs(x2 - x1) < 1) return "M" + x1 + "," + y1 + "V" + y2;
    var d = x2 > x1 ? 1 : -1;
    var r = Math.min(R, Math.abs(x2 - x1) / 2, y2 - meio, meio - y1);
    return "M" + x1 + "," + y1 + "V" + (meio - r) + "Q" + x1 + "," + meio + " " + (x1 + d * r) + "," + meio +
      "H" + (x2 - d * r) + "Q" + x2 + "," + meio + " " + x2 + "," + (meio + r) + "V" + y2;
  }
  function direitaDesce(x1, y1, x2, y2) { // sai para o lado e desce
    var r = Math.min(R, y2 - y1, Math.abs(x2 - x1));
    return "M" + x1 + "," + y1 + "H" + (x2 - r) + "Q" + x2 + "," + y1 + " " + x2 + "," + (y1 + r) + "V" + y2;
  }
  function trilho(x, y1, y2, x2) { // desce pelo trilho e entra pela esquerda
    var r = Math.min(R, (y2 - y1) / 2, (x2 - x) / 2);
    return "M" + x + "," + y1 + "V" + (y2 - r) + "Q" + x + "," + y2 + " " + (x + r) + "," + y2 + "H" + x2;
  }
  var saidaOut = function (t) { return 1 - Math.pow(1 - t, 3); };
  var saidaBack = function (t) { var c = 1.4; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
  var entre = function (v) { return Math.max(0, Math.min(1, v)); };

  document.querySelectorAll("[data-orgr]").forEach(function (raiz, indice) {
    var palco = raiz.querySelector(".orgr__palco");
    var svg = palco.querySelector(".orgr__fios");
    var nos = {}, lista = [];
    palco.querySelectorAll("[data-no]").forEach(function (el) {
      var n = { id: el.getAttribute("data-no"), pai: el.getAttribute("data-pai"), tipo: el.getAttribute("data-tipo") || "sub", rota: el.getAttribute("data-rota") || "", el: el, atraso: 0 };
      nos[n.id] = n;
      lista.push(n);
    });
    var titular = lista[0];
    var fios = [], raf = 0, montado = false, iniciado = false, visivel = false;

    // usa offset*, que ignora o transform da animação: a posição é a final
    function caixa(el) {
      var x = 0, y = 0, e = el;
      while (e && e !== palco) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; }
      var w = el.offsetWidth, h = el.offsetHeight;
      return { l: x, t: y, r: x + w, b: y + h, cx: x + w / 2, cy: y + h / 2 };
    }

    function rota(n, compacto, busRamos) {
      var p = caixa(nos[n.pai].el), c = caixa(n.el);
      if (compacto) {
        var x = p.l + (n.tipo === "col" ? 34 : n.tipo === "ass" ? 22 : 10);
        return trilho(x, p.b, c.cy, c.l);
      }
      if (n.rota === "colegiado") return direitaDesce(p.r, p.cy, c.cx, c.t);
      if (n.rota === "lado") return "M" + p.cx + "," + c.cy + "H" + (c.cx < p.cx ? c.r : c.l);
      if (n.rota === "ramo") return curva(p.cx, p.b, c.cx, c.t, busRamos);
      if (n.rota === "unidade") return curva(p.cx, p.b, c.cx, c.t, (p.b + c.t) / 2);
      return "M" + p.cx + "," + p.b + "V" + c.t;
    }

    function desenhar() {
      var compacto = raiz.clientWidth < 820;
      raiz.classList.toggle("orgr--compacto", compacto);
      var W = palco.scrollWidth, H = palco.scrollHeight;
      svg.setAttribute("viewBox", "0 0 " + W + " " + H);
      svg.setAttribute("width", W);
      svg.setAttribute("height", H);
      svg.style.width = W + "px";
      svg.style.height = H + "px";
      svg.innerHTML = "";
      fios = [];

      var defs = document.createElementNS(SVGNS, "defs");
      svg.appendChild(defs);
      var topos = lista.filter(function (n) { return n.rota === "ramo"; }).map(function (n) { return caixa(n.el).t; });
      var busRamos = topos.length ? Math.min.apply(null, topos) - 24 : 0;

      lista.forEach(function (n, i) {
        if (!n.pai) return;
        var d = rota(n, compacto, busRamos);
        var base = document.createElementNS(SVGNS, "path");
        base.setAttribute("d", d);
        base.setAttribute("class", "orgr__fio orgr__fio--" + n.tipo);
        svg.appendChild(base);

        // a máscara revela a linha sem desfazer o tracejado da assessoria e dos colegiados
        var mid = "orgr-m" + indice + "-" + i;
        var mascara = document.createElementNS(SVGNS, "mask");
        mascara.setAttribute("id", mid);
        mascara.setAttribute("maskUnits", "userSpaceOnUse");
        mascara.setAttribute("x", 0); mascara.setAttribute("y", 0);
        mascara.setAttribute("width", W); mascara.setAttribute("height", H);
        var revela = document.createElementNS(SVGNS, "path");
        revela.setAttribute("d", d);
        revela.setAttribute("fill", "none");
        revela.setAttribute("stroke", "#fff");
        revela.setAttribute("stroke-width", "10");
        mascara.appendChild(revela);
        defs.appendChild(mascara);

        var compr = base.getTotalLength();
        revela.style.strokeDasharray = compr + " " + compr;
        revela.style.strokeDashoffset = montado ? 0 : compr;
        if (!montado) base.setAttribute("mask", "url(#" + mid + ")");

        var pulso = null;
        if (n.tipo === "sub") {
          pulso = document.createElementNS(SVGNS, "path");
          pulso.setAttribute("d", d);
          pulso.setAttribute("class", "orgr__pulso");
          pulso.style.setProperty("--c", getComputedStyle(n.el).getPropertyValue("--c") || "#84329B");
          pulso.style.animationDelay = (-(i % 7) * 0.4) + "s";
          svg.appendChild(pulso);
        }
        var fio = { n: n, base: base, revela: revela, pulso: pulso, compr: compr };
        n.fio = fio;
        fios.push(fio);
      });
    }

    // ---- montagem -----------------------------------------------------------
    function cronograma() {
      var ramo = 0, unidade = 0, lado = 0, col = 0;
      titular.inicio = 0;
      lista.forEach(function (n) {
        if (!n.pai) return;
        var t;
        if (n.tipo === "col") t = 0.55 + 0.16 * col++;
        else if (n.tipo === "ass") t = 0.5 + 0.16 * lado++;
        else if (n.rota === "ramo") t = 1.05 + 0.2 * ramo++;
        else if (n.rota === "unidade") t = 1.75 + 0.13 * unidade++;
        else t = (nos[n.pai].inicio || 0.6) + 0.5; // cadeia dentro da assessoria
        n.inicio = t;
      });
      return 1.75 + 0.13 * unidade + 1;
    }

    function preparar() {
      raiz.classList.add("orgr--animado");
      lista.forEach(function (n) { n.el.style.opacity = 0; n.el.style.transform = "translateY(16px) scale(.94)"; });
    }
    function concluir() {
      raf = 0;
      montado = true;
      lista.forEach(function (n) { n.el.style.opacity = ""; n.el.style.transform = ""; });
      fios.forEach(function (f) { f.revela.style.strokeDashoffset = 0; f.base.removeAttribute("mask"); });
      atualizarFluxo();
    }
    function tocar() {
      if (reduzir) { montado = true; desenhar(); return; }
      cancelAnimationFrame(raf);
      montado = false;
      raiz.classList.remove("is-fluindo");
      desenhar();
      preparar();
      var total = cronograma(), t0 = performance.now(), DUR_FIO = 0.55, DUR_NO = 0.5;
      function quadro(agora) {
        var t = (agora - t0) / 1000;
        lista.forEach(function (n) {
          var fio = n.fio, ini = n.inicio;
          if (fio) {
            var p = saidaOut(entre((t - ini) / DUR_FIO));
            fio.revela.style.strokeDashoffset = fio.compr * (1 - p);
            ini += DUR_FIO * 0.75;
          }
          var q = entre((t - ini) / DUR_NO);
          if (q > 0) {
            n.el.style.opacity = entre(q * 2.2);
            var s = saidaBack(q);
            n.el.style.transform = "translateY(" + (16 * (1 - s)) + "px) scale(" + (0.94 + 0.06 * s) + ")";
          }
        });
        if (t < total) raf = requestAnimationFrame(quadro); else concluir();
      }
      raf = requestAnimationFrame(quadro);
    }

    function atualizarFluxo() { raiz.classList.toggle("is-fluindo", montado && visivel && !reduzir); }

    // ---- destaque do caminho até o titular ------------------------------------
    function acender(n, ligar) {
      palco.classList.toggle("is-foco", ligar);
      var c = n;
      while (c) {
        c.el.classList.toggle("is-aceso", ligar);
        if (c.fio) { c.fio.base.classList.toggle("is-aceso", ligar); }
        c = c.pai ? nos[c.pai] : null;
      }
      if (n === titular) {
        lista.forEach(function (x) {
          if (x.pai === titular.id) {
            x.el.classList.toggle("is-aceso", ligar);
            if (x.fio) x.fio.base.classList.toggle("is-aceso", ligar);
          }
        });
      }
    }
    lista.forEach(function (n) {
      if (temHover) {
        n.el.addEventListener("mouseenter", function () { acender(n, true); });
        n.el.addEventListener("mouseleave", function () { acender(n, false); });
      }
      n.el.addEventListener("focus", function () { acender(n, true); });
      n.el.addEventListener("blur", function () { acender(n, false); });
    });

    raiz.querySelectorAll("[data-legenda]").forEach(function (bt) {
      var tipo = bt.getAttribute("data-legenda");
      function marcar(ligar) {
        palco.classList.toggle("is-foco", ligar);
        lista.forEach(function (n) {
          if (n.tipo !== tipo || !n.pai) return;
          n.el.classList.toggle("is-aceso", ligar);
          if (n.fio) n.fio.base.classList.toggle("is-aceso", ligar);
        });
        titular.el.classList.toggle("is-aceso", ligar);
      }
      if (temHover) {
        bt.addEventListener("mouseenter", function () { marcar(true); });
        bt.addEventListener("mouseleave", function () { marcar(false); });
      }
      bt.addEventListener("focus", function () { marcar(true); });
      bt.addEventListener("blur", function () { marcar(false); });
    });

    var repetir = raiz.querySelector("[data-orgr-repetir]");
    if (repetir) {
      if (reduzir) repetir.hidden = true;
      repetir.addEventListener("click", tocar);
    }

    // ---- início, redimensionamento e pausa fora da tela ---------------------
    var obs = new IntersectionObserver(function (e) {
      visivel = e[0].isIntersecting;
      if (visivel && !iniciado) { iniciado = true; tocar(); }
      atualizarFluxo();
    }, { threshold: 0.05 }); // no celular o organograma é mais alto que a tela
    obs.observe(palco);

    var largura = raiz.clientWidth;
    new ResizeObserver(function () {
      if (raiz.clientWidth === largura) return;
      largura = raiz.clientWidth;
      if (raf) { cancelAnimationFrame(raf); concluir(); }
      desenhar();
    }).observe(raiz);

    if (!reduzir) preparar();
    else raiz.classList.add("orgr--animado");
    desenhar();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (!raf) desenhar(); });
    raiz.classList.add("orgr--pronto"); // chegou até aqui: o texto de reserva não é necessário
  });
})();
