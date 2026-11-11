/* Tiny fetch wrapper for the KORA API. Sends/receives JSON, keeps the
   session cookie, and throws an Error with the server message on failure. */
window.KORA = (function () {
  "use strict";
  async function call(path, opts) {
    opts = opts || {};
    var res = await fetch("/api" + path, {
      method: opts.method || "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    var data = {};
    try { data = await res.json(); } catch (e) {}
    if (!res.ok) {
      throw new Error((data && data.error) || ("Request failed (" + res.status + ")"));
    }
    return data;
  }
  return {
    get: function (p) { return call(p); },
    post: function (p, body) { return call(p, { method: "POST", body: body }); },
    del: function (p, body) { return call(p, { method: "DELETE", body: body }); },
    esc: function (s) {
      return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
      });
    },
  };
})();
