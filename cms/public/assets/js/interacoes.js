/* Micro-interações das páginas com visual moderno: entrada suave dos itens ao
   rolar, barra de leitura, filtros que aplicam sozinhos e botões de compartilhar.
   Sem JavaScript tudo continua visível e funcional. Respeita "reduzir movimento". */
(function () {
  "use strict";
  var raiz = document.querySelector(".pag-moderna");
  if (!raiz) return;
  var reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.documentElement.classList.add("js-ok");

  // entrada suave: só quem ainda está abaixo da dobra espera a rolagem
  if (!reduzir && "IntersectionObserver" in window) {
    var itens = raiz.querySelectorAll(".doc-lista > li, .proc-lista > li, .pag-links > li, .pag-faq__item, .news-card, .check-grupo li, .pag-h2, .pag-proximos a, .rel-grade > *, .doc-destaque, .cartao, .service, .separador, .doc-cards > li, .serie, .aud li");
    var obs = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("rv-ok");
        obs.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.05 });
    itens.forEach(function (el) {
      if (el.classList.contains("reveal")) return; // já animado pelo site
      var irmaos = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
      el.style.setProperty("--rv", (irmaos % 6) * 45 + "ms");
      el.classList.add("rv");
      obs.observe(el);
    });
  }

  // filtros em lista aplicam ao trocar a opção
  raiz.querySelectorAll("form[data-auto]").forEach(function (f) {
    var bt = f.querySelector("[data-sem-js]");
    if (bt) bt.hidden = true;
    f.querySelectorAll("select").forEach(function (s) {
      s.addEventListener("change", function () {
        // opções vazias ficam fora do endereço
        f.querySelectorAll("select").forEach(function (x) { if (!x.value || (x.name === "ordem" && x.value === "recentes")) x.disabled = true; });
        f.submit();
      });
    });
  });

  // barra de leitura
  var barra = document.querySelector("[data-leitura-barra]");
  var artigo = document.querySelector("[data-leitura]");
  if (barra && artigo) {
    var marcado = false;
    var medir = function () {
      marcado = false;
      var r = artigo.getBoundingClientRect();
      var total = r.height - innerHeight * 0.6;
      var p = total > 0 ? Math.min(1, Math.max(0, (innerHeight * 0.4 - r.top) / total)) : 0;
      barra.style.transform = "scaleX(" + p.toFixed(4) + ")";
    };
    addEventListener("scroll", function () {
      if (!marcado) { marcado = true; requestAnimationFrame(medir); }
    }, { passive: true });
    medir();
  }

  // compartilhar, copiar e imprimir
  var aviso = null, tempo = 0;
  function avisar(texto) {
    if (!aviso) {
      aviso = document.createElement("div");
      aviso.className = "pag-aviso";
      aviso.setAttribute("role", "status");
      document.body.appendChild(aviso);
    }
    aviso.textContent = texto;
    aviso.classList.add("is-on");
    clearTimeout(tempo);
    tempo = setTimeout(function () { aviso.classList.remove("is-on"); }, 2400);
  }
  raiz.addEventListener("click", function (e) {
    var bt = e.target.closest("[data-acao]");
    if (!bt) return;
    var acao = bt.getAttribute("data-acao");
    if (acao === "imprimir") { window.print(); return; }
    if (acao === "copiar") {
      e.preventDefault();
      if (navigator.clipboard) {
        navigator.clipboard.writeText(location.href).then(function () { avisar("Link copiado"); }, function () { avisar("Não foi possível copiar"); });
      } else { avisar("Copie o endereço na barra do navegador"); }
    }
    if (acao === "whatsapp") {
      e.preventDefault();
      window.open("https://wa.me/?text=" + encodeURIComponent(document.title + " " + location.href), "_blank", "noopener");
    }
  });
})();

/* Abas: marcador deslizante, navegação por seções e busca instantânea.
   Todas as opções ficam visíveis; sem JavaScript o conteúdo aparece igual. */
