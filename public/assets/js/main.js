(function () {
  "use strict";

  var cfg = window.PROGER_CONFIG || {};
  var doc = document.documentElement;
  doc.classList.add("js");

  // --- Links e textos vindos do config.js -----------------------------------
  if (cfg.telefone) cfg.telefoneLink = "tel:+55" + cfg.telefone.replace(/\D/g, "");
  if (cfg.email) cfg.emailLink = "mailto:" + cfg.email;

  document.querySelectorAll("[data-config-text]").forEach(function (el) {
    var v = cfg[el.getAttribute("data-config-text")];
    if (v) el.textContent = v;
  });

  document.querySelectorAll("[data-config-href]").forEach(function (el) {
    var v = cfg[el.getAttribute("data-config-href")];
    if (v) {
      el.href = v;
    } else {
      // Link ainda não configurado: avisa em vez de levar a lugar nenhum
      el.addEventListener("click", function (e) { e.preventDefault(); toast("Link disponível em breve."); });
      el.removeAttribute("target");
    }
  });

  // --- WhatsApp ---------------------------------------------------------------
  var waNumero = (cfg.whatsappNumero || "").replace(/\D/g, "");
  document.querySelectorAll("[data-whatsapp]").forEach(function (el) {
    var msg = el.getAttribute("data-msg") || cfg.whatsappMensagem || "";
    if (waNumero) {
      el.href = "https://wa.me/" + waNumero + "?text=" + encodeURIComponent(msg);
      el.target = "_blank";
      el.rel = "noopener";
    } else {
      el.addEventListener("click", function (e) { e.preventDefault(); toast("Atendimento pelo WhatsApp disponível em breve."); });
    }
  });

  // --- Menu mobile ------------------------------------------------------------
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("menu");
  function setMenu(open) {
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
    nav.classList.toggle("is-open", open);
  }
  if (toggle && nav) {
    toggle.addEventListener("click", function () { setMenu(toggle.getAttribute("aria-expanded") !== "true"); });
    nav.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });
  }

  // --- Sombra do header ao rolar ---------------------------------------------
  var header = document.querySelector(".site-header");
  function onScroll() { header.classList.toggle("is-scrolled", window.scrollY > 8); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // --- Item de menu ativo + animação de entrada -------------------------------
  if ("IntersectionObserver" in window) {
    var links = {};
    document.querySelectorAll(".site-nav ul a[href^='#']").forEach(function (a) { links[a.getAttribute("href").slice(1)] = a; });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && links[en.target.id]) {
          Object.keys(links).forEach(function (k) { links[k].classList.remove("is-active"); });
          links[en.target.id].classList.add("is-active");
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(links).forEach(function (id) { var s = document.getElementById(id); if (s) spy.observe(s); });

    var reveal = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-visible"); reveal.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll(".reveal").forEach(function (el, i) {
      el.style.transitionDelay = (i % 4) * 70 + "ms";
      reveal.observe(el);
    });
  } else {
    document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("is-visible"); });
  }

  // --- Tamanho da fonte (acessibilidade) -------------------------------------
  try { if (localStorage.getItem("proger-font") === "lg") doc.classList.add("font-lg"); } catch (e) {}
  document.querySelectorAll("[data-font]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var big = btn.getAttribute("data-font") === "up";
      doc.classList.toggle("font-lg", big);
      try { localStorage.setItem("proger-font", big ? "lg" : ""); } catch (e) {}
    });
  });

  // --- Carrossel da abertura -------------------------------------------------
  // Motion design em requestAnimationFrame (60fps): só transform/opacity.
  //  • Fundo: Ken Burns contínuo na foto (zoom + deriva lenta).
  //  • Transição: faixas inclinadas nas cores da marca varrem o quadro; no meio
  //    da varredura o conteúdo troca e a ilustração/legenda entram deslizando.
  document.querySelectorAll(".carousel").forEach(function (root) {
    var slides = Array.prototype.slice.call(root.querySelectorAll(".carousel__slide"));
    var bars = Array.prototype.slice.call(root.querySelectorAll(".carousel__wipe span"));
    var bg = root.querySelector(".carousel__bg img");
    var dotsBox = root.querySelector(".carousel__dots");
    var pauseBtn = root.querySelector("[data-carousel='pause']");
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var HOLD = 5200;                 // tempo parado em cada slide (ms)
    var TRANS = reduce ? 450 : 1150; // duração da transição (ms)
    var KB_CYCLE = 26000;            // ciclo do Ken Burns (ms)

    var current = 0, from = -1, target = -1, transStart = 0;
    var hold = 0, kb = 0, last = null, raf = null;
    var playing = !reduce, hovering = false, onScreen = true;

    var parts = slides.map(function (s) {
      return { el: s, art: s.querySelector(".carousel__art"), cap: s.querySelector(".carousel__caption") };
    });

    var dots = slides.map(function (_, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "carousel__dot";
      b.setAttribute("aria-label", "Ir para o slide " + (i + 1));
      b.appendChild(document.createElement("i"));
      b.addEventListener("click", function () { go(i); });
      dotsBox.appendChild(b);
      return b;
    });

    function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
    function inOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
    function out(t) { return 1 - Math.pow(1 - t, 3); }

    function setDots(active) {
      dots.forEach(function (d, k) {
        if (k === active) d.setAttribute("aria-current", "true"); else d.removeAttribute("aria-current");
      });
    }
    function setHidden() {
      parts.forEach(function (p, k) { p.el.setAttribute("aria-hidden", String(k !== current)); });
    }
    function clearStyles(p) {
      p.el.style.opacity = "";
      p.art.style.transform = p.art.style.opacity = "";
      p.cap.style.transform = p.cap.style.opacity = "";
    }

    function go(i) {
      i = (i + slides.length) % slides.length;
      if (target >= 0) finish();      // transição em andamento: conclui antes
      if (i === current) return;
      from = current;
      target = i;
      transStart = performance.now();
      hold = 0;
      parts[target].el.classList.add("is-active");
      parts[target].el.style.opacity = "0";
      setDots(target);
      kick();
    }

    function finish() {
      parts[from].el.classList.remove("is-active");
      clearStyles(parts[from]);
      clearStyles(parts[target]);
      bars.forEach(function (b) { b.style.transform = ""; });
      current = target;
      from = target = -1;
      setHidden();
    }

    function renderTransition(t) {
      var a = parts[from], b = parts[target];

      if (!reduce) {
        // faixas: cada uma atravessa o quadro com pequeno atraso
        bars.forEach(function (bar, i) {
          var lp = clamp((t - i * 0.07) / 0.72);
          var x = -170 + inOut(lp) * 520;
          bar.style.transform = "translate3d(" + x.toFixed(2) + "%,0,0) skewX(-14deg)";
        });
      }

      // saída (primeira metade)
      var o = out(clamp(t / 0.5));
      a.el.style.opacity = String(1 - o);
      a.art.style.transform = "translate3d(" + (-40 * o).toFixed(2) + "px,0,0) scale(" + (1 - 0.04 * o).toFixed(4) + ")";
      a.cap.style.transform = "translate3d(0," + (-14 * o).toFixed(2) + "px,0)";

      // entrada (a partir do meio)
      var e = out(clamp((t - 0.42) / 0.58));
      var e2 = out(clamp((t - 0.52) / 0.48));  // legenda entra um pouco depois
      b.el.style.opacity = String(e);
      b.art.style.transform = "translate3d(" + (48 * (1 - e)).toFixed(2) + "px,0,0) scale(" + (0.94 + 0.06 * e).toFixed(4) + ")";
      b.cap.style.opacity = String(e2);
      b.cap.style.transform = "translate3d(0," + (26 * (1 - e2)).toFixed(2) + "px,0)";
    }

    function frame(now) {
      raf = null;
      var dt = last === null ? 16.7 : Math.min(now - last, 50);
      last = now;

      // Ken Burns: zoom e deriva em ciclo suave + "respiro" durante a transição
      if (!reduce) {
        kb += dt;
        var ang = (kb % KB_CYCLE) / KB_CYCLE * Math.PI * 2;
        var bump = target >= 0 ? Math.sin(Math.PI * clamp((now - transStart) / TRANS)) * 0.035 : 0;
        var scale = 1.12 + Math.sin(ang) * 0.05 + bump;
        var x = Math.sin(ang) * 2.4, y = Math.cos(ang * 0.5) * 1.6;
        bg.style.transform = "translate3d(" + x.toFixed(3) + "%," + y.toFixed(3) + "%,0) scale(" + scale.toFixed(4) + ")";
      }

      if (target >= 0) {
        var t = clamp((now - transStart) / TRANS);
        renderTransition(t);
        if (t >= 1) finish();
      } else if (playing && !hovering) {
        hold += dt;
        if (hold >= HOLD) go(current + 1);
      }

      // progresso na bolinha ativa
      var active = target >= 0 ? target : current;
      var bar = dots[active].firstChild;
      bar.style.transform = "scaleX(" + (playing ? clamp(hold / HOLD) : 1).toFixed(4) + ")";

      kick();
    }

    function kick() {
      if (raf === null && onScreen && !document.hidden) {
        raf = requestAnimationFrame(frame);
      }
    }
    function halt() {
      if (raf !== null) cancelAnimationFrame(raf);
      raf = null;
      last = null;
    }

    function setPlaying(on) {
      playing = on;
      pauseBtn.setAttribute("aria-label", on ? "Pausar carrossel" : "Reproduzir carrossel");
      pauseBtn.querySelector("use").setAttribute("href", on ? "#i-pause" : "#i-play");
      kick();
    }

    root.querySelector("[data-carousel='prev']").addEventListener("click", function () { go(current - 1); });
    root.querySelector("[data-carousel='next']").addEventListener("click", function () { go(current + 1); });
    pauseBtn.addEventListener("click", function () { setPlaying(!playing); });

    // Pausa a troca automática com mouse/foco no carrossel (o fundo continua)
    root.addEventListener("mouseenter", function () { hovering = true; });
    root.addEventListener("mouseleave", function () { hovering = false; });
    root.addEventListener("focusin", function () { hovering = true; });
    root.addEventListener("focusout", function () { hovering = false; });

    // Não gasta quadros fora da tela ou com a aba em segundo plano
    document.addEventListener("visibilitychange", function () { if (document.hidden) halt(); else kick(); });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        onScreen = entries[0].isIntersecting;
        if (onScreen) kick(); else halt();
      }).observe(root);
    }

    root.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") go(current - 1);
      if (e.key === "ArrowRight") go(current + 1);
    });
    var startX = null;
    root.addEventListener("touchstart", function (e) { startX = e.touches[0].clientX; hovering = true; }, { passive: true });
    root.addEventListener("touchend", function (e) {
      hovering = false;
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 40) go(current + (dx < 0 ? 1 : -1));
      startX = null;
    });

    setDots(0);
    setHidden();
    setPlaying(playing);
  });

  // --- Localização: abrir no app de mapas padrão ----------------------------
  var local = cfg.mapa || {};
  function openMaps() {
    if (local.lat == null) return;
    var ll = local.lat + "," + local.lng;
    var nome = cfg.localNome || "Procuradoria Geral do Município";
    var ua = navigator.userAgent || "";
    var isApple = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    var isAndroid = /Android/i.test(ua);
    if (isApple) {
      // iOS/iPadOS: abre o Apple Maps (ou o app definido como padrão)
      window.location.href = "https://maps.apple.com/?ll=" + ll + "&q=" + encodeURIComponent(nome);
    } else if (isAndroid) {
      // Android: geo: abre o app de mapas padrão (ou o seletor de apps)
      window.location.href = "geo:" + ll + "?q=" + ll + "(" + encodeURIComponent(nome) + ")";
    } else {
      window.open(local.link || ("https://www.google.com/maps/search/?api=1&query=" + ll), "_blank", "noopener");
    }
  }
  document.querySelectorAll("[data-open-maps]").forEach(function (el) {
    el.addEventListener("click", openMaps);
  });

  // --- Mapa (Leaflet + OpenStreetMap), carregado só quando chega perto da tela
  var mapEl = document.getElementById("mapa");
  function initMap() {
    if (!window.L || !mapEl || local.lat == null) return;
    mapEl.innerHTML = "";
    var pos = [local.lat, local.lng];
    var map = L.map(mapEl, { scrollWheelZoom: false, zoomControl: true }).setView(pos, local.zoom || 17);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
    }).addTo(map);

    var icon = L.divIcon({
      className: "map-pin",
      html: '<span class="map-pin__pulse"></span><span class="map-pin__body"></span>' +
            '<span class="map-pin__icon"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-pin"/></svg></span>',
      iconSize: [64, 80],
      iconAnchor: [32, 80],
      tooltipAnchor: [0, -78]
    });
    var marker = L.marker(pos, {
      icon: icon,
      keyboard: true,
      title: "Abrir trajeto no aplicativo de mapas",
      alt: "Procuradoria Geral do Município"
    }).addTo(map);
    marker.bindTooltip(cfg.localNome ? "PGM · Anexo PMC" : "Procuradoria", {
      permanent: true, direction: "top", className: "map-label"
    });
    marker.on("click", openMaps);
    var el = marker.getElement();
    if (el) el.setAttribute("role", "button");

    // Rolagem do mapa só depois de clicar nele (evita "prender" a página)
    map.on("click", function () { map.scrollWheelZoom.enable(); });
    map.on("mouseout", function () { map.scrollWheelZoom.disable(); });
  }
  function loadLeaflet() {
    if (window.L) { initMap(); return; }
    var sc = document.createElement("script");
    sc.src = "assets/vendor/leaflet/leaflet.js";
    sc.onload = initMap;
    document.head.appendChild(sc);
  }
  if (mapEl) {
    if ("IntersectionObserver" in window) {
      var mo = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { mo.disconnect(); loadLeaflet(); }
      }, { rootMargin: "400px" });
      mo.observe(mapEl);
    } else {
      loadLeaflet();
    }
  }

  // --- Popups dos pilares, presos à seção "A Procuradoria" -------------------
  var pillarLayer = document.getElementById("pillar-layer");
  var pillarDialog = document.getElementById("pillar-dialog");
  if (pillarLayer && pillarDialog) {
    var pillarN = document.getElementById("pillar-dialog-n");
    var pillarTitle = document.getElementById("pillar-dialog-title");
    var pillarText = pillarDialog.querySelector(".pillar-dialog__text");
    var pillarRole = pillarDialog.querySelector(".pillar-dialog__role");
    var pillarPhoto = pillarDialog.querySelector(".pillar-dialog__photo");
    var pillarBio = pillarDialog.querySelector(".pillar-dialog__bio");
    var pillarMedia = pillarDialog.querySelector(".pillar-dialog__media");
    var pillarHint = pillarDialog.querySelector(".pillar-dialog__hint");
    var pillarContact = pillarDialog.querySelector(".pillar-dialog__contact");
    var pillarClose = pillarDialog.querySelector(".pillar-dialog__close");
    var pillarOrg = document.getElementById("organograma");
    var pillarPanels = pillarDialog.querySelectorAll("[data-pillar-panel]");
    var pillarSection = pillarLayer.parentElement;
    var pillarOpener = null;

    function fitPillarSection() {
      if (pillarLayer.hidden) return;
      pillarSection.style.minHeight = "";
      var border = pillarDialog.offsetHeight - pillarDialog.clientHeight;
      var needed = pillarDialog.scrollHeight + border + 48;
      if (needed > pillarSection.offsetHeight) pillarSection.style.minHeight = needed + "px";
    }
    function addContactLine(label, value, href) {
      var line = document.createElement("span");
      var strong = document.createElement("strong");
      var link = document.createElement("a");
      strong.textContent = label + " ";
      link.href = href;
      link.textContent = value;
      line.className = "pillar-dialog__line";
      line.appendChild(strong);
      line.appendChild(link);
      pillarContact.appendChild(line);
    }
    pillarPhoto.addEventListener("load", fitPillarSection);
    window.addEventListener("resize", fitPillarSection);
    pillarDialog.addEventListener("toggle", fitPillarSection, true); // "toggle" dos <details> não borbulha

    function openPillar(btn) {
      var n = btn.querySelector(".pillar__n");
      var title = btn.querySelector("strong");
      var text = btn.querySelector("p");
      pillarDialog.style.setProperty("--pillar", btn.style.getPropertyValue("--pillar"));
      pillarN.textContent = n ? n.textContent : "";
      pillarTitle.textContent = btn.getAttribute("data-title") || (title ? title.textContent : "");
      pillarText.textContent = text ? text.textContent : "";

      var role = btn.getAttribute("data-role");
      var photo = btn.getAttribute("data-photo");
      var bio = btn.getAttribute("data-bio");
      var email = btn.getAttribute("data-email");
      var tel = btn.getAttribute("data-tel");
      var perfil = !!(role || photo || email || tel);
      pillarBio.hidden = !bio;
      pillarBio.textContent = bio || "";
      pillarContact.textContent = "";
      if (email) addContactLine("E-mail:", email, "mailto:" + email);
      if (tel) addContactLine("Tel.:", tel, "tel:+55" + tel.replace(/\D/g, ""));
      pillarContact.hidden = !(email || tel);
      pillarDialog.classList.toggle("pillar-dialog--perfil", perfil);
      pillarText.hidden = perfil || !pillarText.textContent;
      pillarRole.hidden = !role;
      pillarRole.textContent = role || "";
      var isOrg = btn.hasAttribute("data-org") && !!pillarOrg && !!window.PGMOrg;
      if (pillarOrg) pillarOrg.hidden = !isOrg;
      pillarDialog.classList.toggle("pillar-dialog--org", isOrg);
      if (isOrg) { perfil = false; pillarDialog.classList.remove("pillar-dialog--perfil"); pillarText.hidden = true; }
      var panelId = btn.getAttribute("data-panel");
      pillarPanels.forEach(function (p) {
        p.hidden = p.id !== panelId;
        p.querySelectorAll("details[open]").forEach(function (d) { d.open = false; });
      });
      pillarDialog.classList.toggle("pillar-dialog--panel", !!panelId);
      var wide = isOrg || btn.getAttribute("data-photo-shape") === "wide";
      pillarDialog.classList.toggle("pillar-dialog--wide", wide);
      pillarPhoto.hidden = !photo;
      pillarHint.hidden = !(photo && wide);
      if (photo) {
        pillarPhoto.src = photo;
        pillarPhoto.alt = btn.getAttribute("data-photo-alt") || (role ? "Foto do " + role : "");
      } else {
        pillarPhoto.removeAttribute("src");
        pillarPhoto.alt = "";
      }
      if (photo && wide) {
        pillarMedia.href = photo;
        pillarMedia.setAttribute("aria-label", "Abrir " + pillarPhoto.alt + " em tamanho real");
      } else {
        pillarMedia.removeAttribute("href");
        pillarMedia.removeAttribute("aria-label");
      }

      // cartão de perfil (foto + biografia): layout em duas colunas e abertura animada
      var bioCard = !!(photo && bio && !wide);
      pillarDialog.classList.toggle("pillar-dialog--bio", bioCard);
      if (bioCard && !role) {
        pillarRole.textContent = "Procuradoria Geral do Município de Camaçari";
        pillarRole.hidden = false;
      }
      pillarDialog.classList.remove("is-opening");
      void pillarDialog.offsetWidth; // reinicia as animações de abertura
      pillarDialog.classList.add("is-opening");

      pillarOpener = btn;
      pillarLayer.hidden = false;
      if (isOrg) { window.PGMOrg.mount(pillarOrg); window.PGMOrg.play(); }
      fitPillarSection();
      pillarClose.focus();
    }
    function closePillar() {
      if (pillarLayer.hidden) return;
      pillarLayer.hidden = true;
      pillarSection.style.minHeight = "";
      if (window.PGMOrg) window.PGMOrg.stop();
      if (pillarOpener) pillarOpener.focus();
    }

    document.querySelectorAll(".pillar").forEach(function (btn) {
      btn.addEventListener("click", function () { openPillar(btn); });
    });
    pillarLayer.querySelectorAll("[data-pillar-close]").forEach(function (el) {
      el.addEventListener("click", closePillar);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closePillar();
    });
  }

  // --- Fale Conosco -----------------------------------------------------------
  // Site estático: a mensagem segue pelo aplicativo de e-mail do usuário (mailto).
  var contactForm = document.getElementById("contact-form");
  if (contactForm) {
    var cf = contactForm.elements;
    var cfCount = document.getElementById("cf-contador");

    function updateCount() {
      cfCount.textContent = cf.mensagem.value.length + " / " + cf.mensagem.maxLength + " caracteres";
    }
    cf.mensagem.addEventListener("input", updateCount);

    function maskPhone(d) {
      if (!d) return "";
      if (d.length <= 2) return "(" + d;
      var ddd = "(" + d.slice(0, 2) + ") ", n = d.slice(2);
      if (n.length <= 4) return ddd + n;
      var cut = n.length === 9 ? 5 : 4;
      return ddd + n.slice(0, cut) + "-" + n.slice(cut);
    }
    function applyPhoneMask() { cf.telefone.value = maskPhone(cf.telefone.value.replace(/\D/g, "").slice(0, 11)); }
    cf.telefone.addEventListener("input", function (e) {
      if (e.inputType && e.inputType.indexOf("delete") === 0) return;
      applyPhoneMask();
    });
    cf.telefone.addEventListener("blur", applyPhoneMask);

    function maskCpf(d) {
      return d.replace(/^(\d{3})(\d)/, "$1.$2")
        .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
    }
    function cpfValido(d) {
      if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
      for (var t = 9; t < 11; t++) {
        var soma = 0;
        for (var i = 0; i < t; i++) soma += +d[i] * (t + 1 - i);
        if ((soma * 10) % 11 % 10 !== +d[t]) return false;
      }
      return true;
    }
    function checkCpf() {
      var d = cf.cpf.value.replace(/\D/g, "");
      cf.cpf.setCustomValidity(d.length === 11 && !cpfValido(d) ? "CPF inválido. Confira os números digitados." : "");
    }
    cf.cpf.addEventListener("input", function (e) {
      if (!(e.inputType && e.inputType.indexOf("delete") === 0)) {
        cf.cpf.value = maskCpf(cf.cpf.value.replace(/\D/g, "").slice(0, 11));
      }
      checkCpf();
    });
    cf.cpf.addEventListener("blur", function () {
      cf.cpf.value = maskCpf(cf.cpf.value.replace(/\D/g, "").slice(0, 11));
      checkCpf();
    });

    // Cards da direita: acompanham a altura do formulário só com o Aviso de Privacidade fechado
    var privacy = contactForm.querySelector(".privacy");
    var contactInfo = document.querySelector(".contact-info");
    if (privacy && contactInfo) {
      privacy.querySelector("summary").addEventListener("click", function () {
        if (privacy.open) return;
        contactInfo.style.height = contactInfo.offsetHeight + "px";
        contactInfo.classList.add("is-locked");
      });
      privacy.addEventListener("toggle", function () {
        if (privacy.open) return;
        contactInfo.style.height = "";
        contactInfo.classList.remove("is-locked");
      });
    }

    contactForm.addEventListener("invalid", function () { contactForm.classList.add("was-validated"); }, true);

    contactForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!cfg.email) { toast("Canal de e-mail disponível em breve."); return; }
      var linhas = [
        "Nome: " + cf.nome.value.trim(),
        "CPF: " + cf.cpf.value,
        "E-mail: " + cf.email.value.trim(),
        "Telefone: " + cf.telefone.value.trim()
      ];
      linhas.push("", cf.mensagem.value.trim(), "",
        "Aviso de Privacidade aceito em " + new Date().toLocaleString("pt-BR"),
        "Enviado pelo portal da PROGER");
      window.location.href = "mailto:" + cfg.email +
        "?subject=" + encodeURIComponent("[Portal PROGER] " + cf.assunto.value) +
        "&body=" + encodeURIComponent(linhas.join("\r\n"));
      toast("Abrindo seu aplicativo de e-mail…");
    });
  }

  // --- Ano no rodapé ----------------------------------------------------------
  document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  // --- Aviso simples ----------------------------------------------------------
  var toastTimer;
  function toast(text) {
    var el = document.querySelector(".toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "toast";
      el.setAttribute("role", "status");
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove("is-visible"); }, 3000);
  }
})();
