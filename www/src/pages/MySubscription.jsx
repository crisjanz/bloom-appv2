import { useState } from "react";
import Breadcrumb from "../components/Breadcrumb.jsx";
import api from "../services/api";

const formatCurrency = (amountInCents) => {
  const value = Number(amountInCents) || 0;
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(value / 100);
};

const formatDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });

const STATUS_COLORS = {
  ACTIVE: "text-green-600",
  PAUSED: "text-yellow-600",
  CANCELLED: "text-red-600",
  COMPLETED: "text-slate-500",
};

const DELIVERY_STATUS_COLORS = {
  SCHEDULED: "text-green-600",
  PREPARING: "text-blue-600",
  DELIVERED: "text-slate-500",
  SKIPPED: "text-yellow-600",
  RESCHEDULED: "text-orange-500",
};

const FREQUENCY_LABELS = {
  WEEKLY: "Weekly",
  BIWEEKLY: "Biweekly",
  MONTHLY: "Monthly",
  CUSTOM: "Custom",
};

const MySubscription = () => {
  const [subNumber, setSubNumber] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [subscription, setSubscription] = useState(null);
  const [rescheduleId, setRescheduleId] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [noteId, setNoteId] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const handleLookup = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (accessCode) {
        params.set("accessCode", accessCode);
      } else {
        if (!subNumber.trim() || !postalCode.trim()) {
          setError("Enter your subscription number and postal code.");
          setLoading(false);
          return;
        }
        params.set("subscriptionNumber", subNumber.trim().toUpperCase());
        params.set("postalCode", postalCode.trim().toUpperCase());
      }

      const data = await api.get(`/subscriptions/storefront/lookup?${params.toString()}`);
      setSubscription(data);
    } catch (err) {
      setError(err.message || "Subscription not found.");
    } finally {
      setLoading(false);
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleDate || !rescheduleId) return;
    setActionLoading(true);
    try {
      const updated = await api.patch(
        `/subscriptions/storefront/${subscription.id}/deliveries/${rescheduleId}?accessCode=${subscription.accessCode}`,
        { scheduledDate: rescheduleDate }
      );
      setSubscription((prev) => ({
        ...prev,
        deliveries: prev.deliveries.map((d) => (d.id === rescheduleId ? { ...d, ...updated } : d)),
      }));
      setRescheduleId(null);
      setRescheduleDate("");
    } catch (err) {
      alert(err.message || "Failed to reschedule");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteId) return;
    setActionLoading(true);
    try {
      const updated = await api.patch(
        `/subscriptions/storefront/${subscription.id}/deliveries/${noteId}?accessCode=${subscription.accessCode}`,
        { customNotes: noteText }
      );
      setSubscription((prev) => ({
        ...prev,
        deliveries: prev.deliveries.map((d) => (d.id === noteId ? { ...d, ...updated } : d)),
      }));
      setNoteId(null);
      setNoteText("");
    } catch (err) {
      alert(err.message || "Failed to save note");
    } finally {
      setActionLoading(false);
    }
  };

  const now = new Date();
  const upcomingDeliveries = subscription?.deliveries?.filter((d) => ["SCHEDULED", "PREPARING", "RESCHEDULED"].includes(d.status)) || [];
  const pastDeliveries = subscription?.deliveries?.filter((d) => ["DELIVERED", "SKIPPED"].includes(d.status)) || [];

  // Lookup form
  if (!subscription) {
    return (
      <>
        <Breadcrumb pageName="My Subscription" />
        <section className="bg-white py-16">
          <div className="container mx-auto max-w-lg px-4">
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-semibold text-slate-900">Manage Your Subscription</h1>
              <p className="mt-3 text-base text-slate-600">View and manage your upcoming flower deliveries.</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <form onSubmit={handleLookup} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Subscription Number</label>
                  <input type="text" value={subNumber} onChange={(e) => setSubNumber(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                    placeholder="SUB-0042" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Postal Code</label>
                  <input type="text" value={postalCode} onChange={(e) => setPostalCode(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                    placeholder="V6A 1A1" />
                </div>

                <div className="text-center text-xs text-slate-400 my-2">Or use your access code:</div>
                <div>
                  <input type="text" value={accessCode} onChange={(e) => setAccessCode(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                    placeholder="Access code" />
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <button type="submit" disabled={loading}
                  className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">
                  {loading ? "Looking up..." : "Look Up"}
                </button>
              </form>
            </div>
          </div>
        </section>
      </>
    );
  }

  // Subscription dashboard
  return (
    <>
      <Breadcrumb pageName="My Subscription" />
      <section className="bg-white py-12">
        <div className="container mx-auto max-w-3xl px-4">
          {/* Header */}
          <div className="rounded-xl border border-slate-200 p-5 mb-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="text-lg font-bold text-slate-900">{subscription.subscriptionNumber}</div>
                <div className="text-sm text-slate-500">
                  {subscription.style === "DESIGNERS_CHOICE"
                    ? `${subscription.plan?.name || "Designer's Choice"} — ${FREQUENCY_LABELS[subscription.frequency]}`
                    : `Pick Your Arrangements — ${FREQUENCY_LABELS[subscription.frequency]}`}
                </div>
                {subscription.colorPalette && (
                  <div className="text-xs text-slate-400 mt-1">Color: {subscription.colorPalette}</div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-2xl ${STATUS_COLORS[subscription.status] || "text-slate-500"}`}>&#x2022;</span>
                <span className="text-sm font-medium text-slate-700">{subscription.status}</span>
              </div>
            </div>
          </div>

          {/* Upcoming Deliveries */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-3">Upcoming Deliveries</h2>
            {upcomingDeliveries.length === 0 ? (
              <p className="text-sm text-slate-500 bg-slate-50 rounded-lg p-4">No upcoming deliveries.</p>
            ) : (
              <div className="rounded-xl border border-slate-200 divide-y divide-slate-200">
                {upcomingDeliveries.map((d) => (
                  <div key={d.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-slate-900">{formatDate(d.scheduledDate)}</div>
                        <div className="text-sm text-slate-500 mt-0.5">
                          {d.productName || d.product?.name || subscription.plan?.name || "Designer's Choice"}
                        </div>
                        {d.customNotes && <div className="text-xs text-slate-400 mt-1">Note: {d.customNotes}</div>}
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-slate-900">{formatCurrency(d.priceCents)}</div>
                        <div className="flex items-center gap-1 mt-1">
                          <span className={`text-lg ${DELIVERY_STATUS_COLORS[d.status] || "text-slate-500"}`}>&#x2022;</span>
                          <span className="text-xs text-slate-500">{d.status}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 mt-3">
                      {d.rescheduleCount < 2 && (
                        <button onClick={() => { setRescheduleId(d.id); setRescheduleDate(""); }}
                          className="text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 px-3 py-1.5 rounded-lg">
                          Reschedule
                        </button>
                      )}
                      <button onClick={() => { setNoteId(d.id); setNoteText(d.customNotes || ""); }}
                        className="text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 px-3 py-1.5 rounded-lg">
                        {d.customNotes ? "Edit Note" : "Add Note"}
                      </button>
                    </div>

                    {/* Reschedule inline */}
                    {rescheduleId === d.id && (
                      <div className="mt-3 flex items-center gap-2 bg-slate-50 p-3 rounded-lg">
                        <input type="date" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)}
                          className="flex-1 rounded border border-slate-300 px-3 py-1.5 text-sm" />
                        <button onClick={handleReschedule} disabled={actionLoading || !rescheduleDate}
                          className="px-3 py-1.5 bg-slate-900 text-white rounded text-xs disabled:opacity-50">
                          {actionLoading ? "..." : "Save"}
                        </button>
                        <button onClick={() => setRescheduleId(null)} className="text-xs text-slate-500">Cancel</button>
                      </div>
                    )}

                    {/* Note inline */}
                    {noteId === d.id && (
                      <div className="mt-3 flex items-center gap-2 bg-slate-50 p-3 rounded-lg">
                        <input type="text" value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="e.g. leave at back door"
                          className="flex-1 rounded border border-slate-300 px-3 py-1.5 text-sm" />
                        <button onClick={handleAddNote} disabled={actionLoading}
                          className="px-3 py-1.5 bg-slate-900 text-white rounded text-xs disabled:opacity-50">
                          {actionLoading ? "..." : "Save"}
                        </button>
                        <button onClick={() => setNoteId(null)} className="text-xs text-slate-500">Cancel</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Past Deliveries */}
          {pastDeliveries.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">Past Deliveries</h2>
              <div className="rounded-xl border border-slate-200 divide-y divide-slate-200">
                {pastDeliveries.map((d) => (
                  <div key={d.id} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="text-sm text-slate-700">{formatDate(d.scheduledDate)}</div>
                      <div className="text-xs text-slate-400">{d.productName || d.product?.name || "Designer's Choice"}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-slate-700">{formatCurrency(d.priceCents)}</div>
                      <div className="flex items-center gap-1">
                        <span className={`text-lg ${DELIVERY_STATUS_COLORS[d.status] || "text-slate-500"}`}>&#x2022;</span>
                        <span className="text-xs text-slate-400">{d.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Back to lookup */}
          <div className="mt-8 text-center">
            <button onClick={() => setSubscription(null)} className="text-sm text-slate-500 hover:text-slate-700">
              Look up a different subscription
            </button>
          </div>
        </div>
      </section>
    </>
  );
};

export default MySubscription;
