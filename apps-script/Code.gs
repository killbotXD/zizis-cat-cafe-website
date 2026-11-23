/**
 * Zizi's contact form → Google Sheet
 *
 * Paste this into the Apps Script editor of the response Sheet
 * (Extensions → Apps Script), then deploy as a Web app.
 *
 * Script properties (Project Settings → Script properties):
 *   TURNSTILE_SECRET   – Cloudflare Turnstile *secret* key (required)
 *   ALLOWED_HOSTNAMES  – comma-separated, e.g. "zizis.cafe,www.zizis.cafe" (optional but recommended)
 *   NOTIFY_EMAIL       – where to send a mail for each response; comma-separate several
 *                        addresses (optional — defaults to the Google account that owns the script)
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
  const phone = clean_(p.phone, 20);
  if (!phoneOk_(phone)) return json_({ ok: false, error: 'phone' });

  // 5. Append the row (lock so simultaneous submissions don't collide).
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    if (sh.getLastRow() === 0) sh.appendRow(HEADERS);
    sh.appendRow([new Date(), clean_(p.name, 100), phone, email, message, v.hostname || '']);
  } finally {
    lock.releaseLock();
  }

  // 6. Email notification. The row is already saved, so a mail failure never loses a response.
  try {
    notify_(clean_(p.name, 100), phone, email, message);
  } catch (err) {
    console.error('Notification email failed: ' + err);
  }
  return json_({ ok: true });
}

// Optional phone. If given: Indian mobile (+91/0 optional, 10 digits starting 6–9),
// Indian landline with STD code (0 + 10 digits), or international with + / 00 (8–15 digits).
function phoneOk_(value) {
  const d = String(value || '').replace(/^'/, '').replace(/[\s\-().]/g, '');
  if (!d) return true;
  return /^(?:\+91|0091|91|0)?[6-9]\d{9}$/.test(d) ||
         /^0\d{10}$/.test(d) ||
         /^(?:\+|00)[1-9]\d{7,14}$/.test(d);
}

function notify_(name, phone, email, message) {
  const to = PropertiesService.getScriptProperties().getProperty('NOTIFY_EMAIL') ||
             Session.getEffectiveUser().getEmail();
  if (!to) return;
  const plain = function (s) { return String(s || '').replace(/^'/, ''); };  // undo the formula guard for the mail
  const who = plain(name) || 'Someone';
  MailApp.sendEmail({
    to: to,
    replyTo: plain(email),                       // hitting Reply in Gmail answers the visitor directly
    name: "Zizi's website",
    subject: "New message from " + who + " via zizis.cafe",
    body:                                        // plain text only: nothing a visitor types can render as HTML
      'Name:    ' + plain(name) + '\n' +
      'Phone:   ' + (plain(phone) || '-') + '\n' +
      'Email:   ' + plain(email) + '\n\n' +
      plain(message) + '\n\n' +
      '-- \nSaved to the Responses sheet: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl(),
  });
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

// Run this once from the editor (select "testNotification" → Run). It triggers Google's
// permission prompt for sending email and sends you a sample notification.
function testNotification() {
  notify_('Test visitor', '+91 98765 43210', Session.getEffectiveUser().getEmail(),
          'This is a test notification from the Zizi\'s contact form.');
}
