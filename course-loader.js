/**
 * course-loader.js
 * Fills course specific slots in a page from courses/<id>.json.
 *
 * Which course:
 *   1. ?course=<id> in the URL (also remembered for later pages)
 *   2. previously remembered course (localStorage)
 *   3. data-default-course on <html>, else "aws1"
 *
 * Slots:
 *   <el data-slot="course.short_name"></el>              text slot, filled with textContent
 *   <el data-slot="c2.examples" data-slot-type="carousel"> list slot, rendered by a renderer
 *
 * A course file may declare  "extends": "<base-id>"  — the base course
 * is fetched and deep-merged under it, so the file only needs the keys
 * that differ from the base.
 *
 * When every slot is filled the loader sets window.AIWISE_COURSE and
 * dispatches "aiwise:course-loaded" on document. Page scripts that
 * depend on slot content (e.g. the carousel) should wait for that.
 */
(function () {
  var STORAGE_KEY = "aiwise-course";
  var DEFAULT_ID = document.documentElement.getAttribute("data-default-course") || "aws1";

  /* ── course id ─────────────────────────────────────────── */
  function resolveCourseId() {
    var fromUrl = null;
    try { fromUrl = new URLSearchParams(window.location.search).get("course"); } catch (e) {}
    if (fromUrl) {
      try { localStorage.setItem(STORAGE_KEY, fromUrl); } catch (e) {}
      return fromUrl;
    }
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return saved;
    } catch (e) {}
    return DEFAULT_ID;
  }

  /* ── path lookup: "c2.examples" → data.c2.examples ─────── */
  function getPath(obj, path) {
    var parts = path.split(".");
    var cur = obj;
    for (var i = 0; i < parts.length; i++) {
      if (cur == null) return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }

  /* ── small DOM helpers (all text goes through textContent) ─ */
  function el(tag, className, text) {
    var n = document.createElement(tag);
    if (className) n.className = className;
    if (text != null) n.textContent = text;
    return n;
  }

  /* ── renderers by data-slot-type ───────────────────────── */
  var RENDERERS = {

    /* C2 "what you think / what you type / how the model processes" cards */
    carousel: function (container, items) {
      container.innerHTML = "";
      var total = items.length;

      function layer(kind, label, node) {
        var wrap = el("div", "carousel-layer layer-" + kind);
        var lab = el("div", "carousel-layer-label");
        lab.appendChild(el("span", "dot"));
        lab.appendChild(document.createTextNode(label));
        wrap.appendChild(lab);
        wrap.appendChild(node);
        return wrap;
      }

      items.forEach(function (item, i) {
        var slide = el("div", "carousel-slide");
        var card = el("div", "carousel-card");

        var header = el("div", "carousel-card-header");
        header.appendChild(el("span", "card-num", "Example " + (i + 1) + " of " + total));
        header.appendChild(document.createTextNode(" " + (item.title || "")));
        card.appendChild(header);

        var layers = el("div", "carousel-layers");

        layers.appendChild(layer("thinking", "What you are actually thinking",
          el("p", null, item.thinking || "")));

        var typingP = el("p");
        if (item.typing_note) {
          typingP.appendChild(el("em", null, item.typing_note));
          typingP.appendChild(document.createElement("br"));
        }
        typingP.appendChild(document.createTextNode(item.typing || ""));
        layers.appendChild(layer("typing", "What you type", typingP));

        layers.appendChild(layer("processing", "How the model actually processes this",
          el("p", null, item.processing || "")));

        card.appendChild(layers);
        slide.appendChild(card);
        container.appendChild(slide);
      });
    },

    /* C3 technique-panel example: {bad?, good} strings; \n in good becomes <br> */
    "prompt-example": function (container, data) {
      container.innerHTML = "";
      function line(cls, prefix, text) {
        var d = el("div", cls);
        String(prefix + text).split("\n").forEach(function (part, i) {
          if (i) d.appendChild(document.createElement("br"));
          d.appendChild(document.createTextNode(part));
        });
        container.appendChild(d);
      }
      if (data.bad != null) line("ex-bad", "\u2717 ", data.bad);
      if (data.good != null) line("ex-good", "\u2713 ", data.good);
    },

    /* C3 Adopt/Modify/Discard worked example: {title, intro, items:[{text, tag, reason}]} */
    "amd-example": function (container, data) {
      container.innerHTML = "";
      container.appendChild(el("div", "amd-example-title", data.title || ""));
      var intro = el("p", null, data.intro || "");
      intro.setAttribute("style", "font-size:12.5px;color:var(--muted);margin-bottom:14px;line-height:1.6;");
      container.appendChild(intro);
      var TAG_LABELS = { adopt: "Adopt", modify: "Modify", discard: "Discard" };
      (data.items || []).forEach(function (item) {
        var row = el("div", "amd-item");
        row.appendChild(el("div", "amd-item-text", item.text || ""));
        row.appendChild(el("span", "amd-tag amd-tag-" + item.tag, TAG_LABELS[item.tag] || item.tag));
        row.appendChild(el("div", "amd-reason", item.reason || ""));
        container.appendChild(row);
      });
    },

    /* C3 Markdown code panel: [{heading, lines:[...]}] */
    "md-panel": function (container, sections) {
      container.innerHTML = "";
      sections.forEach(function (s, i) {
        if (i) container.appendChild(document.createTextNode("\n\n"));
        container.appendChild(el("span", "heading", "# " + s.heading));
        (s.lines || []).forEach(function (lineText) {
          container.appendChild(document.createTextNode("\n"));
          container.appendChild(el("span", "comment", lineText));
        });
      });
    },

    /* C3 XML code panel: [{tag, lines:[...]}] */
    "xml-panel": function (container, sections) {
      container.innerHTML = "";
      sections.forEach(function (s, i) {
        if (i) container.appendChild(document.createTextNode("\n\n"));
        container.appendChild(el("span", "tag", "<" + s.tag + ">"));
        container.appendChild(document.createTextNode("\n"));
        container.appendChild(el("span", "comment", (s.lines || []).join("\n")));
        container.appendChild(document.createTextNode("\n"));
        container.appendChild(el("span", "tag", "</" + s.tag + ">"));
      });
    }
  };

  /* ── fill every slot ───────────────────────────────────── */
  function fillSlots(data) {
    var slots = document.querySelectorAll("[data-slot]");
    slots.forEach(function (node) {
      var path = node.getAttribute("data-slot");
      var value = getPath(data, path);
      var type = node.getAttribute("data-slot-type");

      if (value === undefined) {
        console.warn("[course-loader] no value for slot:", path);
        return;
      }
      if (type && RENDERERS[type]) {
        RENDERERS[type](node, value);
      } else if (typeof value === "string" || typeof value === "number") {
        node.textContent = String(value);
      } else {
        console.warn("[course-loader] slot has no renderer for its value:", path);
      }
    });
  }

  function announce(data, id) {
    window.AIWISE_COURSE = data;
    window.AIWISE_COURSE_ID = id;
    window.AIWISE_COURSE_READY = true;
    document.dispatchEvent(new CustomEvent("aiwise:course-loaded", { detail: { id: id, data: data } }));
  }

  /* ── load ──────────────────────────────────────────────── */

  /* plain objects merge key by key; anything else (strings, arrays) is replaced */
  function deepMerge(base, override) {
    var isObj = function (v) { return v !== null && typeof v === "object" && !Array.isArray(v); };
    if (!isObj(override)) return override;
    var out = {};
    if (isObj(base)) Object.keys(base).forEach(function (k) { out[k] = base[k]; });
    Object.keys(override).forEach(function (k) { out[k] = deepMerge(out[k], override[k]); });
    return out;
  }

  function fetchCourse(id, seen) {
    seen = seen || {};
    if (seen[id]) return Promise.reject(new Error("circular extends: " + id));
    seen[id] = true;
    return fetch("courses/" + encodeURIComponent(id) + ".json", { cache: "no-cache" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (data) {
        if (!data.extends) return data;
        return fetchCourse(data.extends, seen).then(function (base) {
          var merged = deepMerge(base, data);
          delete merged.extends;
          return merged;
        });
      });
  }

  function load(id, isFallback) {
    return fetchCourse(id)
      .then(function (data) {
        fillSlots(data);
        announce(data, id);
      })
      .catch(function (err) {
        console.error("[course-loader] could not load course '" + id + "':", err);
        if (!isFallback && id !== DEFAULT_ID) return load(DEFAULT_ID, true);
        /* nothing loaded: still announce so pages do not hang */
        announce(null, null);
      });
  }

  function start() { load(resolveCourseId(), false); }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
