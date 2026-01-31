export interface GiftCardReceiptTemplateData {
  storeName: string;
  storeEmail?: string;
  storePhone?: string;
  storeAddress?: string;
  purchaserName: string;
  cards: Array<{
    recipientName: string;
    recipientEmail?: string;
    amount: number;
    cardNumber: string;
  }>;
  totalAmount: number;
}

const maskGiftCardNumber = (cardNumber: string) => {
  if (!cardNumber || cardNumber.length < 4) {
    return cardNumber;
  }

  const last4 = cardNumber.slice(-4);
  return `GC-****-${last4}`;
};

export function buildGiftCardReceiptEmail(data: GiftCardReceiptTemplateData): string {
  const storeContactLines = [
    data.storePhone ? `Phone: ${data.storePhone}` : null,
    data.storeEmail || null,
    data.storeAddress || null,
  ].filter(Boolean);
  const storeContactHtml = storeContactLines
    .map((line) => `<p style="color:#999;font-size:12px;margin:4px 0;">${line}</p>`)
    .join('');

  const cardRows = data.cards
    .map((card) => {
      const recipientEmail = card.recipientEmail
        ? `<div style="color: #666; font-size: 12px; margin-top: 2px;">${card.recipientEmail}</div>`
        : '';

      return `
        <tr>
          <td style="padding: 8px 0; color: #333;">
            <div style="font-weight: 600;">${card.recipientName}</div>
            ${recipientEmail}
          </td>
          <td style="padding: 8px 0; text-align: right; color: #333;">$${card.amount.toFixed(2)}</td>
          <td style="padding: 8px 0; text-align: right; color: #333; font-family: monospace;">
            ${maskGiftCardNumber(card.cardNumber)}
          </td>
        </tr>
      `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Gift Card Receipt from ${data.storeName}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f9f9f9;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 40px;">
          
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #111827; font-size: 28px; margin: 0;">${data.storeName}</h1>
            <p style="color: #666; font-size: 16px; margin: 10px 0 0 0;">Gift Card Receipt</p>
          </div>

          <!-- Purchase Summary -->
          <div style="background: #f8f8f8; border-radius: 10px; padding: 20px; margin: 20px 0;">
            <h2 style="color: #597485; font-size: 18px; margin: 0 0 15px 0;">Thank you for your purchase</h2>
            <p style="margin: 5px 0; color: #333;"><strong>Purchaser:</strong> ${data.purchaserName}</p>
            <p style="margin: 5px 0; color: #333;"><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            <p style="margin: 5px 0; color: #333;"><strong>Total charged:</strong> $${data.totalAmount.toFixed(2)}</p>
          </div>

          <!-- Gift Card Details -->
          <div style="background: #f0f8ff; border-radius: 10px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #597485; font-size: 18px; margin: 0 0 15px 0;">Gift card details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr>
                  <th style="text-align: left; border-bottom: 1px solid #ddd; padding-bottom: 8px; color: #333;">Recipient</th>
                  <th style="text-align: right; border-bottom: 1px solid #ddd; padding-bottom: 8px; color: #333;">Amount</th>
                  <th style="text-align: right; border-bottom: 1px solid #ddd; padding-bottom: 8px; color: #333;">Card</th>
                </tr>
              </thead>
              <tbody>
                ${cardRows}
              </tbody>
            </table>
          </div>

          <!-- Footer -->
          <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
            ${storeContactHtml || `<p style="color:#999;font-size:12px;margin:4px 0;">${data.storeName}</p>`}
            <p style="color: #999; font-size: 12px; margin: 5px 0;">
              Keep this receipt for your records.
            </p>
          </div>

        </div>
      </body>
    </html>
  `;
}
