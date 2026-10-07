/*
 * Motion design dos popups de "Quem somos".
 *  • Estrutura Organizacional: setores em cascata, acordeão com altura
 *    animada (abre/fecha suave, um por vez) e cartões surgindo um a um.
 *  • Diretoria de Tecnologia: a biografia vira abertura + atribuições
 *    (mesmas frases do texto original), com circuito em SVG que se desenha
 *    e pulsos de dados correndo pelas trilhas.
 * Chamado pelo main.js: PGMSobre.onOpen(botão, diálogo).
 */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var SVGNS = "http://www.w3.org/2000/svg";

  // ---------------------------------------------------------------- acordeão
  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  function tweenHeight(el, from, to, ms, done) {
    if (reduce) { el.style.height = ""; done && done(); return; }
    var t0 = performance.now();
    el.style.overflow = "hidden";
    el.style.height = from + "px";
    function step(now) {
      var k = Math.min(1, (now - t0) / ms);
      el.style.height = (from + (to - from) * easeInOut(k)).toFixed(1) + "px";
      if (k < 1) requestAnimationFrame(step);
      else { el.style.height = ""; el.style.overflow = ""; done && done(); window.dispatchEvent(new Event("resize")); }
    }
    requestAnimationFrame(step);
  }

  function setupAccordion(acc) {
    if (acc.dataset.motion) return;
    acc.dataset.motion = "1";
    var items = Array.prototype.slice.call(acc.querySelectorAll(".acc__item"));
    items.forEach(function (d, i) {
      d.style.setProperty("--i", i);
      d.removeAttribute("name");                 // exclusividade feita aqui, com animação
      d.querySelectorAll(".acc__card").forEach(function (c, j) { c.style.setProperty("--i", j); });
      var head = d.querySelector(".acc__head"), body = d.querySelector(".acc__body");
      head.addEventListener("click", function (e) {
        e.preventDefault();
        if (d.dataset.busy) return;
        if (d.open) close(d); else {
          items.forEach(function (o) { if (o !== d && o.open) close(o); });
          open(d);
        }
      });
      function open(x) {
        x.dataset.busy = "1";
        x.open = true;
        x.classList.remove("is-expanding"); void x.offsetWidth; x.classList.add("is-expanding");
        tweenHeight(body, 0, body.scrollHeight, 420, function () { delete x.dataset.busy; });
      }
      function close(x) {
        var b = x.querySelector(".acc__body");
        x.dataset.busy = "1";
        x.classList.remove("is-expanding");
        tweenHeight(b, b.offsetHeight, 0, 320, function () { x.open = false; delete x.dataset.busy; });
      }
    });
  }

  // ------------------------------------------------------ Diretoria de Tecnologia
  var ICONS = [
    // sistemas / código
    '<path d="M8 8l-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14"/>',
    // segurança
    '<path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6l7-3Z"/><path d="M9 12l2 2 4-4"/>',
    // integração
    '<circle cx="5" cy="12" r="2.5"/><circle cx="19" cy="6" r="2.5"/><circle cx="19" cy="18" r="2.5"/><path d="M7.3 11l9.4-4M7.3 13l9.4 4"/>'
  ];
  var LABELS = ["Sistemas e equipes", "Segurança da informação", "Integração"];

  function circuit() {
    var svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("class", "tech__circuit");
    svg.setAttribute("viewBox", "0 0 640 120");
    svg.setAttribute("aria-hidden", "true");
    // trilhas: saem do chip central para os dois lados, com dobras a 45°
    var traces = [
      ["M268 44H200l-20-20H40", "vermelho"], ["M268 60H120", "verde"], ["M268 76H210l-22 22H70", "laranja"],
      ["M372 44h68l20-20h140", "roxo"], ["M372 60h148", "laranja"], ["M372 76h58l22 22h118", "verde"]
    ];
    var html = "";
    traces.forEach(function (t, i) {
      html += '<path class="tech__trace c-' + t[1] + '" pathLength="1" style="--i:' + i + '" d="' + t[0] + '"/>';
      html += '<path class="tech__pulse c-' + t[1] + '" pathLength="100" style="--i:' + i + '" d="' + t[0] + '"/>';
    });
    // pads nas pontas
    [[40, 24], [120, 60], [70, 98], [600, 24], [520, 60], [570, 98]].forEach(function (p, i) {
      html += '<circle class="tech__pad" style="--i:' + i + '" cx="' + p[0] + '" cy="' + p[1] + '" r="5"/>';
    });
    // chip central
    html += '<g class="tech__chip"><rect x="268" y="28" width="104" height="64" rx="12"/>' +
            '<text x="320" y="69" text-anchor="middle">TI</text></g>';
    svg.innerHTML = html;
    return svg;
  }

  function buildTech(dialog, bio) {
    var box = dialog.querySelector(".tech");
    if (!box) {
      box = document.createElement("div");
      box.className = "tech";
      var bioEl = dialog.querySelector(".pillar-dialog__bio");
      bioEl.parentNode.insertBefore(box, bioEl.nextSibling);
    }
    box.innerHTML = "";
    box.hidden = false;
    var frases = (bio.match(/[^.!?]+[.!?]+/g) || [bio]).map(function (s) { return s.trim(); });
    box.appendChild(circuit());
    var lead = document.createElement("p");
    lead.className = "tech__lead";
    lead.textContent = frases[0];
    box.appendChild(lead);
    var ul = document.createElement("ul");
    ul.className = "tech__list";
    frases.slice(1).forEach(function (f, i) {
      var li = document.createElement("li");
      li.className = "tech__item";
      li.style.setProperty("--i", i);
      li.innerHTML = '<span class="tech__icon"><svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        (ICONS[i] || ICONS[0]) + "</g></svg></span>";
      var txt = document.createElement("div");
      var h = document.createElement("strong");
      h.textContent = LABELS[i] || "";
      var p = document.createElement("p");
      p.textContent = f;
      if (h.textContent) txt.appendChild(h);
      txt.appendChild(p);
      li.appendChild(txt);
      ul.appendChild(li);
    });
    box.appendChild(ul);
  }

  function onOpen(btn, dialog) {
    var tech = btn.hasAttribute("data-tech") && btn.getAttribute("data-bio");
    dialog.classList.toggle("pillar-dialog--tech", !!tech);
    var box = dialog.querySelector(".tech");
    if (tech) {
      buildTech(dialog, tech);
      dialog.querySelector(".pillar-dialog__bio").hidden = true;
    } else if (box) {
      box.hidden = true;
    }
    dialog.querySelectorAll(".acc").forEach(setupAccordion);
  }

  window.PGMSobre = { onOpen: onOpen };
})();
