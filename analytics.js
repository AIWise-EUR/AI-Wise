/**
 * analytics.js
 * Lightweight event tracking for AI-Wise Module.
 *
 * SETUP — fill in ENDPOINT below with your Google Apps Script Web App URL.
 * See analytics-setup.gs for the server-side code to deploy.
 *
 * Events tracked automatically:
 *  - prompt_copy     : user clicks any "Copy … prompt" button
 *  - prompt_download : user clicks any "Download … prompt" button
 *  - diagnostic_result : user clicks "Get recommendation" (dispatched via
 *                        custom event 'aiwise:diagnostic' from the questionnaire page)
 */
(function () {

  /* ── CONFIGURATION ──────────────────────────────────────────
     Replace the empty string below with your deployed Apps Script URL.
     Format: https://script.google.com/macros/s/XXXXXXXX/exec
  ─────────────────────────────────────────────────────────── */
  var ENDPOINT = "https://script.google.com/macros/s/AKfycbyJFJW1CASqa3en_pGid025YGsuLR3VQaQc91Ve6L6fsdQIoe5qTMAOUpq6KyTRr7ET3A/exec";   // <-- paste your Web App URL here

  /* ── SEND ───────────────────────────────────────────────────
     Fire-and-forget POST.  Silently swallowed on any error so it
     never disrupts the student-facing UI.
  ─────────────────────────────────────────────────────────── */
  function send(eventType, data) {
    if (!ENDPOINT) return;          // do nothing until endpoint is configured
    var payload = JSON.stringify({
      eventType: eventType,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent.substring(0, 120),
      data: data || {}
    });

    /* Use fetch with no-cors — GAS handles this reliably */
    try {
      fetch(ENDPOINT, {
        method: "POST",
        mode: "no-cors",
        body: payload
      });
    } catch (e) {}
  }

  /* ── CURRENT STAGE ──────────────────────────────────────────
     Activity pages carry  data-stage="…"  on <body>.
     The diagnostic questionnaire has no data-stage; we call it "diagnostic".
  ─────────────────────────────────────────────────────────── */
  var stage = document.body.getAttribute("data-stage") || "diagnostic";

  /* ── PROMPT BUTTON TRACKING ─────────────────────────────────
     Matches any button whose id follows the convention:
       btn_copy_<promptType>   →  prompt_copy
       btn_download_<promptType> → prompt_download
  ─────────────────────────────────────────────────────────── */
  document.addEventListener("click", function (e) {
    var btn = e.target.closest("button[id]");
    if (!btn) return;

    var id = btn.id;
    if (id.indexOf("btn_copy_") === 0) {
      send("prompt_copy", {
        stage: stage,
        promptType: id.replace("btn_copy_", "")
      });
    } else if (id.indexOf("btn_download_") === 0) {
      send("prompt_download", {
        stage: stage,
        promptType: id.replace("btn_download_", "")
      });
    }
  });

  /* ── DIAGNOSTIC RESULT TRACKING ─────────────────────────────
     The diagnostic questionnaire dispatches a custom event
     'aiwise:diagnostic' right after it renders results.
     analytics.js listens here so the questionnaire page needs
     only one extra line — no other changes required.
  ─────────────────────────────────────────────────────────── */
  document.addEventListener("aiwise:diagnostic", function (e) {
    var d = e.detail || {};
    send("diagnostic_result", {
      recommendedStage: d.recommendedStage || "",
      checkedCount:     d.checkedCount     || 0,
      checkedNodes:     d.checkedNodes     || [],
      scores:           d.scores           || {}
    });
  });

  /* ── EXPOSE FOR MANUAL USE ──────────────────────────────────
     Other scripts can call window.AIWISE_ANALYTICS.send(type, data)
     if they need to fire custom events.
  ─────────────────────────────────────────────────────────── */
  window.AIWISE_ANALYTICS = { send: send };

})();
