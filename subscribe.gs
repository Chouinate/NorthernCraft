/**
 * NorthernCraft — Subscriber Management
 * Google Apps Script (paste into Extensions → Apps Script inside your Sheet)
 *
 * Sheet columns (auto-created on first run):
 *   A: Email
 *   B: Token
 *   C: Status  ("subscribed" | "unsubscribed")
 *   D: Subscribed At
 *   E: Unsubscribed At
 *   F: Unsub Reasons
 *   G: Unsub Note
 */

var SHEET_NAME   = 'Subscribers';
var FROM_NAME    = 'Northern Craft NH';
var FROM_EMAIL   = 'nate@northerncraftnh.com';
var SITE_URL     = 'https://northerncraftnh.com';
var SCRIPT_URL   = 'https://script.google.com/macros/s/AKfycbzDvvz5Ww7IAwZFq5eJYDx15BEozIxxl7FemerROTSBie95NhxmcgrG6MKJ5x1tBcka/exec';


/* ─────────────────────────────────────────────────────────────
   Entry points
───────────────────────────────────────────────────────────── */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    /* ── feedback submission from unsubscribe page ── */
    if (data.action === 'feedback') {
      var sheet = getSheet();
      var rows  = sheet.getDataRange().getValues();
      for (var i = 1; i < rows.length; i++) {
        if (rows[i][1] === data.token) {
          sheet.getRange(i + 1, 6).setValue((data.reasons || []).join(', '));
          sheet.getRange(i + 1, 7).setValue(data.note || '');
          break;
        }
      }
      return jsonResponse({ ok: true });
    }

    /* ── new subscription ── */
    var email = (data.email || '').trim().toLowerCase();

    if (!isValidEmail(email)) {
      return jsonResponse({ ok: false, error: 'invalid email' });
    }

    var sheet2   = getSheet();
    var existing = findRow(sheet2, email);

    if (existing) {
      if (existing.status === 'subscribed') {
        return jsonResponse({ ok: true, status: 'already_subscribed' });
      } else {
        sheet2.getRange(existing.row, 3).setValue('subscribed');
        sheet2.getRange(existing.row, 5).setValue('');
        sendThankYou(email, existing.token);
        return jsonResponse({ ok: true, status: 're_subscribed' });
      }
    }

    var token = generateToken();
    sheet2.appendRow([email, token, 'subscribed', new Date(), '', '', '']);
    sendThankYou(email, token);
    return jsonResponse({ ok: true, status: 'subscribed' });

  } catch (err) {
    return jsonResponse({ ok: false, error: err.message });
  }
}


