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
      btn.disabled = true;
      fetch(form.action, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } })
        .then(function (r) {
          if (!r.ok) throw 0;
          // Some o formulário e mostra a confirmação no lugar, sem sair da página
          var done = document.getElementById("mensagem-confirmacao");
          form.reset(); form.hidden = true;
          if (done) { done.hidden = false; done.focus(); }
        })
        .catch(function () {
          btn.disabled = !check.checked;
          status.textContent = navigator.onLine === false
            ? "Não foi possível enviar agora. Verifique sua conexão e tente de novo."
            : "Algo deu errado ao enviar. Tente novamente em alguns minutos.";
        });
    });
  });

  /* ---------- Trevos: Reis e Rainhas + Portal de Transparência (planilhas Google publicadas como CSV) ---------- */
  var moeda = function (v) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); };

  // CSV simples com suporte a aspas (nomes com vírgula, valores "50,00")
  function parseCSV(text) {
    var rows = [], row = [], cell = "", q = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (q) {
        if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
        else if (c === '"') q = false;
        else cell += c;
      } else if (c === '"') q = true;
      else if (c === ",") { row.push(cell); cell = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(cell); rows.push(row); row = []; cell = "";
      } else cell += c;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }
  // Lê a planilha e devolve objetos com as colunas pedidas (pelo nome do cabeçalho)
  function loadSheet(url, cols) {
    if (!url) return Promise.resolve([]);
    return fetch(url, { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw 0; return r.text(); })
      .then(function (text) {
        var rows = parseCSV(text.trim());
        // Cabeçalho sem acento e sem "_url" ("descrição" = "descricao", "comprovante_url" = "comprovante")
        var head = (rows.shift() || []).map(function (h) {
          return h.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/_url$/, "");
        });
        return rows.filter(function (r) { return r.join("").trim() !== ""; }).map(function (r) {
          var o = {};
          cols.forEach(function (c, i) { var k = head.indexOf(c); o[c] = (r[k > -1 ? k : i] || "").trim(); });
          return o;
        });
      });
  }
  // Aceita "50", "50.5", "50,50", "1.234,56" e "R$ 50"
  function valorNum(raw) {
    var v = String(raw || "").replace(/[^\d,.-]/g, "");
    if (v.indexOf(",") > -1) v = v.replace(/\./g, "").replace(",", ".");
    return parseFloat(v) || 0;
  }
  function dataBR(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
    return m ? m[3] + "/" + m[2] + "/" + m[1] : iso;
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text; // textContent: nada da planilha vira HTML
    return e;
  }
  function setText(ids, text) { ids.forEach(function (id) { var e = document.getElementById(id); if (e) e.textContent = text; }); }
  function fillTable(tbody, rows) {
    if (!tbody || !rows.length) return;
    tbody.innerHTML = "";
    rows.forEach(function (cells) {
      var tr = document.createElement("tr");
      cells.forEach(function (c, i) { tr.appendChild(el("td", i === cells.length - 1 ? "num" : "", c)); });
      tbody.appendChild(tr);
    });
  }
  var porData = function (a, b) { return (b.data > a.data) - (b.data < a.data); };

  var board = document.querySelector("[data-donations]");
  var portal = document.getElementById("portal");
  if (board) {
    var ranking = document.getElementById("ranking-apoiadores");
    var lista = document.getElementById("lista-completa");
    var btnTodos = document.getElementById("btn-ver-todos");
    var nomeExibicao = function (d) { return d.exibir && d.nome ? d.nome : "Apoiador anônimo"; };

    var doacoesP = loadSheet(board.getAttribute("data-donations"), ["data", "nome", "valor", "mostrar_nome"])
      .then(function (rows) {
        return rows.map(function (r) {
          return { data: r.data, nome: r.nome, valor: valorNum(r.valor), exibir: r.mostrar_nome.toLowerCase() === "sim" };
        }).filter(function (d) { return d.valor > 0; });
      });
    var gastosP = loadSheet(portal && portal.getAttribute("data-expenses"), ["data", "descricao", "valor", "comprovante"])
      .then(function (rows) {
        return rows.map(function (r) { return { data: r.data, descricao: r.descricao, valor: valorNum(r.valor), comprovante: r.comprovante }; })
          .filter(function (g) { return g.valor > 0; });
      }).catch(function () { return []; });

    doacoesP.then(function (doacoes) {
      var total = doacoes.reduce(function (s, d) { return s + d.valor; }, 0);
      setText(["total-arrecadado", "total-arrecadado-portal", "portal-in"], moeda(total));
      setText(["msg-total", "msg-total-portal"], doacoes.length
        ? doacoes.length + (doacoes.length === 1 ? " doação registrada." : " doações registradas.")
        : "Nenhum lançamento registrado ainda.");

      var recentes = doacoes.slice().sort(porData);
      fillTable(document.getElementById("tabela-arrecadacao"), recentes.map(function (d) { return [dataBR(d.data), nomeExibicao(d), moeda(d.valor)]; }));
      if (!doacoes.length) return; // mantém o estado vazio do HTML

      // Ranking: até 10 maiores valores
      var ol = el("ol", "donors");
      doacoes.slice().sort(function (a, b) { return b.valor - a.valor; }).slice(0, 10).forEach(function (d, i) {
        var li = el("li", "donor" + (i < 3 ? " is-top" : ""));
        li.appendChild(el("span", "donor-pos display", (i + 1) + "º"));
        li.appendChild(el("p", "donor-name", nomeExibicao(d)));
        li.appendChild(el("p", "donor-value", moeda(d.valor)));
        ol.appendChild(li);
      });
      ranking.innerHTML = "";
      ranking.appendChild(ol);

      // Lista completa: mais recente primeiro
      lista.innerHTML = "";
      recentes.forEach(function (d) {
        var li = el("li", "rr-row");
        li.appendChild(el("span", "rr-date", dataBR(d.data)));
        li.appendChild(el("span", "rr-name", nomeExibicao(d)));
        li.appendChild(el("span", "rr-value", moeda(d.valor)));
        lista.appendChild(li);
      });
      btnTodos.hidden = false;
    }).catch(function () { /* sem rede ou planilha fora do ar: fica o estado do HTML */ });

    Promise.all([doacoesP.catch(function () { return []; }), gastosP]).then(function (res) {
      var entrou = res[0].reduce(function (s, d) { return s + d.valor; }, 0);
      var saiu = res[1].reduce(function (s, g) { return s + g.valor; }, 0);
      setText(["portal-out"], moeda(saiu));
      setText(["portal-bal"], moeda(entrou - saiu));
      var tbody = document.getElementById("tabela-gastos");
      if (tbody && res[1].length) {
        tbody.innerHTML = "";
        res[1].slice().sort(porData).forEach(function (g) {
          var tr = document.createElement("tr");
          tr.appendChild(el("td", "", dataBR(g.data)));
          tr.appendChild(el("td", "", g.descricao));
          tr.appendChild(el("td", "num", moeda(g.valor)));
          var td = el("td", "");
          if (/^https?:\/\//i.test(g.comprovante)) { // só links http(s)
            var a = el("a", "", "Ver comprovante");
            a.href = g.comprovante; a.target = "_blank"; a.rel = "noopener";
            td.appendChild(a);
          } else td.textContent = "—";
          tr.appendChild(td);
          tbody.appendChild(tr);
        });
      }
    });

    if (btnTodos) btnTodos.addEventListener("click", function () {
      var abrir = lista.hidden;
      lista.hidden = !abrir;
      btnTodos.setAttribute("aria-expanded", String(abrir));
      btnTodos.textContent = abrir ? "Ocultar lista completa" : "Ver todos os apoiadores";
    });
  }

  // Janelas (Portal de Transparência, Doação): <dialog> nativo
  document.querySelectorAll("[data-open-dialog]").forEach(function (b) {
    var dlg = document.getElementById(b.getAttribute("data-open-dialog"));
    if (!dlg) return;
    b.addEventListener("click", function () {
      if (!dlg.showModal) { location.hash = dlg.id === "portal" ? "transparencia" : "reis-e-rainhas"; return; }
      dlg._opener = b;
      dlg.showModal();
      document.documentElement.classList.add("has-modal");
    });
  });
  document.querySelectorAll("dialog.portal").forEach(function (dlg) {
    dlg.querySelectorAll("[data-close-dialog]").forEach(function (c) { c.addEventListener("click", function () { dlg.close(); }); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); }); // clique no fundo escuro fecha
    dlg.addEventListener("close", function () {
      document.documentElement.classList.remove("has-modal");
      if (dlg._opener) dlg._opener.focus({ preventScroll: true });
    });
    // Link para um bloco da própria página: fecha a janela e rola até lá
    dlg.querySelectorAll("[data-dialog-anchor]").forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        dlg._opener = null;
        dlg.close();
        document.documentElement.classList.remove("has-modal"); // libera a rolagem já
        var alvo = document.querySelector(a.getAttribute("href"));
        if (alvo) { alvo.scrollIntoView({ behavior: "smooth" }); history.replaceState(null, "", a.getAttribute("href")); }
      });
    });
  });

  /* ---------- Coringa: copiar chave Pix ---------- */
  document.querySelectorAll("[data-copy-key]").forEach(function (box) {
    var key = box.getAttribute("data-copy-key");
    var btn = box.querySelector(".pix-copy"), status = box.querySelector(".pix-copy-status");
    var timer;
    function done(ok) {
      btn.textContent = ok ? "Copiado!" : "Copiar chave Pix";
      btn.classList.toggle("is-copied", ok);
      status.textContent = ok ? "Chave copiada. Agora é só colar no app do seu banco." : "Não deu pra copiar automaticamente. Selecione a chave acima e copie.";
      clearTimeout(timer);
      timer = setTimeout(function () { btn.textContent = "Copiar chave Pix"; btn.classList.remove("is-copied"); status.textContent = ""; }, 2500);
    }
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = key; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand("copy"); } catch (e) {}
      document.body.removeChild(ta);
      done(ok);
    }
    btn.addEventListener("click", function () {
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(key).then(function () { done(true); }, fallback);
      else fallback();
    });
  });

  /* ---------- Régua horizontal (linha do tempo): botões + arrastar com o mouse ---------- */
  document.querySelectorAll("[data-rail]").forEach(function (rail) {
    var sec = rail.closest("section");
    var prev = sec.querySelector("[data-rail-prev]"), next = sec.querySelector("[data-rail-next]");
    var step = function () { var it = rail.querySelector(".ri"); return it ? it.getBoundingClientRect().width + 20 : 320; };
    function update() {
      if (prev) prev.disabled = rail.scrollLeft < 4;
      if (next) next.disabled = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 4;
    }
    if (prev) prev.addEventListener("click", function () { rail.scrollBy({ left: -step() * 2 }); });
    if (next) next.addEventListener("click", function () { rail.scrollBy({ left: step() * 2 }); });
    rail.addEventListener("scroll", update, { passive: true });
    rail.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); rail.scrollBy({ left: step() }); }
      if (e.key === "ArrowLeft") { e.preventDefault(); rail.scrollBy({ left: -step() }); }
    });
    var down = false, startX = 0, startLeft = 0, moved = false;
    rail.addEventListener("pointerdown", function (e) {
      if (e.pointerType !== "mouse" || e.target.closest("a, button")) return;
      down = true; moved = false; startX = e.clientX; startLeft = rail.scrollLeft;
    });
    window.addEventListener("pointermove", function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 4) { moved = true; rail.classList.add("is-dragging"); }
      rail.scrollLeft = startLeft - dx;
    });
    window.addEventListener("pointerup", function () {
      if (!down) return;
      down = false; rail.classList.remove("is-dragging");
    });
    rail.addEventListener("click", function (e) { if (moved) { e.preventDefault(); moved = false; } }, true);
    update();
  });

  /* ---------- Compartilhar (WhatsApp) ---------- */
  var shareBtn = document.getElementById("share-btn");
  var shareMsg = [
    "*Solta a Carta*",
    "Confira o movimento que está virando o jogo contra as apostas:",
    "",
    "🌐 Site: https://lbsetti.github.io/solta-a-carta/",
    "📸 Instagram: https://www.instagram.com/projetosoltaacarta/",
    "📘 Facebook: https://www.facebook.com/profile.php?id=61594390811809",
    "🔗 Todos os links: https://linktr.ee/projetosoltaacarta"
  ].join("\n");

  if (shareBtn) shareBtn.addEventListener("click", function () {
    window.open("https://wa.me/?text=" + encodeURIComponent(shareMsg), "_blank", "noopener");
  });
})();
