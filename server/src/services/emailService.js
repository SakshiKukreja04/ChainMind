/**
 * Email Service
 * Sends transactional emails via Postmark API
 *
 * Environment variables:
 *   POSTMARK_SERVER_TOKEN, EMAIL_FROM
 */

const postmark = require('postmark');

let client = null;

/**
 * Get or create Postmark client
 */
function getClient() {
  if (client) return client;

  const token = process.env.POSTMARK_SERVER_TOKEN;
  if (!token || token === 'your_token_here') {
    console.warn('⚠ POSTMARK_SERVER_TOKEN not configured - emails will be logged only');
    return null;
  }

  client = new postmark.ServerClient(token);
  console.log('✓ Email service configured: Postmark API');
  return client;
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
  const postmarkClient = getClient();
  const fromAddress = process.env.EMAIL_FROM || '2023.sakshi.kukreja@ves.ac.in';

  const emailData = {
    From: fromAddress,
    To: toEmail,
    Subject: 'ChainMind — Your Vendor Account is Ready',
    TextBody: [
      `Hello ${vendorName},`,
      '',
      'Your vendor account on ChainMind has been approved!',
      '',
      `Login URL : ${loginUrl}`,
      `Email     : ${toEmail}`,
      `Password  : ${tempPassword}`,
      '',
      'Please login and update your password.',
      '',
      'Regards,',
      'ChainMind Platform',
    ].join('\n'),
    HtmlBody: `
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
          ⚠ <strong>Please login and update your password.</strong>
        </p>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">This is an automated message from ChainMind. Do not reply.</p>
      </div>
    `,
  };

  // If Postmark not configured, log and return mock response
  if (!postmarkClient) {
    console.log('📧 [DEV MODE] Email would be sent:');
    console.log(`   To: ${toEmail}`);
    console.log(`   Subject: ${emailData.Subject}`);
    return { MessageID: 'dev-mode-no-send', To: toEmail };
  }

  const result = await postmarkClient.sendEmail(emailData);
  console.log(`✓ Vendor credentials emailed to ${toEmail} (msgId: ${result.MessageID})`);
  return result;
}

module.exports = { sendVendorCredentials };
