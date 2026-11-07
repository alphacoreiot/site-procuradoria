/* Assistente virtual. O texto da resposta é montado com nós de texto (nunca HTML),
   e os links vêm só das fontes enviadas pelo servidor. */
(function () {
  "use strict";
  var raiz = document.querySelector("[data-assistente]");
  if (!raiz) return;
  var orgao = raiz.getAttribute("data-assistente");
  var abrir = raiz.querySelector("[data-ast-abrir]");
  var painel = raiz.querySelector("[data-ast-painel]");
  var msgs = raiz.querySelector("[data-ast-msgs]");
  var form = raiz.querySelector("[data-ast-form]");
  var campo = raiz.querySelector("[data-ast-campo]");
  var enviar = raiz.querySelector("[data-ast-enviar]");
  var inicial = msgs.innerHTML;
  var historico = [], ocupado = false, CHAVE = "assistente:" + orgao;

  function ler() { try { return JSON.parse(sessionStorage.getItem(CHAVE) || "null"); } catch (e) { return null; } }
  function gravar(v) { try { if (v) sessionStorage.setItem(CHAVE, JSON.stringify(v)); else sessionStorage.removeItem(CHAVE); } catch (e) { /* sem armazenamento */ } }

  function mostrar(sim) {
    painel.hidden = !sim;
    abrir.setAttribute("aria-expanded", sim ? "true" : "false");
    raiz.classList.toggle("is-aberto", sim);
    document.documentElement.classList.toggle("ast-aberto", sim);
    if (sim) { campo.focus(); rolar(); } else { abrir.focus(); }
  }
  function rolar() { msgs.scrollTop = msgs.scrollHeight; }

  /* **negrito**, listas e citações [n], sem interpretar HTML */
  function inline(pai, texto) {
    // "[2, 5]" vira duas citações
    texto = texto.replace(/\[(\d{1,2}(?:\s*,\s*\d{1,2})+)\]/g, function (_, l) { return l.split(",").map(function (n) { return "[" + n.trim() + "]"; }).join(""); });
    texto.split(/(\*\*[^*]+\*\*|\[\d{1,2}\])/g).forEach(function (p) {
      if (!p) return;
      if (/^\*\*/.test(p)) {
        var b = document.createElement("strong");
        b.textContent = p.slice(2, -2);
        pai.appendChild(b);
      } else if (/^\[\d{1,2}\]$/.test(p)) {
        var s = document.createElement("sup");
        s.className = "ast__ref";
        s.setAttribute("data-ref", p.slice(1, -1));
        s.textContent = p.slice(1, -1);
        pai.appendChild(s);
      } else pai.appendChild(document.createTextNode(p));
    });
  }
  function renderizar(el, texto) {
    el.textContent = "";
    var lista = null;
    texto.split("\n").forEach(function (l) {
      var t = l.trim();
      if (!t) { lista = null; return; }
      var m = t.match(/^(?:[-*•]|\d+[.)])\s+(.*)$/);
      if (m) {
        if (!lista) { lista = document.createElement("ul"); el.appendChild(lista); }
        var li = document.createElement("li");
        inline(li, m[1]);
        lista.appendChild(li);
      } else {
        lista = null;
        var p = document.createElement("p");
        inline(p, t);
        el.appendChild(p);
      }
    });
  }
  var ROTULOS = { lei: "Lei", documento: "Documento", pagina: "Página", processo: "Processo", noticia: "Notícia" };
  function fontes(el, lista) {
    if (!lista || !lista.length) return;
    var caixa = document.createElement("div");
    caixa.className = "ast__fontes";
    var t = document.createElement("p");
    t.textContent = "Fontes";
    caixa.appendChild(t);
    lista.forEach(function (f) {
      if (!/^(\/|https?:\/\/)/.test(f.url)) return;
      var a = document.createElement("a");
      a.href = f.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      var n = document.createElement("b");
      n.textContent = f.n;
      var nome = document.createElement("span");
      nome.textContent = (f.rotulo ? f.rotulo + " · " : "") + f.titulo;
      var tipo = document.createElement("small");
      tipo.textContent = ROTULOS[f.tipo] || "";
      a.appendChild(n); a.appendChild(nome); a.appendChild(tipo);
      caixa.appendChild(a);
    });
    el.appendChild(caixa);
  }
  function bolha(tipo) {
    var d = document.createElement("div");
    d.className = "ast__msg ast__msg--" + tipo;
    msgs.appendChild(d);
    return d;
  }
  function pontos(d) {
    d.innerHTML = '<span class="ast__digitando" aria-label="Buscando nos documentos"><i></i><i></i><i></i></span>';
  }
  function tirarSugestoes() {
    var s = msgs.querySelector("[data-ast-sugestoes]");
    if (s) s.remove();
  }
  function salvarConversa() { gravar(historico.slice(-12)); }

  function perguntar(texto) {
    if (ocupado || texto.length < 2) return;
    ocupado = true;
    enviar.disabled = true;
    tirarSugestoes();
    bolha("eu").textContent = texto;
    var bot = bolha("bot");
    pontos(bot);
    rolar();
    var acumulado = "", refs = null, rolarDepois = -1;
    fetch("/api/assistente/" + encodeURIComponent(orgao), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mensagem: texto, historico: historico.slice(-6).map(function (h) { return { papel: h.papel, texto: h.texto.slice(0, 1400) }; }) }),
    }).then(function (r) {
      if (!r.ok || !r.body) {
        return r.json().catch(function () { return {}; }).then(function (j) { throw new Error(j.erro || "Não consegui responder agora. Tente de novo em instantes."); });
      }
      var leitor = r.body.getReader(), dec = new TextDecoder(), resto = "";
      var corpo = document.createElement("div");
      function linha(l) {
        if (!l.trim()) return;
        var o;
        try { o = JSON.parse(l); } catch (e) { return; }
        if (o.t) {
          acumulado += o.t;
          if (!corpo.parentNode) { bot.textContent = ""; bot.appendChild(corpo); }
          renderizar(corpo, acumulado);
          rolar();
        }
        if (o.f) refs = o.f;
        if (o.e) throw new Error(o.e);
      }
      function passo() {
        return leitor.read().then(function (x) {
          if (x.done) { linha(resto); return; }
          resto += dec.decode(x.value, { stream: true });
          var ls = resto.split("\n");
          resto = ls.pop();
          ls.forEach(linha);
          return passo();
        });
      }
      return passo();
    }).then(function () {
      if (!acumulado) throw new Error("Não consegui responder agora. Tente de novo em instantes.");
      fontes(bot, refs);
      // resposta maior que a janela: a leitura começa do início
      if (bot.offsetHeight > msgs.clientHeight - 60) { rolarDepois = bot.offsetTop - msgs.offsetTop - 48; }
      historico.push({ papel: "user", texto: texto }, { papel: "assistant", texto: acumulado, fontes: refs });
      salvarConversa();
    }).catch(function (e) {
      bot.textContent = e.message || "Não consegui responder agora.";
      bot.classList.add("ast__msg--erro");
    }).then(function () {
      ocupado = false;
      enviar.disabled = false;
      if (rolarDepois >= 0) msgs.scrollTop = rolarDepois; else rolar();
    });
  }

  abrir.addEventListener("click", function () { mostrar(painel.hidden); });
  raiz.querySelector("[data-ast-fechar]").addEventListener("click", function () { mostrar(false); });
  raiz.querySelector("[data-ast-novo]").addEventListener("click", function () {
    historico = [];
    gravar(null);
    msgs.innerHTML = inicial;
    campo.focus();
  });
  msgs.addEventListener("click", function (e) {
    var b = e.target.closest("[data-ast-sugestao]");
    if (b) perguntar(b.getAttribute("data-ast-sugestao"));
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !painel.hidden) mostrar(false); });
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var t = campo.value.trim();
    campo.value = "";
    campo.style.height = "";
    perguntar(t);
  });
  campo.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); }
  });
  campo.addEventListener("input", function () {
    campo.style.height = "auto";
    campo.style.height = Math.min(campo.scrollHeight, 110) + "px";
  });

  // retoma a conversa ao trocar de página
  var salvo = ler();
  if (salvo && salvo.length) {
    historico = salvo;
    tirarSugestoes();
    salvo.forEach(function (h) {
      if (h.papel === "user") { bolha("eu").textContent = h.texto; return; }
      var b = bolha("bot"), c = document.createElement("div");
      b.appendChild(c);
      renderizar(c, h.texto);
      fontes(b, h.fontes);
    });
  }
})();
