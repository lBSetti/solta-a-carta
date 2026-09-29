/* Solta a Carta — comportamento do site */
(function () {
  "use strict";

  /* ---------- Acentos na Ananias ----------
     A fonte não tem letras acentuadas nem ª/º. Troca cada uma pela
     letra base em maiúscula + acento desenhado em CSS; o caractere
     original continua disponível para leitores de tela. */
  var ACC = {
    "á": ["A", "acute"], "à": ["A", "grave"], "â": ["A", "circ"], "ã": ["A", "tilde"],
    "é": ["E", "acute"], "ê": ["E", "circ"], "í": ["I", "acute"],
    "ó": ["O", "acute"], "ô": ["O", "circ"], "õ": ["O", "tilde"],
    "ú": ["U", "acute"], "ç": ["C", "cedil"], "ª": ["A", "ord"], "º": ["O", "ord"]
  };
  function accentize(root) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var nodes = [], n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(function (node) {
      var text = node.data;
      if (!/[áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇªº]/.test(text)) return;
      var frag = document.createDocumentFragment();
      // palavras com acento ficam num span sem quebra, para o acento desenhado
      // nunca separar a palavra em duas linhas
      text.split(/(\s+)/).forEach(function (word) {
        if (!/[áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇªº]/.test(word)) { frag.appendChild(document.createTextNode(word)); return; }
        var w = document.createElement("span");
        w.className = "acc-word";
        buildWord(word, w);
        frag.appendChild(w);
      });
      node.parentNode.replaceChild(frag, node);
    });
  }
  function buildWord(text, frag) {
      var buf = "";
      for (var i = 0; i < text.length; i++) {
        var ch = text[i], m = ACC[ch.toLowerCase()];
        if (!m) { buf += ch; continue; }
        if (buf) { frag.appendChild(document.createTextNode(buf)); buf = ""; }
        var wrap = document.createElement("span");
        wrap.className = m[1] === "ord" ? "acc-ord" : "acc acc-" + m[1];
        var shown = document.createElement("span");
        shown.setAttribute("aria-hidden", "true");
        shown.textContent = m[0];
        var real = document.createElement("span");
        real.className = "sr-only";
        real.textContent = ch;
        wrap.appendChild(shown);
        wrap.appendChild(real);
        frag.appendChild(wrap);
      }
      if (buf) frag.appendChild(document.createTextNode(buf));
  }
  document.querySelectorAll(".hand").forEach(accentize);

  /* ---------- Navegação por naipes ----------
     Desktop: hover/foco revela o rótulo (CSS).
     Touch: 1º toque revela o rótulo, 2º toque navega. */
  var touchOnly = window.matchMedia("(hover: none)");
  var links = Array.prototype.slice.call(document.querySelectorAll(".site-header .suit-link"));
  var hint = document.getElementById("nav-hint");
  var hintLink = hint.querySelector(".nav-hint-link");
  var hintLabel = hint.querySelector(".nav-hint-label");

  function closeAll() {
    links.forEach(function (l) { l.classList.remove("is-open"); });
    hint.hidden = true;
  }

  links.forEach(function (link) {
    link.addEventListener("click", function (e) {
      if (!touchOnly.matches) return;               // mouse/teclado: navega direto
      if (link.classList.contains("is-open")) return; // 2º toque: navega
      e.preventDefault();
      closeAll();
      link.classList.add("is-open");
      hintLabel.textContent = link.dataset.label;
      hintLink.href = link.getAttribute("href");
      hint.hidden = false;
    });
  });

  document.addEventListener("click", function (e) {
    if (!e.target.closest(".site-header")) closeAll();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeAll();
  });
  window.addEventListener("scroll", function () {
    if (!hint.hidden) closeAll();
  }, { passive: true });

  /* ---------- Vídeo do logo no hero ----------
     Toca uma vez; respeita "reduzir movimento" (fica no pôster). */
  var video = document.querySelector(".hero-video");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (video && document.querySelector(".hero-card") && !reduceMotion.matches) {
    var p = video.play();
    if (p && p.catch) p.catch(function () { /* autoplay bloqueado: mantém o pôster */ });
    document.querySelector(".hero-card").addEventListener("mouseenter", function () {
      if (video.ended) { video.currentTime = 0; video.play(); }
    });
  }

  /* ---------- Linha do tempo: cartas que crescem e viram ----------
     Mouse: abre ao passar por cima, fecha ao sair.
     Toque e teclado: toque/Enter vira e desvira. Esc fecha. */
  var canHover = window.matchMedia("(hover: hover)");
  document.querySelectorAll("[data-timeline]").forEach(function (tl) {
    var cards = Array.prototype.slice.call(tl.querySelectorAll(".tl-card"));
    function setOpen(card, open) {
      if (open && !card.classList.contains("is-open")) {
        // cresce para baixo se não couber acima (abaixo do cabeçalho fixo)
        var header = document.querySelector(".site-header");
        var top = header ? header.getBoundingClientRect().bottom : 0;
        var openH = parseFloat(getComputedStyle(card.closest(".tl-scroller")).getPropertyValue("--tl-open-h")) || 480;
        card.classList.toggle("grow-down", card.getBoundingClientRect().bottom - top < openH + 16);
      }
      card.classList.toggle("is-open", open);
      card.querySelector(".tl-toggle").setAttribute("aria-expanded", open ? "true" : "false");
    }
    function openOnly(card) {
      cards.forEach(function (c) { setOpen(c, c === card); });
    }
    cards.forEach(function (card) {
      var btn = card.querySelector(".tl-toggle");
      btn.addEventListener("click", function (e) {
        var isOpen = card.classList.contains("is-open");
        // com mouse, o hover já abriu: o clique não deve fechar em seguida
        if (canHover.matches && e.detail > 0 && isOpen) return;
        isOpen ? setOpen(card, false) : openOnly(card);
      });
      card.addEventListener("mouseenter", function () { if (canHover.matches) openOnly(card); });
      card.addEventListener("mouseleave", function () { if (canHover.matches) setOpen(card, false); });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") cards.forEach(function (c) { setOpen(c, false); });
    });
    document.addEventListener("click", function (e) {
      if (!tl.contains(e.target)) cards.forEach(function (c) { setOpen(c, false); });
    });
  });

  /* ---------- Abas (setas do teclado navegam entre elas) ---------- */
  document.querySelectorAll("[data-tabs]").forEach(function (box) {
    var tabs = Array.prototype.slice.call(box.querySelectorAll('[role="tab"]'));
    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
      });
      if (focus) tab.focus();
    }
    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () { select(tab); });
      tab.addEventListener("keydown", function (e) {
        var next = null;
        if (e.key === "ArrowDown" || e.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
        if (e.key === "ArrowUp" || e.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
        if (e.key === "Home") next = tabs[0];
        if (e.key === "End") next = tabs[tabs.length - 1];
        if (next) { e.preventDefault(); select(next, true); }
      });
    });
  });

  /* ---------- Cartas de mito: viram no hover (mouse) ou no toque/Enter ---------- */
  document.querySelectorAll(".flip").forEach(function (card) {
    var btn = card.querySelector(".flip-toggle");
    function set(on) {
      card.classList.toggle("is-flipped", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    }
    btn.addEventListener("click", function (e) {
      if (canHover.matches && e.detail > 0) return; // com mouse, o hover já vira
      set(!card.classList.contains("is-flipped"));
    });
    card.addEventListener("mouseenter", function () { if (canHover.matches) set(true); });
    card.addEventListener("mouseleave", function () { if (canHover.matches) set(false); });
  });

  /* ---------- Moeda: cada lançamento é independente ---------- */
  document.querySelectorAll("[data-coin]").forEach(function (box) {
    var coin = box.querySelector(".coin");
    var btn = box.querySelector(".coin-btn");
    var hist = box.querySelector(".coin-history");
    var status = box.querySelector(".coin-status");
    var rot = 0, streak = 0, last = null, results = [];
    btn.addEventListener("click", function () {
      var cara = Math.random() < 0.5;
      // gira duas voltas inteiras e para na face sorteada (cara = 0°, coroa = 180°)
      var cur = ((rot % 360) + 360) % 360;
      rot += 720 + (((cara ? 0 : 180) - cur + 360) % 360);
      coin.style.transform = "rotateY(" + rot + "deg)";
      streak = (last === cara) ? streak + 1 : 1;
      last = cara;
      results.push(cara);
      if (results.length > 12) results.shift();
      window.setTimeout(function () {
        hist.innerHTML = results.map(function (r) {
          return '<li class="' + (r ? "ca" : "co") + '" title="' + (r ? "Cara" : "Coroa") + '">' + (r ? "Ca" : "Co") + "</li>";
        }).join("");
        var face = cara ? "cara" : "coroa", other = cara ? "coroa" : "cara";
        status.innerHTML = streak > 1
          ? "Deu " + face + " <strong>" + streak + " vezes seguidas</strong>. A chance da próxima ser " + other + "? Continua <strong>50%</strong>."
          : "Deu " + face + ". A chance da próxima ser " + other + " é <strong>50%</strong>, como sempre.";
      }, reduceMotion.matches ? 0 : 900);
    });
  });

  /* ---------- Gráficos simples gerados no carregamento ---------- */
  document.querySelectorAll("[data-waffle]").forEach(function (el) {
    var on = parseInt(el.getAttribute("data-waffle"), 10);
    for (var i = 0; i < 100; i++) {
      var s = document.createElement("span");
      if (i < on) s.className = "on";
      el.appendChild(s);
    }
  });
  document.querySelectorAll("[data-shirts]").forEach(function (el) {
    var n = parseInt(el.getAttribute("data-shirts"), 10);
    for (var i = 0; i < n; i++) {
      el.insertAdjacentHTML("beforeend",
        '<svg viewBox="0 0 24 24" aria-hidden="true" style="--i:' + i + '"><use href="#i-shirt"/></svg>');
    }
  });

  /* ---------- Entrada suave dos blocos ao rolar ---------- */
  var reveals = document.querySelectorAll(".reveal");
  if (reveals.length) {
    if (!("IntersectionObserver" in window) || reduceMotion.matches) {
      document.documentElement.classList.add("no-reveal");
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); }
        });
      }, { threshold: 0.2 });
      reveals.forEach(function (el) { io.observe(el); });
    }
  }

  /* ---------- Copas: quiz, portão de conteúdo sensível e formulário ---------- */
  document.querySelectorAll("[data-quiz]").forEach(function (form) {
    var res = form.querySelector(".quiz-result"), count = form.querySelector("[data-count]");
    var bands = [
      [0, 0, "Nenhum sinal identificado."],
      [1, 3, "Mantenha atenção. Sua relação com o jogo pode escalar para a ludopatia."],
      [4, 5, "Ludopatia leve, segundo os critérios do DSM-5."],
      [6, 7, "Ludopatia moderada, segundo os critérios do DSM-5."],
      [8, 9, "Ludopatia grave, segundo os critérios do DSM-5."]
    ];
    form.addEventListener("change", function () {
      count.textContent = form.querySelectorAll("input:checked").length;
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var answered = form.querySelectorAll("input:checked");
      if (answered.length < 9) {
        var first = form.querySelector("fieldset:not(:has(input:checked)) input");
        count.textContent = answered.length + " (faltam " + (9 - answered.length) + ")";
        if (first) first.focus();
        return;
      }
      var yes = 0;
      answered.forEach(function (i) { yes += +i.value; });
      var band = bands.filter(function (b) { return yes >= b[0] && yes <= b[1]; })[0];
      res.querySelector(".quiz-score").textContent = yes + " de 9 com sim";
      res.querySelector(".quiz-text").textContent = band[2];
      accentize(res.querySelector(".quiz-score"));
      res.hidden = false;
      res.focus();
    });
  });

  var gateBtn = document.querySelector("[data-open-gate]");
  if (gateBtn) {
    var gate = document.getElementById("gate"), stories = document.getElementById("stories");
    gateBtn.addEventListener("click", function () {
      if (!stories.hidden) { stories.focus(); return; }
      gate.hidden = false; gate.focus();
    });
    gate.querySelector("[data-gate-yes]").addEventListener("click", function () {
      gate.hidden = true; stories.hidden = false; stories.focus();
    });
    gate.querySelector("[data-gate-no]").addEventListener("click", function () {
      gate.hidden = true; gateBtn.focus();
    });
  }

  document.querySelectorAll("[data-story-form]").forEach(function (form) {
    var btn = form.querySelector('button[type="submit"]'), check = form.querySelector('input[type="checkbox"]');
    var status = form.querySelector(".sf-status");
    check.addEventListener("change", function () { btn.disabled = !check.checked; });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (/SEU_ENDPOINT/.test(form.action)) {
        status.textContent = "O envio de relatos ainda está sendo configurado. Tente novamente em breve.";
        return;
      }
      btn.disabled = true;
      fetch(form.action, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } })
        .then(function (r) {
          if (!r.ok) throw 0;
          form.reset(); btn.disabled = true;
          status.textContent = "Recebemos seu relato. Obrigado por confiar essa história pra gente. Ela pode ajudar outras pessoas a se reconhecerem e buscarem ajuda.";
        })
        .catch(function () {
          btn.disabled = !check.checked;
          status.textContent = "Não conseguimos enviar agora. Tente novamente em alguns minutos.";
        });
    });
  });

  /* ---------- Trevos: relatos reaproveitados de Copas (sem duplicar texto) ---------- */
  document.querySelectorAll("[data-load-stories]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var slot = btn.closest(".xcard-body").querySelector(".stories-slot");
      btn.disabled = true;
      fetch("apoio-e-ajuda.html").then(function (r) { return r.text(); }).then(function (html) {
        var doc = new DOMParser().parseFromString(html, "text/html");
        var list = doc.querySelector("#stories .story-list"), note = doc.querySelector("#stories .src");
        slot.innerHTML = "";
        if (list) slot.appendChild(document.importNode(list, true));
        if (note) slot.appendChild(document.importNode(note, true));
        btn.closest(".xwarn").hidden = true;
        slot.focus();
      }).catch(function () {
        slot.innerHTML = '<p>Não foi possível carregar os relatos aqui. <a href="apoio-e-ajuda.html#relatos">Leia na página Apoio &amp; Ajuda</a>.</p>';
      });
    });
  });

  /* ---------- Trevos: notícias a partir de planilha Google publicada como CSV ---------- */
  function parseCSV(text) {
    var rows = [], row = [], cell = "", q = false;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (q) {
        if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
        else if (ch === '"') q = false;
        else cell += ch;
      } else if (ch === '"') q = true;
      else if (ch === ",") { row.push(cell); cell = ""; }
      else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(cell); rows.push(row); row = []; cell = "";
      } else cell += ch;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }
  document.querySelectorAll("[data-news]").forEach(function (box) {
    var url = box.getAttribute("data-sheet");
    if (!url) return;
    fetch(url).then(function (r) { return r.text(); }).then(function (csv) {
      var rows = parseCSV(csv).filter(function (r) { return r.join("").trim(); });
      var head = rows.shift().map(function (h) { return h.trim().toLowerCase(); });
      var col = function (r, k) { return r[head.indexOf(k)] || ""; };
      var esc = function (s) { var d = document.createElement("div"); d.textContent = s; return d.innerHTML; };
      var cards = rows.map(function (r) {
        var body = col(r, "corpo").split(/\n\s*\n/).map(function (p) { return "<p>" + esc(p.trim()) + "</p>"; }).join("");
        return '<details class="xcard"><summary><span class="xcard-kind">' + esc(col(r, "data")) + '</span><span class="xcard-title">' +
          esc(col(r, "titulo")) + '</span><span class="xcard-sum">' + esc(col(r, "resumo")) +
          '</span><span class="xcard-more" aria-hidden="true">Ler notícia</span></summary><div class="xcard-body">' + body + "</div></details>";
      });
      if (cards.length) box.innerHTML = cards.join("") + box.innerHTML;
    }).catch(function () { /* mantém os cards fixos */ });
  });

  /* ---------- Compartilhar ---------- */
  var shareBtn = document.getElementById("share-btn");
  var feedback = document.getElementById("share-feedback");
  var shareData = {
    title: "Solta a Carta",
    text: "Virando o jogo contra as casas de aposta.",
    url: window.location.href.split("#")[0]
  };

  if (shareBtn) shareBtn.addEventListener("click", function () {
    if (navigator.share) {
      navigator.share(shareData).catch(function () {});
      return;
    }
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareData.url).then(function () {
        feedback.textContent = "Link copiado. Agora é só colar para quem você quiser.";
      }, function () {
        feedback.textContent = "Copie o endereço da página e compartilhe.";
      });
    } else {
      feedback.textContent = "Copie o endereço da página e compartilhe.";
    }
  });
})();
