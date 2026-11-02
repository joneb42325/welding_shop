const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 465),
  secure: Number(process.env.SMTP_PORT || 465) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Защита HTML-письма от вставки пользовательского HTML
function escapeHtml(value = '') {
  return String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[char]
  );
}

async function sendOrderEmail(customer, items, totalPrice, orderId) {
  if (!customer.email) return;

  const itemRows = items
    .map(
      (item) => `
    <tr>
      <td style="padding:10px;border-bottom:1px solid #eee">
        ${escapeHtml(item.name || item.product_name || 'Товар')}
      </td>
      <td style="padding:10px;border-bottom:1px solid #eee">
        ${escapeHtml(item.quantity)}
        ${escapeHtml(item.unit || 'шт')}
      </td>
    </tr>
  `
    )
    .join('');

  await transporter.sendMail({
    from: `"Wolfram Shop" <${process.env.SMTP_USER}>`,
    to: customer.email,
    subject: `Замовлення №${orderId} прийнято — Wolfram Shop`,
    text: [
      `Вітаємо, ${customer.name || 'клієнте'}!`,
      `Ми отримали ваше замовлення №${orderId}.`,
      `Сума замовлення: ${Number(totalPrice).toFixed(2)} грн.`,
      'Наш менеджер зв’яжеться з вами для підтвердження.',
    ].join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#222">
        <h2>Дякуємо за замовлення!</h2>
        <p>Вітаємо, ${escapeHtml(customer.name || 'клієнте')}!</p>
        <p>Ваше замовлення <strong>№${escapeHtml(orderId)}</strong>
        успішно прийнято.</p>

        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr>
              <th align="left" style="padding:10px;border-bottom:2px solid #ddd">Товар</th>
              <th align="left" style="padding:10px;border-bottom:2px solid #ddd">Кількість</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>

        <p><strong>Сума замовлення: ${Number(totalPrice).toFixed(2)} грн</strong></p>
        <p><strong>Доставка:</strong> ${escapeHtml(customer.delivery || 'Буде уточнена менеджером')}</p>
        <p>Наш менеджер зв’яжеться з вами для підтвердження замовлення.</p>
        <p>З повагою,<br>Wolfram Shop</p>
      </div>
    `,
  });
}

module.exports = { sendOrderEmail };