function doGet(e) {
  var token  = e.parameter.token;
  var action = e.parameter.action;

  if (!token) {
    return HtmlService.createHtmlOutput(page('Missing unsubscribe token.'));
  }

  var sheet = getSheet();
  var data  = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (data[i][1] === token) {

      /* ── resubscribe ── */
      if (action === 'resubscribe') {
        sheet.getRange(i + 1, 3).setValue('subscribed');
        sheet.getRange(i + 1, 5).setValue('');
        sheet.getRange(i + 1, 6).setValue('');
        sheet.getRange(i + 1, 7).setValue('');
        return HtmlService.createHtmlOutput(page("You're back on the list. Welcome back."));
      }

      /* ── already unsubscribed ── */
      if (data[i][2] === 'unsubscribed') {
        return HtmlService.createHtmlOutput(page("You're already unsubscribed. You won't hear from us again."));
      }

      /* ── unsubscribe ── */
      sheet.getRange(i + 1, 3).setValue('unsubscribed');
      sheet.getRange(i + 1, 5).setValue(new Date());
      return HtmlService.createHtmlOutput(unsubscribePage(token));
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
    '<!DOCTYPE html>',
    '<html><head><meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '</head>',

    '<body style="margin:0;padding:0;background-color:#f5f2ec;">',
    '<table width="100%" cellpadding="0" cellspacing="0" border="0"',
    '  style="background-color:#f5f2ec;">',
    '<tr><td align="center" style="padding:48px 16px 48px;">',

    '<table width="600" cellpadding="0" cellspacing="0" border="0"',
    '  style="max-width:600px;width:100%;background-color:#f5f2ec;">',

    /* ── logo ── */
    '<tr><td align="center" style="padding:0 0 32px;">',
    '<img src="https://northerncraftnh.com/NCNH_Logo.png"',
    '  width="120" alt="Northern Craft NH"',
    '  style="display:block;margin:0 auto;height:auto;border:0;">',
    '</td></tr>',

    /* ── divider ── */
    '<tr><td style="padding:0 0 32px;border-top:1px solid rgba(92,53,69,0.2);font-size:0;">&nbsp;</td></tr>',

    /* ── message ── */
    '<tr><td align="left" style="padding:0 0 40px;font-family:Georgia,serif;font-size:26px;font-weight:400;color:#2a2523;line-height:1.3;">Thank you for subscribing.</td></tr>',
    '<tr><td align="left" style="padding:0 0 12px;font-family:Georgia,serif;font-size:16px;color:#2a2523;line-height:1.75;">You\'re on the list. When new designs drop, you\'ll be the first to know.</td></tr>',
    '<tr><td align="left" style="padding:0 0 40px;font-family:Georgia,serif;font-size:16px;color:#2a2523;line-height:1.75;">We can\'t wait to show you what\'s coming.</td></tr>',

    /* ── sign-off ── */
    '<tr><td align="left" style="padding:0 0 40px;font-family:Georgia,serif;font-size:18px;font-style:italic;color:#5c3545;">&mdash; N.C.</td></tr>',

    /* ── wall grid image ── */
    '<tr><td align="center" style="padding:0 0 40px;">',
    '<img src="https://northerncraftnh.com/WallGrid.jpg" width="560" alt="Northern Craft wall art collection"',
    '  style="display:block;width:100%;max-width:560px;height:auto;border:0;">',
    '</td></tr>',

    /* ── divider ── */
    '<tr><td style="padding:0 0 24px;border-top:1px solid rgba(92,53,69,0.15);font-size:0;">&nbsp;</td></tr>',

    /* ── drag-to-primary note ── */
    '<tr><td align="center" style="padding:0 0 20px;font-family:Arial,sans-serif;font-size:11px;color:#a09088;font-style:italic;">If this landed in Promotions, drag it to your Primary inbox &mdash; Gmail will remember.</td></tr>',

    /* ── footer ── */
    '<tr><td align="center" style="font-family:Arial,sans-serif;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#a09088;"><a href="' + unsubUrl + '" style="color:#7b4f5c;text-decoration:none;border-bottom:1px solid #7b4f5c;">Unsubscribe</a>&nbsp;&nbsp;&middot;&nbsp;&nbsp;Northern Craft&nbsp;&nbsp;&middot;&nbsp;&nbsp;New Hampshire</td></tr>',

    '</table>',
    '</td></tr></table>',
    '</body></html>',
  ].join('\n');

  GmailApp.sendEmail(email, 'Welcome to the list \u2014 Northern Craft', '', {
    from:     FROM_EMAIL,
    name:     FROM_NAME,
    htmlBody: html,
    replyTo:  FROM_EMAIL,
  });
}


/* ─────────────────────────────────────────────────────────────
   Unsubscribe page
───────────────────────────────────────────────────────────── */

