/**
 * Vendor Email Service
 * Sends reorder-confirmation emails to vendors via Postmark.
 *
 * ✅  Emails ONLY to vendors (reorder confirmation).
 * ❌  NO emails to SME owners/managers.
 */

const postmark = require('postmark');

let client = null;

/** Lazy-init Postmark client (shared singleton) */
function getClient() {
  if (client) return client;

  const token = process.env.POSTMARK_SERVER_TOKEN;
  if (!token || token === 'your_token_here') {
    console.warn('⚠ POSTMARK_SERVER_TOKEN not set — vendor emails will be logged only');
    return null;
  }

  client = new postmark.ServerClient(token);
  console.log('✓ Vendor email service configured: Postmark API');
  return client;
}

/**
 * Send a reorder confirmation email to the vendor.
 *
 * @param {Object} opts
 * @param {string} opts.vendorEmail      – vendor's email address
 * @param {string} opts.vendorName       – vendor company name
 * @param {string} opts.businessName     – SME business name
 * @param {string} opts.productName      – product being reordered
 * @param {string} opts.productSku       – SKU
 * @param {number} opts.quantity         – order quantity
 * @param {number} opts.totalValue       – order total (₹/$)
 * @param {string} opts.currency         – currency code (INR, USD, etc.)
 * @param {Date|string} opts.expectedDeliveryDate
 * @param {string} opts.orderId          – order _id (for reference)
 * @param {string} [opts.poNumber]       – PO number
 */
async function sendReorderConfirmation({
  vendorEmail,
  vendorName,
  businessName,
  productName,
  productSku,
  quantity,
  totalValue,
  currency = 'INR',
  expectedDeliveryDate,
  orderId,
  poNumber,
}) {
  const postmarkClient = getClient();
  const fromAddress = process.env.EMAIL_FROM || '2023.sakshi.kukreja@ves.ac.in';

  const formattedDate = expectedDeliveryDate
    ? new Date(expectedDeliveryDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'TBD';

  const subject = `ChainMind — New Reorder: ${productName} (${productSku})`;

  const textBody = [
    `Hello ${vendorName},`,
    '',
    `You have received a new purchase order from ${businessName}.`,
    '',
    `Product      : ${productName} (${productSku})`,
    `Quantity     : ${quantity}`,
    `Total Value  : ${currency} ${totalValue?.toFixed(2) || '—'}`,
    `Expected By  : ${formattedDate}`,
    `Order Ref    : ${orderId}`,
    poNumber ? `PO Number    : ${poNumber}` : null,
    '',
    'Please log in to ChainMind to accept or update this order.',
    '',
    'Regards,',
    'ChainMind Platform',
  ]
    .filter(Boolean)
    .join('\n');

  const htmlBody = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
      <h2 style="color:#2563eb;margin-top:0">📦 New Purchase Order</h2>
      <p>Hello <strong>${vendorName}</strong>,</p>
      <p>You have received a new purchase order from <strong>${businessName}</strong>.</p>

      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr style="border-bottom:1px solid #e5e7eb">
          <td style="padding:10px 0;color:#6b7280">Product</td>
          <td style="padding:10px 0;font-weight:600">${productName} <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;font-size:12px">${productSku}</code></td>
        </tr>
        <tr style="border-bottom:1px solid #e5e7eb">
          <td style="padding:10px 0;color:#6b7280">Quantity</td>
          <td style="padding:10px 0;font-weight:600">${quantity}</td>
        </tr>
        <tr style="border-bottom:1px solid #e5e7eb">
          <td style="padding:10px 0;color:#6b7280">Total Value</td>
          <td style="padding:10px 0;font-weight:600">${currency} ${totalValue?.toFixed(2) || '—'}</td>
        </tr>
        <tr style="border-bottom:1px solid #e5e7eb">
          <td style="padding:10px 0;color:#6b7280">Expected By</td>
          <td style="padding:10px 0;font-weight:600">${formattedDate}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#6b7280">Order Ref</td>
          <td style="padding:10px 0;font-size:13px"><code>${orderId}</code></td>
        </tr>
        ${poNumber ? `<tr><td style="padding:10px 0;color:#6b7280">PO Number</td><td style="padding:10px 0"><code>${poNumber}</code></td></tr>` : ''}
      </table>

      <p style="background:#dbeafe;padding:12px;border-radius:8px;font-size:14px;color:#1e40af">
        Please log in to <strong>ChainMind</strong> to accept or update this order.
      </p>

      <p style="color:#9ca3af;font-size:12px;margin-top:24px">
        This is an automated message from ChainMind. Do not reply.
      </p>
    </div>
  `;

  const emailData = {
    From: fromAddress,
    To: vendorEmail,
    Subject: subject,
    TextBody: textBody,
    HtmlBody: htmlBody,
  };

  if (!postmarkClient) {
    console.log('📧 [DEV MODE] Vendor reorder email would be sent:');
    console.log(`   To: ${vendorEmail}`);
    console.log(`   Subject: ${subject}`);
    return { MessageID: 'dev-mode-no-send', To: vendorEmail };
  }

  try {
    const result = await postmarkClient.sendEmail(emailData);
    console.log(`✓ Reorder confirmation emailed to ${vendorEmail} (msgId: ${result.MessageID})`);
    return result;
  } catch (err) {
    console.error(`✗ Postmark send failed for ${vendorEmail}:`, err.message);
    return null; // failure-safe
  }
}

/**
 * Send a delivery-complete acknowledgement email to the vendor.
 */
async function sendDeliveryAcknowledgement({
  vendorEmail,
  vendorName,
  businessName,
  productName,
  quantity,
  orderId,
}) {
  const postmarkClient = getClient();
  const fromAddress = process.env.EMAIL_FROM || '2023.sakshi.kukreja@ves.ac.in';

  const emailData = {
    From: fromAddress,
    To: vendorEmail,
    Subject: `ChainMind — Delivery Confirmed: ${productName}`,
    TextBody: [
      `Hello ${vendorName},`,
      '',
      `${businessName} has confirmed receipt of your delivery.`,
      '',
      `Product  : ${productName}`,
      `Quantity : ${quantity}`,
      `Order    : ${orderId}`,
      '',
      'Thank you for the timely delivery!',
      '',
      'Regards,',
      'ChainMind Platform',
    ].join('\n'),
    HtmlBody: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
        <h2 style="color:#16a34a;margin-top:0">✅ Delivery Confirmed</h2>
        <p>Hello <strong>${vendorName}</strong>,</p>
        <p><strong>${businessName}</strong> has confirmed receipt of your delivery.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px 0;color:#6b7280">Product</td><td style="padding:8px 0;font-weight:600">${productName}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280">Quantity</td><td style="padding:8px 0;font-weight:600">${quantity}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280">Order Ref</td><td style="padding:8px 0"><code>${orderId}</code></td></tr>
        </table>
        <p>Thank you for the timely delivery!</p>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">This is an automated message from ChainMind. Do not reply.</p>
      </div>
    `,
  };

  if (!postmarkClient) {
    console.log('📧 [DEV MODE] Delivery ack email would be sent:');
    console.log(`   To: ${vendorEmail}`);
    return { MessageID: 'dev-mode-no-send', To: vendorEmail };
  }

  try {
    const result = await postmarkClient.sendEmail(emailData);
    console.log(`✓ Delivery ack emailed to ${vendorEmail} (msgId: ${result.MessageID})`);
    return result;
  } catch (err) {
    console.error(`✗ Postmark send failed for ${vendorEmail}:`, err.message);
    return null;
  }
}

module.exports = {
  sendReorderConfirmation,
  sendDeliveryAcknowledgement,
};
