import { useEffect, useState } from "react";
import Breadcrumb from "../components/Breadcrumb.jsx";
import { getStoreInfo } from "../services/storeInfoService.js";

const GiftCardEmailPreview = () => {
  const [storeInfo, setStoreInfo] = useState(null);
  const [previewData, setPreviewData] = useState({
    recipientName: "Sarah Johnson",
    giftCardNumber: "GC-X7K9-M3R8",
    amount: 100,
    purchaserName: "John Smith",
    message: "Happy Birthday! Hope this brightens your day. Enjoy some beautiful flowers!",
    redeemUrl: "https://bloomflowershop.com/shop"
  });

  useEffect(() => {
    let isMounted = true;
    getStoreInfo()
      .then((data) => {
        if (isMounted) {
          setStoreInfo(data);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const storeName = (storeInfo?.storeName || "").trim() || "Flower Shop";
  const storeAddress = [
    storeInfo?.address,
    [storeInfo?.city, storeInfo?.state, storeInfo?.zipCode].filter(Boolean).join(", ")
  ]
    .filter(Boolean)
    .join(", ");
  const storeContactLines = [
    storeInfo?.phone ? `Phone: ${storeInfo.phone}` : null,
    storeInfo?.email || null,
    storeAddress || null,
  ].filter(Boolean);
  const storeContactHtml = storeContactLines
    .map((line) => `<p style="color:#999;font-size:12px;margin:4px 0;">${line}</p>`)
    .join("");
  const logoHtml = storeInfo?.logoUrl
    ? `<img src="${storeInfo.logoUrl}" alt="${storeName} logo" style="max-width:160px; max-height:60px; object-fit:contain;" />`
    : `<h1 style="color: #111827; font-size: 28px; margin: 0;">${storeName}</h1>`;

  const emailHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Gift Card from ${storeName}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8f8f8;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 40px;">

          <div style="text-align: center; margin-bottom: 30px;">
            ${logoHtml}
            <p style="color: #6b7280; font-size: 16px; margin: 10px 0 0 0;">Digital Gift Card</p>
          </div>

          <div style="background: #0f0a2e; border-radius: 18px; padding: 28px; color: white;">
            <div style="height: 6px; border-radius: 999px; background: linear-gradient(90deg, #e8643c 0%, #f4456e 50%, #8b6cc1 100%); margin-bottom: 20px;"></div>
            <div style="font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: rgba(255,255,255,0.6);">${storeName}</div>
            <div style="font-size: 42px; font-weight: 700; margin: 12px 0 18px;">$${previewData.amount.toFixed(2)}</div>

            <div style="margin-bottom: 16px;">
              <div style="font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: rgba(255,255,255,0.6);">To</div>
              <div style="font-size: 20px; font-weight: 600;">${previewData.recipientName}</div>
            </div>

            ${previewData.message ? `
              <div style="background: rgba(255,255,255,0.12); border-radius: 12px; padding: 12px; margin-bottom: 16px; font-style: italic; line-height: 1.5;">
                "${previewData.message}"
              </div>
            ` : ""}

            <div>
              <div style="font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: rgba(255,255,255,0.6);">From</div>
              <div style="font-size: 18px; font-weight: 500;">${previewData.purchaserName || "A friend"}</div>
            </div>

            <div style="margin-top: 20px; background: rgba(255,255,255,0.15); border-radius: 12px; padding: 12px; text-align: center;">
              <div style="font-family: monospace; letter-spacing: 2px; font-size: 18px;">${previewData.giftCardNumber}</div>
              <div style="margin-top: 6px; font-size: 12px; color: rgba(255,255,255,0.7);">Gift card code</div>
            </div>
          </div>

          <div style="background: #f8f8f8; border-radius: 12px; padding: 20px; margin: 24px 0;">
            <h3 style="color: #0f0a2e; font-size: 16px; margin: 0 0 12px 0;">How to use your gift card</h3>
            <ul style="color: #4b5563; line-height: 1.6; margin: 0; padding-left: 20px;">
              <li>Enter the gift card code during checkout</li>
              <li>Use online, in-store, or over the phone</li>
              <li>No expiration date</li>
              <li>Remaining balance stays on the card</li>
            </ul>
          </div>

          ${previewData.redeemUrl ? `
            <div style="text-align: center; margin: 20px 0 10px;">
              <a href="${previewData.redeemUrl}" style="background: #111827; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">
                Shop now
              </a>
            </div>
          ` : ""}

          <div style="text-align: center; margin-top: 32px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            ${storeContactHtml || `<p style="color:#999;font-size:12px;margin:4px 0;">${storeName}</p>`}
            <p style="color:#b0b0b0; font-size: 11px; margin: 6px 0 0;">
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
                style={{ border: "none" }}
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default GiftCardEmailPreview;
