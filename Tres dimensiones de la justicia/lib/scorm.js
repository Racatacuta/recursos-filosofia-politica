/* Puente mínimo con SCORM 1.2 para Moodle. Si no hay LMS (por ejemplo, al abrir el archivo en un navegador),
   el recurso guarda el avance en localStorage solo para poder probarlo. */
(function () {
  "use strict";
  var api = null, ready = false, closed = false, inited = false, LS = "dd_facturaclima_estado";

  function findApi() {
    var w = window, t = 0;
    while (!w.API && w.parent && w.parent !== w) { if (++t > 7) break; w = w.parent; }
    if (!w.API && window.opener) {
      var o = window.opener, t2 = 0;
      while (!o.API && o.parent && o.parent !== o) { if (++t2 > 7) break; o = o.parent; }
      return o.API || null;
    }
    return w.API || null;
  }

  var S = {
    connected: false,
    init: function () {
      if (inited) return;
      inited = true;
      api = findApi();
      if (api) {
        var r = api.LMSInitialize("");
        ready = (r === "true" || r === true);
        S.connected = ready;
        if (ready) {
          var st = api.LMSGetValue("cmi.core.lesson_status");
          if (!st || st === "not attempted") { api.LMSSetValue("cmi.core.lesson_status", "incomplete"); }
          api.LMSCommit("");
        }
      }
    },
    getState: function () {
      var raw = "";
      if (ready) { raw = api.LMSGetValue("cmi.suspend_data") || ""; }
      else { try { raw = window.localStorage.getItem(LS) || ""; } catch (e) {} }
      try { return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
    },
    setState: function (obj) {
      var raw = JSON.stringify(obj);
      if (ready) { api.LMSSetValue("cmi.suspend_data", raw); api.LMSCommit(""); }
      else { try { window.localStorage.setItem(LS, raw); } catch (e) {} }
    },
    /* nota: escala 0-5. Se reporta a Moodle como 0-100. */
    report: function (nota, aprobada, completo) {
      if (!ready) return;
      if (completo) {
        api.LMSSetValue("cmi.core.score.min", "0");
        api.LMSSetValue("cmi.core.score.max", "100");
        api.LMSSetValue("cmi.core.score.raw", String(Math.round(nota / 5 * 10000) / 100));
        api.LMSSetValue("cmi.core.lesson_status", aprobada ? "passed" : "failed");
        api.LMSSetValue("cmi.core.exit", "");
      } else {
        api.LMSSetValue("cmi.core.lesson_status", "incomplete");
        api.LMSSetValue("cmi.core.exit", "suspend");
      }
      api.LMSCommit("");
    },
    finish: function () {
      if (ready && !closed) { api.LMSCommit(""); api.LMSFinish(""); closed = true; }
    },
    resetLocal: function () { try { window.localStorage.removeItem(LS); } catch (e) {} }
  };
  window.SCORM = S;
  window.addEventListener("load", S.init);
  window.addEventListener("beforeunload", S.finish);
  window.addEventListener("pagehide", S.finish);
})();
