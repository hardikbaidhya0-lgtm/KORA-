/* =========================================================
   KORA i18n engine.
   - Translates every visible text node on the page by looking up its
     English text in KORA_TR_ROWS (translations.js). No per-element keys.
   - Also translates input placeholders and <option> labels.
   - A MutationObserver translates content added later (dashboard lists,
     error messages, button states), so dynamic UI follows the language too.
   - The choice is saved in localStorage and applied on every page.
   ========================================================= */
(function () {
  "use strict";

  var LANGS = ["en", "hi", "te", "ta", "gu", "mr", "pa"];
  var COL = { hi: 1, te: 2, ta: 3, gu: 4, mr: 5, pa: 6 };
  var SKIP = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, SELECT: 1, OPTION: 1, TEXTAREA: 1, svg: 1, SVG: 1, use: 1 };

  function norm(s) { return String(s == null ? "" : s).replace(/\s+/g, " ").trim(); }

  var MAP = {};
  (window.KORA_TR_ROWS || []).forEach(function (row) { MAP[norm(row[0])] = row; });

  var current = "en";
  try { current = localStorage.getItem("kora-lang") || "en"; } catch (e) {}
  if (LANGS.indexOf(current) < 0) current = "en";

  /* translate a single English string for the current language */
  function t(en) {
    if (current === "en") return en;
    var row = MAP[norm(en)];
    return (row && row[COL[current]]) || en;
  }

  var origText = new WeakMap();   // text node -> original English
  var origAttr = new WeakMap();   // element   -> {placeholder, option text}

  function skipped(node) {
    var el = node.nodeType === 1 ? node : node.parentNode;
    while (el && el !== document.body && el.nodeType === 1) {
      if (SKIP[el.nodeName] || el.hasAttribute("data-i18n-skip")) return true;
      el = el.parentNode;
    }
    return false;
  }

  function doText(node) {
    var o = origText.get(node);
    if (o === undefined) {
      o = node.nodeValue;
      if (!o || !o.trim()) return;
      origText.set(node, o);
    }
    var next = o;
    if (current !== "en") {
      var m = o.match(/^(\s*)([\s\S]*?)(\s*)$/);
      var row = MAP[norm(m[2])];
      var tr = row && row[COL[current]];
      if (tr) next = m[1] + tr + m[3];
    }
    if (node.nodeValue !== next) node.nodeValue = next;
  }

  function doAttrs(el) {
    var rec = origAttr.get(el);
    if (!rec) {
      rec = {};
      if (el.hasAttribute("placeholder")) rec.ph = el.getAttribute("placeholder");
      if (el.nodeName === "OPTION") rec.opt = el.textContent;
      origAttr.set(el, rec);
    }
    if (rec.ph != null) el.setAttribute("placeholder", t(rec.ph));
    if (rec.opt != null) {
      var v = t(rec.opt);
      if (el.textContent !== v) el.textContent = v;
    }
  }

  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { if (!skipped(root)) doText(root); return; }
    if (root.nodeType !== 1) return;
    if (!skipped(root)) {
      var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: function (n) { return skipped(n) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; }
      });
      var n; while ((n = w.nextNode())) doText(n);
    }
    var attrEls = root.querySelectorAll
      ? root.querySelectorAll("[placeholder], select:not([data-lang-select]) option")
      : [];
    if (root.matches && root.matches("[placeholder]")) doAttrs(root);
    for (var i = 0; i < attrEls.length; i++) doAttrs(attrEls[i]);
  }

  function syncSelects() {
    document.querySelectorAll("select[data-lang-select]").forEach(function (s) { s.value = current; });
  }

  var baseTitle = document.title;
  function apply(lang) {
    if (LANGS.indexOf(lang) < 0) lang = "en";
    current = lang;
    try { localStorage.setItem("kora-lang", lang); } catch (e) {}
    document.documentElement.setAttribute("lang", lang);
    walk(document.body);
    document.title = baseTitle.split(" · ").map(t).join(" · ");
    syncSelects();
  }

  /* translate anything the app adds later (lists, messages, button states) */
  if ("MutationObserver" in window) {
    new MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) {
        var added = records[i].addedNodes;
        for (var j = 0; j < added.length; j++) walk(added[j]);
      }
    }).observe(document.body, { childList: true, subtree: true });
  }

  /* wire every language selector on the page */
  document.querySelectorAll("select[data-lang-select]").forEach(function (s) {
    s.addEventListener("change", function () { apply(s.value); });
  });

  window.KORAI18N = { apply: apply, t: t, lang: function () { return current; } };

  apply(current);
})();
