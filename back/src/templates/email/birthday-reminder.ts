export interface BirthdayReminderTemplateData {
  firstName: string;
  recipientName?: string | null;
  daysBefore: number;
  shopName: string;
  shopUrl: string;
  logoUrl?: string | null;
  unsubscribeUrl: string;
  storeAddress?: string | null;
  storePhone?: string | null;
  storeEmail?: string | null;
}

export function buildBirthdayReminderEmail(data: BirthdayReminderTemplateData): string {
  const subjectLine = data.daysBefore === 1
    ? "is tomorrow"
    : `is in ${data.daysBefore} days`;
  const recipientLine = data.recipientName?.trim()
    ? `${data.recipientName}'s birthday ${subjectLine}.`
    : `A birthday ${subjectLine}.`;

  const logoHtml = data.logoUrl
    ? `<img src="${data.logoUrl}" alt="${data.shopName}" style="max-width: 180px; max-height: 64px; object-fit: contain;" />`
    : `<h1 style="margin:0;font-size:28px;color:#111827;">${data.shopName}</h1>`;

  return `
    <div style="font-family: Arial, sans-serif; background:#f3f4f6; margin:0; padding:24px;">
      <div style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:14px; overflow:hidden;">
        <div style="padding:24px 28px 12px; text-align:center;">
          ${logoHtml}
        </div>

        <div style="padding:12px 28px 28px; color:#1f2937;">
          <p style="margin:0 0 16px; font-size:16px;">Hi ${data.firstName || "there"},</p>
          <p style="margin:0 0 20px; font-size:16px; line-height:1.6;">${recipientLine}</p>

          <div style="margin:0 0 24px;">
            <a
              href="${data.shopUrl}"
              style="display:inline-block; background:#3c50e0; color:#ffffff; text-decoration:none; padding:12px 20px; border-radius:8px; font-weight:600;"
            >Shop Now</a>
          </div>

          <p style="margin:0 0 4px; font-size:12px; color:#6b7280;">${data.shopName}</p>
          ${data.storeAddress ? `<p style="margin:0 0 4px; font-size:12px; color:#6b7280;">${data.storeAddress}</p>` : ""}
          ${data.storePhone ? `<p style="margin:0 0 4px; font-size:12px; color:#6b7280;">${data.storePhone}</p>` : ""}
          ${data.storeEmail ? `<p style="margin:0 0 12px; font-size:12px; color:#6b7280;">${data.storeEmail}</p>` : ""}

          <p style="margin:0; font-size:12px; color:#6b7280;">
            Prefer not to receive these reminders?
            <a href="${data.unsubscribeUrl}" style="color:#3c50e0;">Unsubscribe</a>
          </p>
        </div>
      </div>
    </div>
  `;
}
