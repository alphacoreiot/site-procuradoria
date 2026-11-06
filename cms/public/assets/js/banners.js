/* Abertura com banners: entrada encenada, pilha de cartões em profundidade,
   barra de tempo e paralaxe com o mouse. A troca usa só transform e opacity.
   Pausa ao passar o mouse/focar; aceita setas, pontos, teclado e arraste.
   Com "reduzir movimento" não troca sozinha e não há paralaxe. */
(function () {
  "use strict";
  var reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var temMouse = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  document.querySelectorAll("[data-banners]").forEach(function (raiz) {
    var slides = Array.prototype.slice.call(raiz.querySelectorAll(".banners__slide"));
    var pontos = Array.prototype.slice.call(raiz.querySelectorAll("[data-banner-ir]"));
    var btnPausa = raiz.querySelector('[data-banner="pause"]');
    var cena = raiz.querySelector(".banners__cena");
    var total = slides.length;

    requestAnimationFrame(function () { raiz.classList.add("is-pronto"); });

    if (total > 1) {
      var atual = 0, timer = null, pausado = reduzir, sobre = false;
      var intervalo = (Number(raiz.getAttribute("data-intervalo")) || 6) * 1000;
      raiz.style.setProperty("--tempo", intervalo + "ms");

      var posicao = function (n) {
        var d = (n - atual + total) % total;
        return d === total - 1 ? -1 : d; // -1 = o cartão que acabou de sair
      };
      var ativar = function (i) {
        atual = i;
        slides.forEach(function (s, n) {
          var ativo = n === i;
          s.setAttribute("data-pos", String(posicao(n)));
          s.classList.toggle("is-active", ativo);
          s.setAttribute("aria-hidden", ativo ? "false" : "true");
          if (s.tagName === "A") s.tabIndex = ativo ? 0 : -1;
        });
        pontos.forEach(function (p, n) {
          p.classList.toggle("is-active", n === i);
          if (n === i) p.setAttribute("aria-current", "true"); else p.removeAttribute("aria-current");
        });
      };
      var reiniciarBarra = function () {
        var p = pontos[atual];
        if (!p) return;
        p.classList.remove("is-contando");
        void p.offsetWidth; // reinicia a animação da barra
        p.classList.add("is-contando");
      };
      var parar = function () {
        if (timer) { clearTimeout(timer); timer = null; }
        pontos.forEach(function (p) { p.classList.remove("is-contando"); });
      };
      var agendar = function () {
        parar();
        if (pausado || sobre || document.hidden) return;
        reiniciarBarra();
        timer = setTimeout(function () { ativar((atual + 1) % total); agendar(); }, intervalo);
      };
      var ir = function (i) { ativar((i + total) % total); agendar(); };
      var marcarPausa = function () {
        if (!btnPausa) return;
        btnPausa.classList.toggle("is-paused", pausado);
        btnPausa.setAttribute("aria-pressed", pausado ? "true" : "false");
        btnPausa.setAttribute("aria-label", pausado ? "Retomar banners" : "Pausar banners");
      };

      raiz.addEventListener("click", function (e) {
        var alvo = e.target.closest("[data-banner],[data-banner-ir]");
        if (!alvo) return;
        var acao = alvo.getAttribute("data-banner");
        if (acao === "prev") ir(atual - 1);
        else if (acao === "next") ir(atual + 1);
        else if (acao === "pause") { pausado = !pausado; marcarPausa(); agendar(); }
        else ir(Number(alvo.getAttribute("data-banner-ir")));
      });
      cena.addEventListener("keydown", function (e) {
        if (e.key === "ArrowLeft") ir(atual - 1);
        if (e.key === "ArrowRight") ir(atual + 1);
      });
      cena.addEventListener("mouseenter", function () { sobre = true; parar(); });
      cena.addEventListener("mouseleave", function () { sobre = false; agendar(); });
      cena.addEventListener("focusin", function () { sobre = true; parar(); });
      cena.addEventListener("focusout", function () { sobre = false; agendar(); });
      document.addEventListener("visibilitychange", agendar);

      var xIni = null;
      cena.addEventListener("touchstart", function (e) { xIni = e.touches[0].clientX; }, { passive: true });
      cena.addEventListener("touchend", function (e) {
        if (xIni === null) return;
        var dx = e.changedTouches[0].clientX - xIni;
        xIni = null;
        if (Math.abs(dx) > 45) ir(atual + (dx < 0 ? 1 : -1));
      }, { passive: true });

      ativar(0);
      marcarPausa();
      setTimeout(agendar, reduzir ? 0 : 1400); // espera a entrada terminar
    }

    // ---- paralaxe suave com o mouse (só transform, com amortecimento) --------
    if (!reduzir && temMouse) {
      var alvoX = 0, alvoY = 0, x = 0, y = 0, raf = 0;
      var quadro = function () {
        x += (alvoX - x) * 0.08;
        y += (alvoY - y) * 0.08;
        raiz.style.setProperty("--px", x.toFixed(4));
        raiz.style.setProperty("--py", y.toFixed(4));
        raf = Math.abs(alvoX - x) + Math.abs(alvoY - y) > 0.001 ? requestAnimationFrame(quadro) : 0;
      };
      raiz.addEventListener("pointermove", function (e) {
        var r = raiz.getBoundingClientRect();
        alvoX = (e.clientX - r.left) / r.width - 0.5;
        alvoY = (e.clientY - r.top) / r.height - 0.5;
        if (!raf) raf = requestAnimationFrame(quadro);
      });
      raiz.addEventListener("pointerleave", function () {
        alvoX = alvoY = 0;
        if (!raf) raf = requestAnimationFrame(quadro);
      });
    }
  });
})();
