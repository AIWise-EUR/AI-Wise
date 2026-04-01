/**
 * analytics-setup.gs
 * Google Apps Script — Web App backend for AI-Wise analytics.
 *
 * ── HOW TO DEPLOY ────────────────────────────────────────────────────────────
 * 1. Open Google Drive → New → More → Google Apps Script
 * 2. Delete the default code and paste this entire file.
 * 3. Click  Deploy → New deployment
 *      Type:           Web app
 *      Execute as:     Me
 *      Who has access: Anyone
 * 4. Authorize and copy the Web App URL that appears.
 * 5. Open analytics.js in this project and paste the URL into the ENDPOINT var.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Spreadsheet structure created automatically:
 *
 *  Sheet "Prompt Events"
 *    A  Timestamp (ISO)
 *    B  Event type  (prompt_copy | prompt_download)
 *    C  Stage       (exploring | searching | … | diagnostic)
 *    D  Prompt type (course_prompt | activity_prompt | grammar_prompt | …)
 *    E  User-agent  (truncated)
 *
 *  Sheet "Diagnostic Results"
 *    A  Timestamp (ISO)
 *    B  Recommended stage
 *    C  Checked items count
 *    D  Checked node IDs    (comma-separated, e.g. RQ11,RQ12,RU21)
 *    E  Stage scores JSON   (e.g. {"exploring":100,"rq":60,…})
 *    F  User-agent          (truncated)
 */

/* ── CORS helper ──────────────────────────────────────────── */
function addCorsHeaders(output) {
  return output
    .setHeader("Access-Control-Allow-Origin", "*")
    .setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
    .setHeader("Access-Control-Allow-Headers", "Content-Type");
}

/* ── OPTIONS pre-flight (browsers send this before POST) ──── */
function doGet(e) {
  return addCorsHeaders(
    ContentService.createTextOutput("ok")
      .setMimeType(ContentService.MimeType.TEXT)
  );
}

/* ── MAIN HANDLER ─────────────────────────────────────────── */
function doPost(e) {
  var ok = ContentService.createTextOutput(JSON.stringify({ status: "ok" }))
    .setMimeType(ContentService.MimeType.JSON);

  try {
    var raw = e.postData ? e.postData.contents : null;
    if (!raw) return addCorsHeaders(ok);

    var payload = JSON.parse(raw);
    var eventType = payload.eventType || "";
    var timestamp = payload.timestamp || new Date().toISOString();
    var ua        = (payload.userAgent || "").substring(0, 120);
    var data      = payload.data || {};

    var ss = SpreadsheetApp.getActiveSpreadsheet();

    /* ── Prompt copy / download ── */
    if (eventType === "prompt_copy" || eventType === "prompt_download") {
      var pSheet = getOrCreateSheet(ss, "Prompt Events", [
        "Timestamp", "Event Type", "Stage", "Prompt Type", "User-Agent"
      ]);
      pSheet.appendRow([
        timestamp,
        eventType,
        data.stage        || "",
        data.promptType   || "",
        ua
      ]);
    }

    /* ── Diagnostic result ── */
    if (eventType === "diagnostic_result") {
      var dSheet = getOrCreateSheet(ss, "Diagnostic Results", [
        "Timestamp", "Recommended Stage", "Checked Count",
        "Checked Nodes", "Stage Scores", "User-Agent"
      ]);
      dSheet.appendRow([
        timestamp,
        data.recommendedStage || "",
        data.checkedCount     || 0,
        (data.checkedNodes    || []).join(","),
        JSON.stringify(data.scores || {}),
        ua
      ]);
    }

  } catch (err) {
    // Never surface errors to the client — tracking must be silent
    Logger.log("Analytics error: " + err.toString());
  }

  return addCorsHeaders(ok);
}

/* ── Helper: get or create a sheet with header row ─────────── */
function getOrCreateSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    // Freeze header row and bold it
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
  }
  return sheet;
}
