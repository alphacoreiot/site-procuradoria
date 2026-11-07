/* Páginas internas: índice que abre a pergunta certa e acompanha a leitura,
   "abrir todas" no acordeão e progresso da lista de documentos. Sem JavaScript
   tudo continua funcionando: o acordeão é nativo e o índice são links comuns. */
(function () {
  "use strict";
  var raiz = document.querySelector("[data-pagina]");
  if (!raiz) return;

  function abrirAlvo(id) {
    var alvo = id && document.getElementById(id);
    if (alvo && alvo.tagName === "DETAILS") alvo.open = true;
  }
  raiz.querySelectorAll("[data-indice]").forEach(function (a) {
    a.addEventListener("click", function () { abrirAlvo(a.getAttribute("href").slice(1)); });
  });
  if (location.hash) abrirAlvo(location.hash.slice(1));

  raiz.querySelectorAll("[data-faq-todos]").forEach(function (bt) {
    var grupo = bt.closest("[data-faq]");
    var itens = grupo.querySelectorAll("details");
    var rotulo = function () {
      var todas = Array.prototype.every.call(itens, function (d) { return d.open; });
      bt.textContent = todas ? "Fechar todas" : "Abrir todas";
      return todas;
    };
    bt.addEventListener("click", function () {
      var todas = rotulo();
      itens.forEach(function (d) { d.open = !todas; });
      rotulo();
    });
    itens.forEach(function (d) { d.addEventListener("toggle", rotulo); });
  });

  // destaca no índice o trecho em leitura
  var links = {};
  raiz.querySelectorAll("[data-indice]").forEach(function (a) { links[a.getAttribute("href").slice(1)] = a; });
  var alvos = Object.keys(links).map(function (id) { return document.getElementById(id); }).filter(Boolean);
  if (alvos.length && "IntersectionObserver" in window) {
    var obs = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        Object.keys(links).forEach(function (id) { links[id].removeAttribute("aria-current"); });
        var a = links[e.target.id];
        a.setAttribute("aria-current", "location");
        var nav = a.closest(".pag-indice ol");
        if (nav) nav.scrollTop = a.offsetTop - nav.offsetTop - nav.clientHeight / 2;
      });
    }, { rootMargin: "-20% 0px -70% 0px" });
    alvos.forEach(function (t) { obs.observe(t); });
  }

  // lista de documentos do processo
  raiz.querySelectorAll("[data-checklist]").forEach(function (c) {
    var caixas = c.querySelectorAll("[data-check]");
    var conta = c.querySelector("[data-check-conta]");
    var barra = c.querySelector("[data-check-barra]");
    function atualizar() {
      var n = c.querySelectorAll("[data-check]:checked").length, t = caixas.length;
      conta.textContent = n === t ? "Tudo separado! Você já pode abrir o processo." : n + " de " + t + " documentos separados";
      c.classList.toggle("is-completo", n === t);
      barra.style.transform = "scaleX(" + (t ? n / t : 0) + ")";
    }
    caixas.forEach(function (x) { x.addEventListener("change", atualizar); });
  });
})();
