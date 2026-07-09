/* ============================================================
   StackPilot — client-side app
   Panels: config (left) -> generated masterclass (middle)
           -> RAG source verification (right)
   ============================================================ */

(() => {
  "use strict";

  // ---------- DOM handles ----------
  const $ = (sel) => document.querySelector(sel);

  const els = {
    stackBtn: $("#stack-btn"),
    stackMenu: $("#stack-menu"),
    stackLabel: $("#stack-label"),
    stackDot: $("#stack-dot"),
    stackChevron: $("#stack-chevron"),
    modeToggle: $("#mode-toggle"),
    goal: $("#goal-input"),
    generateBtn: $("#generate-btn"),
    genIcon: $("#gen-icon"),
    genSpinner: $("#gen-spinner"),
    genLabel: $("#gen-label"),
    geminiKey: $("#gemini-key"),
    engineLabel: $("#engine-label"),
    feed: $("#feed"),
    feedEmpty: $("#feed-empty"),
    feedContent: $("#feed-content"),
    workspaceStatus: $("#workspace-status"),
    workspaceMeta: $("#workspace-meta"),
    sources: $("#sources"),
    sourcesEmpty: $("#sources-empty"),
    sourceCount: $("#source-count"),
    modal: $("#doc-modal"),
    modalBackdrop: $("#modal-backdrop"),
    modalCard: $("#modal-card"),
    modalTag: $("#modal-tag"),
    modalTitle: $("#modal-title"),
    modalOrigin: $("#modal-origin"),
    modalBody: $("#modal-body"),
    modalClose: $("#modal-close"),
    toast: $("#toast"),
  };

  const state = {
    stack: STACKS[0],
    mode: "deep-dive",
    generating: false,
    envKey: "",       // GEMINI_API_KEY loaded from .env
    data: null,       // last rendered RAG response
    codeRegistry: [], // raw code strings for copy buttons
  };

  /** Effective API key: session override from the input beats .env. */
  const apiKey = () => els.geminiKey.value.trim() || state.envKey;

  // ============================================================
  // Text helpers
  // ============================================================

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /** Inline mini-syntax: `code`, **bold**, [[n]] citations. Escapes first. */
  function renderInline(text) {
    return escapeHtml(text)
      .replace(/`([^`]+)`/g, '<span class="inline-code">$1</span>')
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(
        /\[\[(\d+)\]\]/g,
        (_, n) =>
          `<button type="button" class="cite-chip" data-source="${n}" title="View source [${n}] in the RAG sidebar" aria-label="Citation ${n}">${n}</button>`
      );
  }

  // ============================================================
  // Syntax highlighting (lightweight, regex tokenizer)
  // ============================================================

  const KEYWORDS = {
    js: "const|let|var|function|return|async|await|import|export|from|default|if|else|for|of|in|new|class|extends|try|catch|finally|throw|typeof|instanceof|null|undefined|true|false|this",
    ts: "const|let|var|function|return|async|await|import|export|from|default|if|else|for|of|in|new|class|extends|try|catch|finally|throw|typeof|instanceof|null|undefined|true|false|this|type|interface|as|satisfies|enum|readonly|number|string|boolean|void|unknown|any",
    sql: "CREATE|TABLE|EXTENSION|IF|NOT|EXISTS|ALTER|ENABLE|FORCE|ROW|LEVEL|SECURITY|POLICY|FOR|ALL|TO|USING|WITH|CHECK|INDEX|ON|SELECT|INSERT|INTO|UPDATE|DELETE|FROM|WHERE|GROUP|ORDER|BY|LIMIT|VALUES|SET|LOCAL|BEGIN|COMMIT|ROLLBACK|AND|OR|AS|COUNT|DEFAULT|PRIMARY|KEY|REFERENCES|UNIQUE|NULL",
    bash: "npm|npx|pnpm|node|export|echo|cd|curl|git|psql",
  };

  function highlightCode(raw, lang) {
    const kw = KEYWORDS[lang] || KEYWORDS.js;
    const comment =
      lang === "sql" ? "--[^\\n]*"
      : lang === "bash" ? "#[^\\n]*"
      : "\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/";
    const flags = lang === "sql" ? "gi" : "g";

    // Alternation order = precedence: comments, strings, keywords, functions, numbers
    const re = new RegExp(
      `(${comment})` +
        `|("(?:\\\\.|[^"\\\\])*"|'(?:\\\\.|[^'\\\\])*'|\`(?:\\\\.|[^\`\\\\])*\`)` +
        `|\\b(${kw})\\b` +
        `|\\b([A-Za-z_]\\w*)(?=\\s*\\()` +
        `|\\b(\\d[\\d_]*(?:\\.\\d+)?)\\b`,
      flags
    );

    let out = "";
    let last = 0;
    let m;
    while ((m = re.exec(raw)) !== null) {
      out += escapeHtml(raw.slice(last, m.index));
      const cls = m[1] ? "tok-com" : m[2] ? "tok-str" : m[3] ? "tok-kw" : m[4] ? "tok-fn" : "tok-num";
      out += `<span class="${cls}">${escapeHtml(m[0])}</span>`;
      last = m.index + m[0].length;
    }
    out += escapeHtml(raw.slice(last));
    return out;
  }

  /** Modal doc view: markdown text with headings / fences / inline code tinted. */
  function renderDoc(md) {
    let inFence = false;
    return md
      .split("\n")
      .map((line) => {
        const esc = escapeHtml(line);
        if (/^\s*```/.test(line)) {
          inFence = !inFence;
          return `<span class="md-code">${esc}</span>`;
        }
        if (inFence) return `<span class="md-code">${esc}</span>`;
        if (/^#{1,4}\s/.test(line)) return `<span class="md-h">${esc}</span>`;
        if (/^\s*&gt;|^\s*>/.test(esc)) return `<span class="md-quote">${esc}</span>`;
        return esc.replace(/`([^`]+)`/g, '<span class="md-code">`$1`</span>');
      })
      .join("\n");
  }

  // ============================================================
  // Renderers
  // ============================================================

  function blockHtml(block, index, headingCounter) {
    const delay = `style="animation-delay:${Math.min(index * 45, 500)}ms"`;
    switch (block.type) {
      case "h2":
        return `<h2 class="blk blk-h2" ${delay}><span class="h-index">${String(headingCounter).padStart(2, "0")}</span>${renderInline(block.text)}</h2>`;
      case "h3":
        return `<h3 class="blk blk-h3" ${delay}>${renderInline(block.text)}</h3>`;
      case "p":
        return `<p class="blk blk-p" ${delay}>${renderInline(block.text)}</p>`;
      case "list": {
        const tag = block.ordered ? "ol" : "ul";
        const cls = block.ordered ? "is-ordered" : "is-unordered";
        const items = (block.items || []).map((it) => `<li>${renderInline(it)}</li>`).join("");
        return `<${tag} class="blk blk-list ${cls}" ${delay}>${items}</${tag}>`;
      }
      case "code": {
        const idx = state.codeRegistry.push(block.code) - 1;
        return `
          <figure class="blk code-block" ${delay}>
            <div class="code-head">
              <span class="code-label">
                <span class="lang-pill">${escapeHtml(block.lang || "code")}</span>
                <span class="truncate">${escapeHtml(block.label || "")}</span>
              </span>
              <button type="button" class="copy-btn" data-code="${idx}">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>
                <span>Copy Code</span>
              </button>
            </div>
            <pre class="panel-scroll"><code>${highlightCode(block.code, block.lang)}</code></pre>
          </figure>`;
      }
      case "callout":
        return `
          <aside class="blk callout" ${delay}>
            <div class="callout-title">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg>
              ${renderInline(block.title || "Note")}
            </div>
            <div class="callout-body">${renderInline(block.text)}</div>
          </aside>`;
      default:
        return "";
    }
  }

  function renderFeed(data) {
    state.codeRegistry = [];
    let headingCounter = 0;

    const header = `
      <header class="blk pb-2">
        <p class="text-[11px] font-mono text-neon/80 tracking-[0.18em] uppercase">Masterclass Path · ${escapeHtml(state.stack.label)}</p>
        <h1 class="mt-2.5 text-[1.7rem] leading-tight font-extrabold tracking-tight">${escapeHtml(data.meta.title)}</h1>
        <p class="mt-2.5 text-[0.95rem] text-muted leading-relaxed">${escapeHtml(data.meta.subtitle || "")}</p>
      </header>`;

    const body = data.blocks
      .map((b, i) => {
        if (b.type === "h2") headingCounter += 1;
        return blockHtml(b, i + 1, headingCounter);
      })
      .join("");

    els.feedContent.innerHTML = header + body + `<div class="h-16"></div>`;
    els.feed.scrollTop = 0;
  }

  function renderSources(sources) {
    els.sourcesEmpty.classList.add("hidden");
    els.sources.innerHTML = sources
      .map(
        (s, i) => `
        <article class="source-card" data-source-id="${s.id}" style="animation-delay:${i * 70}ms">
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-2 min-w-0">
              <span class="h-5 w-5 shrink-0 grid place-items-center rounded-md bg-canvas border border-edge font-mono text-[9.5px] font-bold text-neon">${s.id}</span>
              <h3 class="text-[12.5px] font-semibold leading-snug truncate" title="${escapeHtml(s.title)}">${escapeHtml(s.title)}</h3>
            </div>
            <span class="file-tag">${escapeHtml(s.tag || "DOC")}</span>
          </div>
          <p class="mt-2 text-[11.5px] leading-relaxed text-muted line-clamp-2">${escapeHtml(s.snippet)}</p>
          <p class="mt-2 text-[10px] font-mono text-muted/60 truncate">${escapeHtml(s.origin || "")}</p>
          <button type="button" class="view-docs-btn" data-doc="${s.id}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
            View Full Docs
          </button>
        </article>`
      )
      .join("");
    els.sourceCount.textContent = `${sources.length} retrieved`;
  }

  // ---------- Skeletons ----------
  function showSkeletons() {
    els.feedEmpty.classList.add("hidden");
    els.workspaceStatus.classList.add("hidden");
    els.feedContent.innerHTML = `
      <div class="space-y-5 pt-2" aria-hidden="true">
        <div class="skel h-4 w-40"></div>
        <div class="skel h-9 w-4/5"></div>
        <div class="skel h-4 w-3/5"></div>
        <div class="pt-4 space-y-3">
          <div class="skel h-4 w-full"></div>
          <div class="skel h-4 w-11/12"></div>
          <div class="skel h-4 w-4/6"></div>
        </div>
        <div class="skel h-44 w-full !rounded-xl"></div>
        <div class="space-y-3">
          <div class="skel h-4 w-full"></div>
          <div class="skel h-4 w-5/6"></div>
        </div>
        <div class="skel h-24 w-full !rounded-xl"></div>
      </div>`;
    els.sourcesEmpty.classList.add("hidden");
    els.sources.innerHTML = [0, 1, 2, 3]
      .map(
        (i) => `
        <div class="rounded-[10px] border border-edge bg-card p-3.5 space-y-2.5" aria-hidden="true" style="opacity:${1 - i * 0.15}">
          <div class="flex justify-between gap-3"><div class="skel h-4 w-2/3"></div><div class="skel h-4 w-8"></div></div>
          <div class="skel h-3 w-full"></div>
          <div class="skel h-3 w-4/5"></div>
          <div class="skel h-7 w-full !rounded-md"></div>
        </div>`
      )
      .join("");
    els.sourceCount.textContent = "retrieving…";
  }

  // ============================================================
  // Interactions
  // ============================================================

  // ---------- Custom dropdown ----------
  function buildDropdown() {
    els.stackMenu.innerHTML = STACKS.map(
      (s) => `
      <li role="option" data-stack="${s.id}" aria-selected="${s.id === state.stack.id}">
        <span class="opt-dot" style="background:${s.color}"></span>
        <span class="truncate">${escapeHtml(s.label)}</span>
        <span class="opt-sub">${escapeHtml(s.sub)}</span>
      </li>`
    ).join("");
  }

  function setDropdownOpen(open) {
    els.stackMenu.classList.toggle("hidden", !open);
    els.stackBtn.setAttribute("aria-expanded", String(open));
    els.stackChevron.style.transform = open ? "rotate(180deg)" : "";
  }

  els.stackBtn.addEventListener("click", () =>
    setDropdownOpen(els.stackMenu.classList.contains("hidden"))
  );

  els.stackMenu.addEventListener("click", (e) => {
    const li = e.target.closest("li[data-stack]");
    if (!li) return;
    state.stack = STACKS.find((s) => s.id === li.dataset.stack) || state.stack;
    els.stackLabel.textContent = state.stack.label;
    els.stackDot.style.background = state.stack.color;
    buildDropdown();
    setDropdownOpen(false);
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest("#stack-dropdown")) setDropdownOpen(false);
  });

  // ---------- Mode toggle ----------
  els.modeToggle.addEventListener("click", (e) => {
    const btn = e.target.closest(".mode-btn");
    if (!btn) return;
    state.mode = btn.dataset.mode;
    els.modeToggle.querySelectorAll(".mode-btn").forEach((b) => {
      const active = b === btn;
      b.classList.toggle("mode-active", active);
      b.classList.toggle("text-muted", !active);
      b.setAttribute("aria-selected", String(active));
    });
  });

  // ---------- Generate ----------
  function setLoading(loading) {
    state.generating = loading;
    els.generateBtn.disabled = loading;
    els.genIcon.classList.toggle("hidden", loading);
    els.genSpinner.classList.toggle("hidden", !loading);
    els.genLabel.textContent = loading ? "Synthesizing path…" : "Generate Masterclass Path";
  }

  function renderError(title, detail) {
    els.feedContent.innerHTML = `
      <div class="blk mt-6 rounded-xl border border-red-400/30 bg-red-400/5 p-5">
        <p class="text-[13px] font-semibold text-red-300 flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg>
          ${escapeHtml(title)}
        </p>
        <p class="mt-2 text-[12.5px] leading-relaxed text-muted">${detail}</p>
      </div>`;
    els.sources.innerHTML = "";
    els.sources.appendChild(els.sourcesEmpty);
    els.sourcesEmpty.classList.remove("hidden");
    els.sourceCount.textContent = "0 retrieved";
  }

  async function handleGenerate() {
    if (state.generating) return;

    const key = apiKey();
    if (!key || key === "PASTE_YOUR_KEY_HERE") {
      showToast(`No Gemini API key found. Add <span class="font-mono text-neon">GEMINI_API_KEY</span> to <span class="font-mono">.env</span> and reload (serve via <span class="font-mono">node server.js</span>).`);
      els.geminiKey.focus();
      return;
    }

    setLoading(true);
    showSkeletons();
    els.workspaceMeta.textContent = `${state.stack.label} · ${state.mode}`;

    try {
      els.engineLabel.textContent = "calling Gemini…";
      const { data, model } = await generateWithGemini(key, {
        stack: state.stack.label,
        mode: state.mode,
        goal: els.goal.value.trim(),
      });
      els.engineLabel.textContent = `${model} · live`;
      state.data = data;
      renderSources(data.sources);
      renderFeed(data);
      els.workspaceStatus.classList.remove("hidden");
    } catch (err) {
      els.engineLabel.textContent = "request failed";
      renderError(
        "Generation failed",
        `${escapeHtml(err.message)}<br><br>Common causes: invalid key in <span class="font-mono">.env</span>, free-tier rate limit (wait ~60s), or no network. Fix and hit <span class="text-neon">Generate</span> again.`
      );
      showToast(`Gemini request failed. <span class="text-muted">(${escapeHtml(err.message)})</span>`);
    }
    setLoading(false);
  }

  els.generateBtn.addEventListener("click", handleGenerate);

  // ---------- Citations -> highlight source card ----------
  function flashSource(id) {
    const card = els.sources.querySelector(`[data-source-id="${id}"]`);
    if (!card) return;
    els.sources.querySelectorAll(".cite-flash").forEach((c) => c.classList.remove("cite-flash"));
    // force reflow so the flash animation can retrigger on the same card
    void card.offsetWidth;
    card.classList.add("cite-flash");
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => card.classList.remove("cite-flash"), 1800);
  }

  els.feedContent.addEventListener("click", (e) => {
    const cite = e.target.closest(".cite-chip");
    if (cite) return flashSource(cite.dataset.source);

    const copy = e.target.closest(".copy-btn");
    if (copy) {
      const raw = state.codeRegistry[Number(copy.dataset.code)] ?? "";
      navigator.clipboard.writeText(raw).then(
        () => {
          copy.classList.add("copied");
          copy.querySelector("span").textContent = "Copied ✓";
          setTimeout(() => {
            copy.classList.remove("copied");
            copy.querySelector("span").textContent = "Copy Code";
          }, 1600);
        },
        () => showToast("Clipboard unavailable in this context.")
      );
    }
  });

  // ---------- Source card -> modal ----------
  els.sources.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-doc]");
    if (!btn || !state.data) return;
    const src = state.data.sources.find((s) => String(s.id) === btn.dataset.doc);
    if (src) openModal(src);
  });

  function openModal(src) {
    els.modalTag.textContent = src.tag || "DOC";
    els.modalTitle.textContent = src.title;
    els.modalOrigin.textContent = src.origin || "";
    els.modalBody.innerHTML = renderDoc(src.doc || src.snippet || "");
    els.modal.classList.remove("hidden");
    els.modal.classList.add("flex");
    requestAnimationFrame(() => {
      els.modalBackdrop.classList.remove("opacity-0");
      els.modalCard.classList.remove("opacity-0", "translate-y-3", "scale-[.98]");
    });
    els.modalClose.focus();
  }

  function closeModal() {
    els.modalBackdrop.classList.add("opacity-0");
    els.modalCard.classList.add("opacity-0", "translate-y-3", "scale-[.98]");
    setTimeout(() => {
      els.modal.classList.add("hidden");
      els.modal.classList.remove("flex");
    }, 200);
  }

  els.modalClose.addEventListener("click", closeModal);
  els.modalBackdrop.addEventListener("click", closeModal);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!els.modal.classList.contains("hidden")) closeModal();
      setDropdownOpen(false);
    }
  });

  // ---------- Toast ----------
  let toastTimer;
  function showToast(html) {
    els.toast.innerHTML = html;
    els.toast.classList.add("show");
    els.toast.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      els.toast.classList.add("hidden");
      els.toast.classList.remove("show");
    }, 5200);
  }

  // ---------- Init ----------
  /** Reads GEMINI_API_KEY from ./.env (works when served over HTTP,
      e.g. `node server.js` — file:// pages cannot fetch local files). */
  async function loadEnv() {
    try {
      const res = await fetch(".env", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const text = await res.text();
      const m = text.match(/^\s*GEMINI_API_KEY\s*=\s*(.+?)\s*$/m);
      const val = m ? m[1].replace(/^["']|["']$/g, "") : "";
      return val && val !== "PASTE_YOUR_KEY_HERE" ? val : "";
    } catch (_) {
      return "";
    }
  }

  buildDropdown();
  loadEnv().then((key) => {
    state.envKey = key;
    if (key) {
      els.engineLabel.textContent = `${GEMINI_MODELS[0]} · key loaded from .env`;
      els.geminiKey.placeholder = "loaded from .env (paste to override)";
    } else {
      els.engineLabel.textContent = "no API key — set .env & serve via node server.js";
      document.getElementById("engine-dot")?.classList.replace("bg-neon", "bg-red-400");
    }
  });
})();
