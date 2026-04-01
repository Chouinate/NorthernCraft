/**
 * NorthernCraft — Subscriber Management
 * Google Apps Script (paste into Extensions → Apps Script inside your Sheet)
 *
 * Sheet columns (auto-created on first run):
 *   A: Email
 *   B: Token (UUID for unsubscribe link)
 *   C: Status  ("subscribed" | "unsubscribed")
 *   D: Subscribed At
 *   E: Unsubscribed At
 */

var SHEET_NAME   = 'Subscribers';
var FROM_NAME    = 'Northern Craft';
var FROM_EMAIL   = Session.getActiveUser().getEmail(); // your Gmail
var SITE_URL     = 'https://northerncraftnh.com';
var SCRIPT_URL   = ScriptApp.getService().getUrl();    // auto-filled after deploy


/* ─────────────────────────────────────────────────────────────
   Entry points
───────────────────────────────────────────────────────────── */

function doPost(e) {
  try {
    var data  = JSON.parse(e.postData.contents);
    var email = (data.email || '').trim().toLowerCase();

    if (!isValidEmail(email)) {
      return jsonResponse({ ok: false, error: 'invalid email' });
    }

    var sheet  = getSheet();
    var existing = findRow(sheet, email);

    if (existing) {
      if (existing.status === 'subscribed') {
        // already on the list — silent success, no duplicate email
        return jsonResponse({ ok: true, status: 'already_subscribed' });
      } else {
        // was unsubscribed — re-subscribe them
        sheet.getRange(existing.row, 3).setValue('subscribed');
        sheet.getRange(existing.row, 5).setValue('');
        sendThankYou(email, existing.token);
        return jsonResponse({ ok: true, status: 're_subscribed' });
      }
    }

    // new subscriber
    var token = generateToken();
    sheet.appendRow([
      email,
      token,
      'subscribed',
      new Date(),
      '',
    ]);

    sendThankYou(email, token);
    return jsonResponse({ ok: true, status: 'subscribed' });

  } catch (err) {
    return jsonResponse({ ok: false, error: err.message });
  }
}


function doGet(e) {
  var token = e.parameter.token;

  if (!token) {
    return HtmlService.createHtmlOutput(page('Missing unsubscribe token.'));
  }

  var sheet = getSheet();
  var data  = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (data[i][1] === token) {
      if (data[i][2] === 'unsubscribed') {
        return HtmlService.createHtmlOutput(page("You're already unsubscribed. You won't hear from us again."));
      }
      sheet.getRange(i + 1, 3).setValue('unsubscribed');
      sheet.getRange(i + 1, 5).setValue(new Date());
      return HtmlService.createHtmlOutput(page("You've been unsubscribed. You won't receive any more emails from Northern Craft."));
    }
  }

  return HtmlService.createHtmlOutput(page('Token not found. You may already be unsubscribed.'));
}


/* ─────────────────────────────────────────────────────────────
   Email
───────────────────────────────────────────────────────────── */

function sendThankYou(email, token) {
  var unsubUrl = SCRIPT_URL + '?token=' + token;

  var html = [
    '<div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;color:#2a2523;">',

    '<p style="font-size:22px;font-weight:400;margin:0 0 20px;">',
    '  Thank you for subscribing.',
    '</p>',

    '<p style="font-size:15px;line-height:1.7;margin:0 0 16px;">',
    '  You\'re on the list. When new designs drop, you\'ll be the first to know.',
    '  No noise — just new work.',
    '</p>',

    '<p style="font-size:15px;line-height:1.7;margin:0 0 32px;">',
    '  &mdash; N.C.',
    '</p>',

    '<hr style="border:none;border-top:1px solid rgba(92,53,69,.15);margin:0 0 24px;">',

    '<p style="font-size:11px;letter-spacing:.06em;text-transform:uppercase;',
    '   color:#999;margin:0;">',
    '  <a href="' + unsubUrl + '" style="color:#7b4f5c;text-decoration:none;',
    '     border-bottom:1px solid currentColor;">Unsubscribe</a>',
    '  &nbsp;&middot;&nbsp; Northern Craft &nbsp;&middot;&nbsp; New Hampshire',
    '</p>',

    '</div>',
  ].join('');

  GmailApp.sendEmail(email, 'Welcome to the list — Northern Craft', '', {
    from:     FROM_EMAIL,
    name:     FROM_NAME,
    htmlBody: html,
    replyTo:  FROM_EMAIL,
  });
}


/* ─────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────── */

function getSheet() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['Email', 'Token', 'Status', 'Subscribed At', 'Unsubscribed At']);
    sheet.setFrozenRows(1);
    sheet.getRange('A1:E1').setFontWeight('bold');
  }

  return sheet;
}

function findRow(sheet, email) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === email) {
      return { row: i + 1, token: data[i][1], status: data[i][2] };
    }
  }
  return null;
}

function generateToken() {
  var chars  = 'abcdefghijklmnopqrstuvwxyz0123456789';
  var token  = '';
  for (var i = 0; i < 40; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function page(message) {
  return [
    '<!DOCTYPE html><html><head>',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<style>',
    '  body{font-family:Georgia,serif;display:flex;align-items:center;',
    '       justify-content:center;min-height:100vh;margin:0;background:#f5f2ec;}',
    '  p{font-size:18px;color:#2a2523;text-align:center;max-width:400px;line-height:1.6;}',
    '</style></head><body>',
    '<p>' + message + '</p>',
    '</body></html>',
  ].join('');
}
