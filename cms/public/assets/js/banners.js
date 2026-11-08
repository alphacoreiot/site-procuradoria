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
    // SEFAZ no celular: faixa nativa que acompanha o dedo. Outros órgãos seguem como antes.
    var moderno = !!raiz.closest(".pag-moderna");
    var palco = raiz.querySelector(".banners__palco");
    var telaEstreita = window.matchMedia("(max-width: 959px)");
    var trilho = function () { return moderno && telaEstreita.matches; };

    requestAnimationFrame(function () { raiz.classList.add("is-pronto"); });

    if (total > 1) {
      var atual = 0, timer = null, pausado = reduzir, sobre = false, foraDaTela = false, guiado = 0, rafFaixa = 0;
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
        if (pausado || sobre || foraDaTela || document.hidden) return;
        reiniciarBarra();
        timer = setTimeout(function () { var prox = (atual + 1) % total; ativar(prox); rolarPara(prox, true); agendar(); }, intervalo);
      };
      var rolarPara = function (i, suave) {
        if (!trilho()) return;
        clearTimeout(guiado);
        guiado = setTimeout(function () { guiado = 0; }, 850); // ignora a própria rolagem enquanto ela anda
        palco.scrollTo({ left: slides[i].offsetLeft - slides[0].offsetLeft, behavior: suave && !reduzir ? "smooth" : "auto" });
      };
      var ir = function (i) { i = (i + total) % total; ativar(i); rolarPara(i, true); agendar(); };
      var marcarPausa = function () {
        if (!btnPausa) return;
        btnPausa.classList.toggle("is-paused", pausado);
        btnPausa.setAttribute("aria-pressed", pausado ? "true" : "false");
        btnPausa.setAttribute("aria-label", pausado ? "Retomar banners" : "Pausar banners");
      };

      raiz.addEventListener("click", function (e) {
        if (trilho()) { // tocar no cartão seguinte traz ele para o centro em vez de abrir o link
          var cartao = e.target.closest(".banners__slide");
          if (cartao && !cartao.classList.contains("is-active")) { e.preventDefault(); ir(slides.indexOf(cartao)); return; }
        }
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
      // no toque, o navegador simula mouse e foco: sem este filtro a troca automática pararia de vez
      cena.addEventListener("mouseenter", function () { if (moderno && !temMouse) return; sobre = true; parar(); });
      cena.addEventListener("mouseleave", function () { if (moderno && !temMouse) return; sobre = false; agendar(); });
      cena.addEventListener("focusin", function (e) { if (moderno && !e.target.matches(":focus-visible")) return; sobre = true; parar(); });
      cena.addEventListener("focusout", function (e) { if (moderno && !e.target.matches(":focus-visible")) return; sobre = false; agendar(); });
      document.addEventListener("visibilitychange", agendar);

      var xIni = null;
      var soltou = function () { sobre = false; agendar(); };
      cena.addEventListener("touchstart", function (e) {
        if (trilho()) { clearTimeout(guiado); guiado = 0; sobre = true; parar(); return; }
        xIni = e.touches[0].clientX;
      }, { passive: true });
      cena.addEventListener("touchcancel", function () { if (trilho()) soltou(); }, { passive: true });
      cena.addEventListener("touchend", function (e) {
        if (trilho()) { soltou(); return; }
        if (xIni === null) return;
        var dx = e.changedTouches[0].clientX - xIni;
        xIni = null;
        if (Math.abs(dx) > 45) ir(atual + (dx < 0 ? 1 : -1));
      }, { passive: true });

      if (moderno) {
        palco.addEventListener("scroll", function () {
          if (!trilho() || guiado || rafFaixa) return;
          rafFaixa = requestAnimationFrame(function () {
            rafFaixa = 0;
            var base = slides[0].offsetLeft, melhor = 0, menor = Infinity;
            slides.forEach(function (s, n) {
              var d = Math.abs(s.offsetLeft - base - palco.scrollLeft);
              if (d < menor) { menor = d; melhor = n; }
            });
            // no fim da faixa o último cartão não chega à esquerda, mas é ele que está em foco
            if (palco.scrollLeft >= palco.scrollWidth - palco.clientWidth - 2) melhor = total - 1;
            if (melhor !== atual) { ativar(melhor); agendar(); }
          });
        }, { passive: true });
        var larguraJanela = window.innerWidth;
        window.addEventListener("resize", function () { // a barra do navegador muda só a altura
          if (window.innerWidth === larguraJanela) return;
          larguraJanela = window.innerWidth;
          rolarPara(atual, false);
        });
        if ("IntersectionObserver" in window) {
          new IntersectionObserver(function (es) { foraDaTela = !es[0].isIntersecting; agendar(); }, { threshold: 0.2 }).observe(raiz);
        }
      }

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
