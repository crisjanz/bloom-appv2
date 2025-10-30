import { useState } from "react";
import Breadcrumb from "../components/Breadcrumb.jsx";

const GiftCardEmailPreview = () => {
  const [previewData, setPreviewData] = useState({
    recipientName: "Sarah Johnson",
    giftCardNumber: "GC-X7K9-M3R8",
    amount: 100,
    purchaserName: "John Smith",
    message: "Happy Birthday! Hope this brightens your day. Enjoy some beautiful flowers!",
    redeemUrl: "https://bloomflowershop.com/shop"
  });

  const emailHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Gift Card from Bloom Flower Shop</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f9f9f9;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 40px;">

          <!-- Header -->
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #597485; font-size: 32px; margin: 0;">🌸 Bloom Flower Shop</h1>
            <p style="color: #666; font-size: 18px; margin: 10px 0 0 0;">Digital Gift Card</p>
          </div>

          <!-- Gift Card -->
          <div style="background: linear-gradient(135deg, #597485 0%, #4e6575 100%); border-radius: 15px; padding: 30px; text-align: center; margin: 30px 0; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
            <div style="background: white; border-radius: 10px; padding: 25px; margin: 10px 0;">
              <h2 style="color: #597485; font-family: monospace; font-size: 24px; margin: 0 0 15px 0; letter-spacing: 2px;">
                ${previewData.giftCardNumber}
              </h2>
              <p style="color: #597485; font-size: 36px; font-weight: bold; margin: 0;">
                $${previewData.amount.toFixed(2)}
              </p>
            </div>
          </div>

          <!-- Recipient Info -->
          <div style="text-align: center; margin: 30px 0;">
            <h3 style="color: #333; font-size: 20px; margin: 0 0 10px 0;">
              Dear ${previewData.recipientName},
            </h3>
            ${previewData.purchaserName ? `
              <p style="color: #666; font-size: 16px; margin: 10px 0;">
                You've received this gift card from <strong>${previewData.purchaserName}</strong>
              </p>
            ` : ''}
            ${previewData.message ? `
              <div style="background: #f8f8f8; border-left: 4px solid #597485; padding: 15px; margin: 20px 0; text-align: left;">
                <p style="color: #333; font-style: italic; margin: 0; font-size: 16px;">
                  "${previewData.message}"
                </p>
              </div>
            ` : ''}
          </div>

          <!-- How to Use -->
          <div style="background: #f8f8f8; border-radius: 10px; padding: 25px; margin: 30px 0;">
            <h3 style="color: #597485; font-size: 18px; margin: 0 0 15px 0; text-align: center;">
              How to Use Your Gift Card
            </h3>
            <ul style="color: #666; line-height: 1.6; margin: 0; padding-left: 20px;">
              <li>Present this card number when placing an order</li>
              <li>Use online, in-store, or over the phone</li>
              <li>No expiration date - never expires!</li>
              <li>Remaining balance stays on your card</li>
            </ul>
          </div>

          <!-- CTA Button -->
          ${previewData.redeemUrl ? `
            <div style="text-align: center; margin: 30px 0;">
              <a href="${previewData.redeemUrl}" style="background: #597485; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
                Shop Now 🌸
              </a>
            </div>
          ` : ''}

          <!-- Footer -->
          <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 14px; margin: 5px 0;">
              Questions? Contact us at Bloom Flower Shop
            </p>
            <p style="color: #999; font-size: 12px; margin: 5px 0;">
              This digital gift card was sent from our secure system.
            </p>
          </div>

        </div>
      </body>
    </html>
  `;

  return (
    <>
      <Breadcrumb pageName="Gift Card Email Preview" />
      <section className="bg-slate-50 py-16">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-slate-900">Gift Card Email Template Preview</h1>
            <p className="mt-2 text-slate-600">
              This is what recipients will see when they receive a digital gift card email.
            </p>
          </div>

          {/* Controls */}
          <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Preview Controls</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-700">Recipient Name</label>
                <input
                  type="text"
                  value={previewData.recipientName}
                  onChange={(e) => setPreviewData({ ...previewData, recipientName: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-2 text-slate-900"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Purchaser Name</label>
                <input
                  type="text"
                  value={previewData.purchaserName}
                  onChange={(e) => setPreviewData({ ...previewData, purchaserName: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-2 text-slate-900"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Amount ($)</label>
                <input
                  type="number"
                  value={previewData.amount}
                  onChange={(e) => setPreviewData({ ...previewData, amount: parseFloat(e.target.value) || 0 })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-2 text-slate-900"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Card Number</label>
                <input
                  type="text"
                  value={previewData.giftCardNumber}
                  onChange={(e) => setPreviewData({ ...previewData, giftCardNumber: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-2 text-slate-900"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Personal Message</label>
                <textarea
                  value={previewData.message}
                  onChange={(e) => setPreviewData({ ...previewData, message: e.target.value })}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-2 text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Email Preview */}
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Email Preview</h3>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                600px max width
              </span>
            </div>
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
              <iframe
                srcDoc={emailHTML}
                title="Email Preview"
                className="h-[800px] w-full"
                style={{ border: 'none' }}
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default GiftCardEmailPreview;
