/* =========================================================
   KORA — front-end interactions
   ========================================================= */
(function () {
  "use strict";

  /* ---- Mobile menu ---- */
  var burger = document.getElementById("burger");
  var navMobile = document.getElementById("navMobile");
  if (burger && navMobile) {
    burger.addEventListener("click", function () {
      var open = navMobile.hasAttribute("hidden");
      if (open) { navMobile.removeAttribute("hidden"); navMobile.style.display = "flex"; }
      else { navMobile.setAttribute("hidden", ""); navMobile.style.display = "none"; }
      burger.setAttribute("aria-expanded", String(open));
    });
    navMobile.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        navMobile.setAttribute("hidden", ""); navMobile.style.display = "none";
        burger.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* Language switching is handled by i18n.js for every page. */

  /* ---- Scroll reveal ---- */
  var revealTargets = [
    ".section__title", ".section__lead", ".step", ".stat", ".node", ".problem",
    ".benefit", ".role", ".module", ".pcard", ".mcard", ".tcard", ".flow__node",
    ".impact li", ".hub__center", ".pillar", ".operator__card", ".breakdown"
  ];
  var els = document.querySelectorAll(revealTargets.join(","));
  els.forEach(function (el) { el.setAttribute("data-reveal", ""); });

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add("is-visible"); io.unobserve(entry.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    els.forEach(function (el) { io.observe(el); });
  } else {
    els.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---- Active nav link on scroll ---- */
  var sections = ["why-now", "ecosystem", "who-uses", "intelligence", "trust"]
    .map(function (id) { return document.getElementById(id); }).filter(Boolean);
  var navLinks = document.querySelectorAll('.nav__links a');

  function onScroll() {
    var pos = window.scrollY + 120, current = "";
    sections.forEach(function (sec) { if (sec.offsetTop <= pos) current = sec.id; });
    navLinks.forEach(function (link) {
      var href = link.getAttribute("href").replace("#", "");
      link.style.color = (href === current) ? "var(--clay)" : "";
      link.style.background = (href === current) ? "rgba(113,61,43,.09)" : "";
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---- Reflect signed-in state in the navbar ---- */
  (function () {
    if (!window.KORA) return;
    window.KORA.get("/me").then(function (r) {
      if (!r || !r.user) return;
      var login = document.querySelector('.nav__actions .btn--ghost-ink');
      var start = document.querySelector('.nav__actions .btn--gold');
      if (login) { login.textContent = "Dashboard"; login.setAttribute("href", "/dashboard"); }
      if (start) { start.textContent = r.user.name.split(" ")[0]; start.setAttribute("href", "/dashboard"); }
    }).catch(function () { /* not signed in — leave Login / Get started */ });
  })();
})();