(function () {
  "use strict";
  var reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var ler = function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } };
  var gravar = function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* sem armazenamento */ } };

  function medir(el) { return { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight }; }
  function posicionar(marca, m) {
    marca.style.width = m.w + "px";
    marca.style.height = m.h + "px";
    marca.style.transform = "translate(" + m.x + "px," + m.y + "px)";
  }

  document.querySelectorAll("[data-abas]").forEach(function (nav) {
    var trilho = nav.querySelector(".abas__trilho");
    var marca = nav.querySelector(".abas__marca");
    var chave = "abas:" + location.pathname;
    var ativo = function () { return trilho.querySelector('[aria-current="true"]'); };

    function ajustar(animar) {
      var a = ativo();
      nav.classList.toggle("sem-ativo", !a);
      if (!a) return;
      if (!animar) marca.classList.add("sem-transicao");
      posicionar(marca, medir(a));
      if (!animar) { void marca.offsetWidth; marca.classList.remove("sem-transicao"); }
      // quem abre uma fila não tem separador à esquerda
      trilho.querySelectorAll("a").forEach(function (x) { x.classList.toggle("abre-fila", x.offsetLeft < 12); });
    }
    nav.ajustarAbas = ajustar;

    // continua o movimento de onde parou ao trocar de categoria (a página recarrega)
    var salvo = ler(chave);
    if (salvo && !reduzir && !nav.classList.contains("abas--ancoras")) {
      try {
        marca.classList.add("sem-transicao");
        posicionar(marca, JSON.parse(salvo));
        void marca.offsetWidth;
        marca.classList.remove("sem-transicao");
        requestAnimationFrame(function () { requestAnimationFrame(function () { ajustar(true); }); });
      } catch (e) { ajustar(false); }
    } else {
      ajustar(false);
    }

    trilho.addEventListener("click", function (e) {
      var l = e.target.closest("a");
      var at = ativo();
      if (l && at && l.getAttribute("href").charAt(0) !== "#") gravar(chave, JSON.stringify(medir(at)));
    });
    addEventListener("resize", function () { ajustar(false); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ajustar(false); });
  });

  // serviços: a barra acompanha a seção em leitura, e a busca filtra na hora
  document.querySelectorAll("[data-grupos]").forEach(function (raiz) {
    var nav = raiz.querySelector("[data-abas]");
    var busca = raiz.querySelector("[data-grupos-busca]");
    var campo = busca.querySelector("input");
    var vazio = raiz.querySelector("[data-grupos-vazio]");
    var links = Array.prototype.slice.call(nav.querySelectorAll("a"));
    var paineis = Array.prototype.slice.call(raiz.querySelectorAll(".grupo"));
    busca.hidden = false;
    if (nav.ajustarAbas) nav.ajustarAbas(false);

    function marcar(id) {
      links.forEach(function (l) {
        if (l.getAttribute("href") === "#" + id) l.setAttribute("aria-current", "true");
        else l.removeAttribute("aria-current");
      });
      if (nav.ajustarAbas) nav.ajustarAbas(true);
    }
    if ("IntersectionObserver" in window) {
      var obs = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) marcar(e.target.id); });
      }, { rootMargin: "-30% 0px -60% 0px" });
      paineis.forEach(function (p) { obs.observe(p); });
    }
    links.forEach(function (l) {
      l.addEventListener("click", function () { marcar(l.getAttribute("href").slice(1)); });
    });

    // "certidao" também acha "certidões"
    var normalizar = function (s) { return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/(ao|oes|aes)\b/g, "ao").trim(); };
    campo.addEventListener("input", function () {
      var q = normalizar(campo.value);
      raiz.classList.toggle("is-busca", !!q);
      var total = 0;
      paineis.forEach(function (p) {
        var n = 0;
        p.querySelectorAll("li[data-busca]").forEach(function (li) {
          var sim = !q || normalizar(li.getAttribute("data-busca")).indexOf(q) >= 0;
          li.hidden = !sim;
          if (sim) n++;
        });
        p.classList.toggle("sem-itens", n === 0);
        total += n;
      });
      vazio.hidden = !q;
      vazio.textContent = !q ? "" : total === 0 ? "Nenhum serviço encontrado. Tente outra palavra." : total + (total === 1 ? " serviço encontrado" : " serviços encontrados");
    });
  });
})();
