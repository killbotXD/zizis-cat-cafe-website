/**
 * Zizi's contact form → Google Sheet
 *
 * Paste this into the Apps Script editor of the response Sheet
 * (Extensions → Apps Script), then deploy as a Web app.
 *
 * Script properties (Project Settings → Script properties):
 *   TURNSTILE_SECRET   – Cloudflare Turnstile *secret* key (required)
 *   ALLOWED_HOSTNAMES  – comma-separated, e.g. "zizis.in,www.zizis.in" (optional but recommended)
 */

const SHEET_NAME = 'Responses';
const HEADERS = ['Timestamp', 'Name', 'Phone', 'Email', 'Message', 'Site'];

function doPost(e) {
  const p = (e && e.parameter) || {};

  // 1. Honeypot: a hidden field real people never fill. Pretend success so bots learn nothing.
  if (p.website) return json_({ ok: true });

  // 2. Verify the Turnstile token with Cloudflare (server-side; the secret never reaches the browser).
  const props = PropertiesService.getScriptProperties();
  const secret = props.getProperty('TURNSTILE_SECRET');
  if (!secret) return json_({ ok: false, error: 'server-config' });

  const verify = UrlFetchApp.fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'post',
    payload: { secret: secret, response: p['cf-turnstile-response'] || '' },
    muteHttpExceptions: true,
  });
  let v = {};
  try { v = JSON.parse(verify.getContentText()); } catch (err) { v = { success: false }; }
  if (!v.success) return json_({ ok: false, error: 'captcha' });

  // 3. Only accept tokens issued on our own domain(s).
  const allowed = (props.getProperty('ALLOWED_HOSTNAMES') || '')
    .split(',').map(function (h) { return h.trim().toLowerCase(); }).filter(String);
  if (allowed.length && allowed.indexOf(String(v.hostname || '').toLowerCase()) === -1) {
    return json_({ ok: false, error: 'captcha' });
  }

  // 4. Basic validation.
  const email = clean_(p.email, 120);
  const message = clean_(p.message, 3000);
  if (!email || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json_({ ok: false, error: 'missing' });
  }

  // 5. Append the row (lock so simultaneous submissions don't collide).
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    if (sh.getLastRow() === 0) sh.appendRow(HEADERS);
    sh.appendRow([new Date(), clean_(p.name, 100), clean_(p.phone, 30), email, message, v.hostname || '']);
  } finally {
    lock.releaseLock();
  }
  return json_({ ok: true });
}

// Trim, cap length, and neutralise spreadsheet formulas (=, +, -, @) so a submission
// like "=IMPORTXML(...)" is stored as text instead of being executed by Sheets.
function clean_(value, max) {
  let s = String(value || '').trim().slice(0, max);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return s;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