function unsubscribePage(token) {
  var resubUrl = SCRIPT_URL + '?token=' + token + '&action=resubscribe';

  return '<!DOCTYPE html>' +
    '<html><head><meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<style>' +
    '  *{box-sizing:border-box}' +
    '  body{font-family:Georgia,serif;background:#f5f2ec;margin:0;padding:48px 24px;color:#2a2523;}' +
    '  .card{max-width:500px;margin:0 auto;}' +
    '  .logo{display:block;margin:0 auto 32px;width:90px;}' +
    '  hr{border:none;border-top:1px solid rgba(92,53,69,0.2);margin:0 0 32px;}' +
    '  h1{font-size:26px;font-weight:400;margin:0 0 12px;line-height:1.3;}' +
    '  .sub{font-size:15px;color:#6b5f5a;line-height:1.7;margin:0 0 32px;}' +
    '  .label{font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:#a09088;margin:0 0 14px;}' +
    '  .checks{margin:0 0 20px;}' +
    '  .checks label{display:flex;align-items:center;gap:10px;font-size:15px;margin-bottom:12px;cursor:pointer;}' +
    '  input[type=checkbox]{accent-color:#5c3545;width:15px;height:15px;flex-shrink:0;}' +
    '  textarea{width:100%;border:1px solid rgba(92,53,69,0.25);background:#fff;font-family:Georgia,serif;font-size:15px;color:#2a2523;padding:10px 12px;resize:vertical;outline:none;margin-bottom:28px;}' +
    '  textarea:focus{border-color:#5c3545;}' +
    '  .btn-row{display:flex;align-items:center;gap:24px;flex-wrap:wrap;}' +
    '  .btn-feed{font-family:Georgia,serif;font-size:14px;letter-spacing:0.04em;padding:11px 26px;border:none;cursor:pointer;background:#5c3545;color:#fff;transition:opacity 0.15s;}' +
    '  .btn-feed:hover{opacity:0.8;}' +
    '  .btn-resub{font-family:Arial,sans-serif;font-size:10px;font-weight:400;letter-spacing:0.3em;text-transform:uppercase;background:none;border:none;border-bottom:1px solid #6b5f5a;color:#6b5f5a;padding:0 0 2px;cursor:pointer;transition:color 0.2s,border-color 0.2s;}' +
    '  .btn-resub:hover{color:#5c3545;border-color:#5c3545;}' +
    '  #msg{margin-top:18px;font-size:14px;color:#6b5f5a;min-height:20px;}' +
    '</style></head>' +
    '<body><div class="card">' +
    '<img src="https://northerncraftnh.com/NCNH_Logo.png" class="logo" alt="Northern Craft NH">' +
    '<hr>' +
    '<h1>We\'re sorry to see you go.</h1>' +
    '<p class="sub">You\'ve been unsubscribed from Northern Craft updates.</p>' +
    '<p class="label">Mind telling us why? <span style="text-transform:none;letter-spacing:0;">(optional)</span></p>' +
    '<div class="checks">' +
    '  <label><input type="checkbox" value="too_frequent"> Too many emails</label>' +
    '  <label><input type="checkbox" value="not_relevant"> Not relevant to me</label>' +
    '  <label><input type="checkbox" value="style_change"> The designs aren\'t my style anymore</label>' +
    '  <label><input type="checkbox" value="other"> Other</label>' +
    '</div>' +
    '<textarea rows="3" placeholder="Anything else you\'d like to share..."></textarea>' +
    '<div class="btn-row">' +
    '  <button class="btn-feed" onclick="sendFeedback()">Submit Feedback</button>' +
    '  <button class="btn-resub" onclick="resub()">Resubscribe</button>' +
    '</div>' +
    '<p id="msg"></p>' +
    '</div>' +
    '<script>' +
    '  var TOKEN="' + token + '";' +
    '  var SURL="' + SCRIPT_URL + '";' +
    '  function resub(){window.location.href=SURL+"?token="+TOKEN+"&action=resubscribe";}' +
    '  function sendFeedback(){' +
    '    var checks=document.querySelectorAll("input:checked");' +
    '    var reasons=Array.prototype.map.call(checks,function(c){return c.value;});' +
    '    var note=document.querySelector("textarea").value;' +
    '    fetch(SURL,{method:"POST",body:JSON.stringify({action:"feedback",token:TOKEN,reasons:reasons,note:note}),mode:"no-cors"});' +
    '    document.getElementById("msg").textContent="Thank you for your feedback.";' +
    '  }' +
    '<\/script>' +
    '</body></html>';
}


/* ─────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────── */

function getSheet() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['Email', 'Token', 'Status', 'Subscribed At', 'Unsubscribed At', 'Unsub Reasons', 'Unsub Note']);
    sheet.setFrozenRows(1);
    sheet.getRange('A1:G1').setFontWeight('bold');
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
  var chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  var token = '';
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
  return '<!DOCTYPE html><html><head>' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<style>' +
    '  body{font-family:Georgia,serif;display:flex;flex-direction:column;align-items:center;' +
    '       justify-content:center;min-height:100vh;margin:0;background:#f5f2ec;}' +
    '  img{width:80px;margin-bottom:28px;}' +
    '  p{font-size:18px;color:#2a2523;text-align:center;max-width:380px;line-height:1.6;margin:0;}' +
    '</style></head><body>' +
    '<img src="https://northerncraftnh.com/NCNH_Logo.png" alt="Northern Craft NH">' +
    '<p>' + message + '</p>' +
    '</body></html>';
}
