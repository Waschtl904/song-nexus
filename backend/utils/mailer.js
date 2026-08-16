/**
 * SONG-NEXUS — Mailer Utility
 * Nodemailer-Wrapper für transaktionale E-Mails
 */

'use strict';

const nodemailer = require('nodemailer');

// ============================================================================
// Transporter (wird einmal erstellt und wiederverwendet)
// ============================================================================

let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST   || 'smtp.gmx.at',
      port:   parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // false = STARTTLS auf Port 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production',
      },
    });
  }
  return transporter;
}

// ============================================================================
// Verbindung testen (beim Serverstart aufrufen)
// ============================================================================

async function verifyMailer() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('⚠️  Mailer: SMTP_USER oder SMTP_PASS fehlt in .env — E-Mail-Versand deaktiviert');
    return false;
  }
  try {
    await getTransporter().verify();
    console.log('✅ Mailer: SMTP-Verbindung erfolgreich');
    return true;
  } catch (err) {
    console.warn('⚠️  Mailer: SMTP-Verbindung fehlgeschlagen:', err.message);
    return false;
  }
}

// ============================================================================
// E-Mail-Templates
// ============================================================================

/**
 * Passwort-Reset E-Mail
 * @param {string} toEmail   - Empfänger
 * @param {string} token     - Reset-Token
 * @param {string} baseUrl   - z.B. https://song-nexus.at
 */
async function sendPasswordResetEmail(toEmail, token, baseUrl) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    // Im Dev-Modus: nur loggen
    console.log(`🔑 [DEV] Password Reset Token für ${toEmail}: ${token}`);
    console.log(`   Reset-URL: ${baseUrl}/password-reset.html?token=${token}`);
    return;
  }

  const resetUrl = `${baseUrl}/password-reset.html?token=${token}`;

  await getTransporter().sendMail({
    from:    process.env.EMAIL_FROM || `SONG-NEXUS <${process.env.SMTP_USER}>`,
    to:      toEmail,
    subject: 'SONG-NEXUS — Passwort zurücksetzen',
    html: `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#05080d;font-family:'Courier New',monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#05080d;padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#0f1a1f;border:1px solid #1e3a3a;border-radius:8px;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background:#071215;padding:24px 32px;border-bottom:1px solid #1e3a3a;">
            <span style="font-family:'Courier New',monospace;font-size:20px;font-weight:700;color:#00ffcc;letter-spacing:.12em;text-shadow:0 0 10px rgba(0,255,204,.4);">
              ♪ SONG-NEXUS
            </span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <h2 style="margin:0 0 8px;font-family:'Courier New',monospace;font-size:16px;color:#00ffcc;letter-spacing:.08em;">
              // PASSWORT ZURÜCKSETZEN
            </h2>
            <p style="margin:0 0 24px;font-size:14px;color:#70b8aa;line-height:1.7;">
              Du hast das Zurücksetzen deines Passworts angefordert.<br>
              Klicke auf den Button — der Link ist <strong style="color:#e0fff8;">1 Stunde</strong> gültig.
            </p>

            <a href="${resetUrl}"
               style="display:inline-block;padding:14px 28px;background:#00ffcc;color:#05080d;font-family:'Courier New',monospace;font-size:13px;font-weight:700;letter-spacing:.08em;text-decoration:none;border-radius:4px;text-transform:uppercase;">
              Passwort zurücksetzen →
            </a>

            <p style="margin:24px 0 0;font-size:12px;color:#2a5a4a;line-height:1.6;">
              Falls der Button nicht funktioniert, kopiere diesen Link:<br>
              <span style="color:#3a7a6a;word-break:break-all;">${resetUrl}</span>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #0f2a2a;">
            <p style="margin:0;font-size:11px;color:#1a4a3a;line-height:1.6;">
              Falls du kein Passwort-Reset angefordert hast, ignoriere diese E-Mail.<br>
              Dein Passwort bleibt unverändert.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
    text: `SONG-NEXUS — Passwort zurücksetzen\n\nLink (gültig 1 Stunde):\n${resetUrl}\n\nFalls du das nicht angefordert hast, ignoriere diese E-Mail.`,
  });

  console.log(`✅ Mailer: Password-Reset E-Mail gesendet an ${toEmail}`);
}

/**
 * Magic Link E-Mail (falls du auf Nodemailer umsteigen willst)
 * @param {string} toEmail
 * @param {string} token
 * @param {string} baseUrl
 */
async function sendMagicLinkEmail(toEmail, token, baseUrl) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`🔗 [DEV] Magic Link Token für ${toEmail}: ${token}`);
    return;
  }

  const magicUrl = `${baseUrl}/?magic_token=${token}`;

  await getTransporter().sendMail({
    from:    process.env.EMAIL_FROM || `SONG-NEXUS <${process.env.SMTP_USER}>`,
    to:      toEmail,
    subject: 'SONG-NEXUS — Dein Login-Link',
    html: `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:40px 20px;background:#05080d;font-family:'Courier New',monospace;">
  <table width="520" cellpadding="0" cellspacing="0" style="margin:0 auto;background:#0f1a1f;border:1px solid #1e3a3a;border-radius:8px;">
    <tr><td style="background:#071215;padding:24px 32px;border-bottom:1px solid #1e3a3a;">
      <span style="font-size:20px;font-weight:700;color:#00ffcc;letter-spacing:.12em;">♪ SONG-NEXUS</span>
    </td></tr>
    <tr><td style="padding:32px;">
      <h2 style="margin:0 0 8px;font-size:16px;color:#00ffcc;letter-spacing:.08em;">// LOGIN LINK</h2>
      <p style="margin:0 0 24px;font-size:14px;color:#70b8aa;line-height:1.7;">
        Klicke auf den Button um dich einzuloggen.<br>
        Gültig für <strong style="color:#e0fff8;">15 Minuten</strong>.
      </p>
      <a href="${magicUrl}" style="display:inline-block;padding:14px 28px;background:#00ffcc;color:#05080d;font-family:'Courier New',monospace;font-size:13px;font-weight:700;letter-spacing:.08em;text-decoration:none;border-radius:4px;text-transform:uppercase;">
        Jetzt einloggen →
      </a>
    </td></tr>
    <tr><td style="padding:16px 32px;border-top:1px solid #0f2a2a;">
      <p style="margin:0;font-size:11px;color:#1a4a3a;">Falls du das nicht angefordert hast, ignoriere diese E-Mail.</p>
    </td></tr>
  </table>
</body>
</html>`,
    text: `SONG-NEXUS — Login Link (15 Min):\n${magicUrl}`,
  });

  console.log(`✅ Mailer: Magic Link gesendet an ${toEmail}`);
}

module.exports = { sendPasswordResetEmail, sendMagicLinkEmail, verifyMailer };
