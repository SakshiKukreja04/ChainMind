/**
 * Email Service
 * Sends transactional emails via Nodemailer (SMTP / Gmail)
 *
 * Environment variables:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 *
 * Falls back to Ethereal (test) if SMTP_HOST is not set.
 */

const nodemailer = require('nodemailer');

let transporter = null;

/**
 * Lazily initialise the Nodemailer transporter.
 * Uses real SMTP when env vars are present, otherwise Ethereal test account.
 */
async function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
    console.log(`✓ Email service configured: ${host}:${port}`);
  } else {
    // Ethereal test account – emails can be viewed at https://ethereal.email
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log(`✓ Email service using Ethereal test account: ${testAccount.user}`);
  }

  return transporter;
}

/**
 * Send vendor welcome email with temporary credentials.
 *
 * @param {string} toEmail        – vendor email
 * @param {string} vendorName     – vendor company / display name
 * @param {string} tempPassword   – one-time plaintext password
 * @param {string} loginUrl       – URL for the login page
 */
async function sendVendorCredentials(toEmail, vendorName, tempPassword, loginUrl) {
  const transport = await getTransporter();

  const fromAddress = process.env.SMTP_FROM || '"ChainMind" <noreply@chainmind.io>';

  const info = await transport.sendMail({
    from: fromAddress,
    to: toEmail,
    subject: 'ChainMind — Your Vendor Account is Ready',
    text: [
      `Hello ${vendorName},`,
      '',
      'Your vendor account on ChainMind has been approved!',
      '',
      `Login URL : ${loginUrl}`,
      `Email     : ${toEmail}`,
      `Password  : ${tempPassword}`,
      '',
      '⚠ You will be required to change your password on first login.',
      '',
      'Regards,',
      'ChainMind Platform',
    ].join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
        <h2 style="color:#2563eb">Welcome to ChainMind</h2>
        <p>Hello <strong>${vendorName}</strong>,</p>
        <p>Your vendor account has been <strong>approved</strong>. You can now log in and start managing orders.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px 0;color:#6b7280">Login URL</td><td style="padding:8px 0"><a href="${loginUrl}">${loginUrl}</a></td></tr>
          <tr><td style="padding:8px 0;color:#6b7280">Email</td><td style="padding:8px 0"><code>${toEmail}</code></td></tr>
          <tr><td style="padding:8px 0;color:#6b7280">Password</td><td style="padding:8px 0"><code>${tempPassword}</code></td></tr>
        </table>
        <p style="background:#fef3c7;padding:12px;border-radius:8px;font-size:14px">
          ⚠ <strong>You must change your password on first login.</strong>
        </p>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">This is an automated message from ChainMind. Do not reply.</p>
      </div>
    `,
  });

  // If Ethereal, log the preview URL
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log(`📧 Preview vendor email: ${previewUrl}`);
  }

  console.log(`✓ Vendor credentials emailed to ${toEmail} (msgId: ${info.messageId})`);
  return info;
}

module.exports = { sendVendorCredentials };
