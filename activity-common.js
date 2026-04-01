/**
 * activity-common.js
 * Shared logic for all AI-Wise activity pages:
 *  - Fast-track navigation panel (injected into page)
 *  - Preset prompt copy / download
 *  - Dialog popup handling
 *  - Button press effects
 */
(function () {
  /* ── CONFIG ──────────────────────────────────────────────── */
  var PAGE_MAP = {
    exploring:  "exploring-topic.html",
    rq:         "research-question.html",
    searching:  "searching-literature.html",
    organizing: "organizing-literature.html",
    outline:    "draft-outline.html",
    writing:    "writing-sections.html",
    finalizing: "finalizing-paper.html"
  };

  var STAGE_LABELS = {
    exploring:  "Exploring a Topic",
    rq:         "Research Question",
    searching:  "Searching Literature",
    organizing: "Organizing Literature",
    outline:    "Draft Structure",
    writing:    "Writing Sections",
    finalizing: "Finalizing the Paper"
  };

  var STAGE_ORDER = ["exploring", "rq", "searching", "organizing", "outline", "writing", "finalizing"];

  /* ── DETECT CURRENT STAGE ───────────────────────────────── */
  var currentStage = document.body.getAttribute("data-stage") || "";

  /* ── FAST-TRACK PANEL ───────────────────────────────────── */
  function buildFastTrackPanel() {
    var panel = document.createElement("div");
    panel.className = "fast-track-panel";

    var heading = '<p class="fast-track-heading">Steps</p>';
    heading += '<p class="fast-track-desc">Navigate between activity steps.</p>';

    var steps = '<div class="fast-track-steps">';
    STAGE_ORDER.forEach(function (stage, i) {
      var isCurrent = stage === currentStage;
      var cls = "fast-track-step" + (isCurrent ? " is-current" : "");
      steps += '<a class="' + cls + '" href="' + PAGE_MAP[stage] + '">'
            +  '<span class="fast-track-step-num">' + (i + 1) + '</span> '
            +  STAGE_LABELS[stage]
            +  '</a>';
    });
    steps += '</div>';

    var diagLink = '<div class="fast-track-divider"></div>'
      + '<a class="fast-track-diag-link" href="diagnostic-questionnaire-final.html">Diagnostic Questionnaire</a>';

    panel.innerHTML = heading + steps + diagLink;
    return panel;
  }

  /* Inject panel into the page layout */
  function injectFastTrack() {
    var content = document.querySelector(".page-content");
    if (!content) return;

    /* Wrap existing content in a layout container */
    var shell = content.parentElement;
    if (!shell) return;

    var layout = document.createElement("div");
    layout.className = "activity-layout";

    var main = document.createElement("div");
    main.className = "activity-main";

    /* Move all children of shell into main */
    while (shell.firstChild) {
      main.appendChild(shell.firstChild);
    }

    var panel = buildFastTrackPanel();
    layout.appendChild(main);
    layout.appendChild(panel);
    shell.appendChild(layout);
  }

  injectFastTrack();

  /* ── PRESET PROMPT HELPERS ──────────────────────────────── */
  window.AIWISE_COMMON = window.AIWISE_COMMON || {};

  window.AIWISE_COMMON.setButtonFeedback = function (button, message) {
    if (!button) return;
    var original = button.textContent;
    button.textContent = message;
    setTimeout(function () { button.textContent = original; }, 1300);
  };

  window.AIWISE_COMMON.copyPrompt = function (text, button) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        window.AIWISE_COMMON.setButtonFeedback(button, "Copied");
      }).catch(function () {
        window.AIWISE_COMMON.setButtonFeedback(button, "Copy failed");
      });
      return;
    }
    window.AIWISE_COMMON.setButtonFeedback(button, "Clipboard unavailable");
  };

  window.AIWISE_COMMON.downloadPrompt = function (text, filename) {
    var blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  /**
   * Wire up a standard prompt block (copy + download + view).
   * @param {string} promptText  The prompt string
   * @param {string} preId       ID of the <pre> element
   * @param {string} copyBtnId   ID of copy button
   * @param {string} dlBtnId     ID of download button
   * @param {string} filename    Download filename
   */
  window.AIWISE_COMMON.wirePromptBlock = function (promptText, preId, copyBtnId, dlBtnId, filename) {
    var pre = document.getElementById(preId);
    var copyBtn = document.getElementById(copyBtnId);
    var dlBtn = document.getElementById(dlBtnId);

    if (pre) pre.textContent = promptText;

    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        window.AIWISE_COMMON.copyPrompt(promptText, copyBtn);
      });
    }

    if (dlBtn) {
      dlBtn.addEventListener("click", function () {
        window.AIWISE_COMMON.downloadPrompt(promptText, filename);
      });
    }
  };

  /* ── DIALOG POPUPS ──────────────────────────────────────── */
  document.querySelectorAll("[data-dialog-id]").forEach(function (trigger) {
    var dialogId = trigger.getAttribute("data-dialog-id");
    var dialog = dialogId ? document.getElementById(dialogId) : null;
    if (!dialog || typeof dialog.showModal !== "function") return;
    trigger.addEventListener("click", function () { dialog.showModal(); });
  });

  document.querySelectorAll("[data-dialog-close]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var dialog = btn.closest("dialog");
      if (dialog) dialog.close();
    });
  });

  document.querySelectorAll("dialog.content-popup").forEach(function (dialog) {
    dialog.addEventListener("click", function (e) {
      if (e.target === dialog) dialog.close();
    });
  });

  /* ── BUTTON PRESS EFFECT ────────────────────────────────── */
  document.addEventListener("click", function (e) {
    var btn = e.target.closest("button");
    if (!btn) return;
    btn.classList.remove("pressFx");
    void btn.offsetWidth;
    btn.classList.add("pressFx");
  });

})();
