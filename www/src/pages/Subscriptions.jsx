import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Breadcrumb from "../components/Breadcrumb.jsx";
import AddressAutocomplete from "../components/AddressAutocomplete.jsx";
import api from "../services/api";

const formatCurrency = (amountInCents) => {
  const value = Number(amountInCents) || 0;
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(value / 100);
};

const FREQUENCIES = [
  { value: "WEEKLY", label: "Weekly", desc: "Every week" },
  { value: "BIWEEKLY", label: "Biweekly", desc: "Every 2 weeks" },
  { value: "MONTHLY", label: "Monthly", desc: "Once a month" },
];

const DURATIONS = [
  { value: "ongoing", label: "Ongoing", desc: "Cancel anytime", deliveries: null },
  { value: "3", label: "3 Months", desc: "6 deliveries", deliveries: 6 },
  { value: "6", label: "6 Months", desc: "12 deliveries", deliveries: 12 },
  { value: "12", label: "12 Months", desc: "24 deliveries", deliveries: 24 },
];

const COLOR_PALETTES = ["Warm Tones", "Cool Tones", "Bright & Bold", "Pastel & Soft"];

const STEPS = ["Schedule", "Style", "Recipient", "Payment", "Confirm"];

const Subscriptions = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [plans, setPlans] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState(null);

  // Step 1: Schedule
  const [frequency, setFrequency] = useState("BIWEEKLY");
  const [duration, setDuration] = useState("ongoing");
  const [billingType, setBillingType] = useState("RECURRING");

  // Step 2: Style
  const [style, setStyle] = useState(null); // DESIGNERS_CHOICE | PICK_YOUR_OWN
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [colorPalette, setColorPalette] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Step 3: Recipient
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [recipientCity, setRecipientCity] = useState("");
  const [recipientProvince, setRecipientProvince] = useState("BC");
  const [recipientPostalCode, setRecipientPostalCode] = useState("");
  const [preferredDay, setPreferredDay] = useState("1");
  const [startDate, setStartDate] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");

  useEffect(() => {
    api.get("/subscriptions/storefront/plans").then(setPlans).catch(console.error);
    api.get("/subscriptions/storefront/products").then(setProducts).catch(console.error);
  }, []);

  const totalDeliveries = DURATIONS.find((d) => d.value === duration)?.deliveries || null;
  const pricePerDelivery = style === "DESIGNERS_CHOICE" ? selectedPlan?.priceCents || 0 : selectedProduct?.variants?.[0]?.price || 0;
  const totalPrepaidCents = billingType === "PREPAID" && totalDeliveries ? pricePerDelivery * totalDeliveries : null;

  const canProceed = () => {
    switch (step) {
      case 0: return !!frequency;
      case 1: return style === "DESIGNERS_CHOICE" ? !!selectedPlan : !!selectedProduct;
      case 2: return !!(recipientName && recipientAddress && recipientCity && recipientPostalCode && startDate);
      case 3: return true;
      default: return false;
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // For storefront, we need a customer account — for now, create a minimal subscription
      const payload = {
        billingType,
        style,
        planId: selectedPlan?.id || null,
        colorPalette,
        defaultPriceCents: pricePerDelivery,
        totalPrepaidCents,
        totalDeliveries,
        frequency,
        preferredDayOfWeek: parseInt(preferredDay),
        startDate,
        customerId: "storefront-pending", // Will be resolved after Stripe checkout
        recipientName,
        recipientPhone,
        recipientEmail,
        recipientAddress,
        recipientCity,
        recipientProvince,
        recipientPostalCode,
        notes: specialInstructions || null,
        source: "STOREFRONT",
      };

      const result = await api.post("/subscriptions/storefront/purchase", payload);
      setConfirmation(result);
      setStep(4); // Confirmation step
    } catch (err) {
      alert(err.message || "Failed to create subscription");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Breadcrumb pageName="Flower Subscriptions" />
      <section className="bg-white py-12">
        <div className="container mx-auto max-w-3xl px-4">
          {/* Hero */}
          {step < 4 && (
            <div className="mb-10 text-center">
              <h1 className="text-3xl font-bold text-slate-900">Fresh Flowers, Delivered on Your Schedule</h1>
              <p className="mt-3 text-base text-slate-600">
                Beautiful arrangements delivered to your door, every time.
              </p>
            </div>
          )}

          {/* Progress */}
          {step < 4 && (
            <div className="flex items-center justify-center gap-2 mb-8">
              {STEPS.slice(0, 4).map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full text-xs font-medium flex items-center justify-center ${
                    i < step ? "bg-green-500 text-white" : i === step ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-500"
                  }`}>
                    {i < step ? "✓" : i + 1}
                  </div>
                  <span className={`text-xs hidden sm:inline ${i === step ? "text-slate-900 font-medium" : "text-slate-400"}`}>{s}</span>
                  {i < 3 && <div className={`h-px w-8 ${i < step ? "bg-green-500" : "bg-slate-200"}`} />}
                </div>
              ))}
            </div>
          )}

          {/* Step 1: Schedule */}
          {step === 0 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-3">How often?</h2>
                <div className="grid grid-cols-3 gap-3">
                  {FREQUENCIES.map((f) => (
                    <button key={f.value} onClick={() => setFrequency(f.value)}
                      className={`p-4 rounded-xl border-2 text-center transition-all ${frequency === f.value ? "border-slate-900 bg-slate-50" : "border-slate-200 hover:border-slate-300"}`}>
                      <div className="font-medium text-slate-900">{f.label}</div>
                      <div className="text-xs text-slate-500 mt-1">{f.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-3">How long?</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {DURATIONS.map((d) => (
                    <button key={d.value} onClick={() => { setDuration(d.value); setBillingType(d.value === "ongoing" ? "RECURRING" : "PREPAID"); }}
                      className={`p-4 rounded-xl border-2 text-center transition-all ${duration === d.value ? "border-slate-900 bg-slate-50" : "border-slate-200 hover:border-slate-300"}`}>
                      <div className="font-medium text-slate-900">{d.label}</div>
                      <div className="text-xs text-slate-500 mt-1">{d.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {duration !== "ongoing" && (
                <div className="flex gap-3">
                  <button onClick={() => setBillingType("RECURRING")}
                    className={`flex-1 p-3 rounded-xl border-2 text-sm ${billingType === "RECURRING" ? "border-slate-900 bg-slate-50" : "border-slate-200"}`}>
                    <span className="font-medium">Pay as you go</span>
                    <div className="text-xs text-slate-500 mt-1">Charged each delivery</div>
                  </button>
                  <button onClick={() => setBillingType("PREPAID")}
                    className={`flex-1 p-3 rounded-xl border-2 text-sm ${billingType === "PREPAID" ? "border-slate-900 bg-slate-50" : "border-slate-200"}`}>
                    <span className="font-medium">Prepay</span>
                    <div className="text-xs text-slate-500 mt-1">Pay upfront</div>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Style */}
          {step === 1 && (
            <div className="space-y-6">
              {!style && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button onClick={() => setStyle("DESIGNERS_CHOICE")}
                    className="p-6 rounded-xl border-2 border-slate-200 hover:border-slate-400 text-left transition-all">
                    <h3 className="text-lg font-semibold text-slate-900">Designer's Choice</h3>
                    <p className="text-sm text-slate-500 mt-2">Let our florists surprise you with seasonal blooms.</p>
                  </button>
                  <button onClick={() => setStyle("PICK_YOUR_OWN")}
                    className="p-6 rounded-xl border-2 border-slate-200 hover:border-slate-400 text-left transition-all">
                    <h3 className="text-lg font-semibold text-slate-900">Pick Your Arrangements</h3>
                    <p className="text-sm text-slate-500 mt-2">Choose exactly what you'd like to receive each time.</p>
                  </button>
                </div>
              )}

              {style === "DESIGNERS_CHOICE" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-900">Choose your size</h2>
                    <button onClick={() => setStyle(null)} className="text-sm text-slate-500 hover:text-slate-700">Change style</button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {plans.map((plan) => (
                      <button key={plan.id} onClick={() => setSelectedPlan(plan)}
                        className={`p-4 rounded-xl border-2 text-center transition-all ${selectedPlan?.id === plan.id ? "border-slate-900 bg-slate-50 ring-1 ring-slate-900" : "border-slate-200 hover:border-slate-300"}`}>
                        {plan.image && <img src={plan.image} alt={plan.name} className="w-full h-32 object-cover rounded-lg mb-3" />}
                        <div className="font-semibold text-slate-900">{plan.name}</div>
                        <div className="text-slate-600 mt-1">{formatCurrency(plan.priceCents)}/delivery</div>
                        {plan.description && <div className="text-xs text-slate-500 mt-1">{plan.description}</div>}
                      </button>
                    ))}
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-slate-700 mb-2">Color preference (optional)</h3>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => setColorPalette(null)}
                        className={`px-4 py-2 rounded-full text-sm border ${!colorPalette ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                        No Preference
                      </button>
                      {COLOR_PALETTES.map((c) => (
                        <button key={c} onClick={() => setColorPalette(c)}
                          className={`px-4 py-2 rounded-full text-sm border ${colorPalette === c ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {style === "PICK_YOUR_OWN" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-900">Choose your arrangement</h2>
                    <button onClick={() => setStyle(null)} className="text-sm text-slate-500 hover:text-slate-700">Change style</button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {products.map((product) => (
                      <button key={product.id} onClick={() => setSelectedProduct(product)}
                        className={`p-3 rounded-xl border-2 text-center transition-all ${selectedProduct?.id === product.id ? "border-slate-900 bg-slate-50 ring-1 ring-slate-900" : "border-slate-200 hover:border-slate-300"}`}>
                        {product.images?.[0] && <img src={product.images[0]} alt={product.name} className="w-full h-24 object-cover rounded-lg mb-2" />}
                        <div className="text-sm font-medium text-slate-900 truncate">{product.name}</div>
                        <div className="text-xs text-slate-600">{formatCurrency(product.variants?.[0]?.price || 0)}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Recipient */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">Who's receiving the flowers?</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Recipient Name *</label>
                  <input type="text" value={recipientName} onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-500 focus:ring-1 focus:ring-slate-500" placeholder="Full name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                  <input type="tel" value={recipientPhone} onChange={(e) => setRecipientPhone(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-500 focus:ring-1 focus:ring-slate-500" placeholder="(250) 301-5062" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input type="email" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-500 focus:ring-1 focus:ring-slate-500" />
              </div>

              <AddressAutocomplete
                label="Delivery Address *"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                onAddressSelect={(parsed) => {
                  if (parsed.address1) setRecipientAddress(parsed.address1);
                  if (parsed.city) setRecipientCity(parsed.city);
                  if (parsed.province) setRecipientProvince(parsed.province);
                  if (parsed.postalCode) setRecipientPostalCode(parsed.postalCode);
                }}
                placeholder="Start typing address..."
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">City *</label>
                  <input type="text" value={recipientCity} onChange={(e) => setRecipientCity(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-500 focus:ring-1 focus:ring-slate-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Province</label>
                  <select value={recipientProvince} onChange={(e) => setRecipientProvince(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-500 focus:ring-1 focus:ring-slate-500">
                    <option value="BC">British Columbia</option>
                    <option value="AB">Alberta</option>
                    <option value="ON">Ontario</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Postal Code *</label>
                  <input type="text" value={recipientPostalCode} onChange={(e) => setRecipientPostalCode(e.target.value.toUpperCase())}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-500 focus:ring-1 focus:ring-slate-500" placeholder="V6A 1A1" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Preferred Delivery Day</label>
                  <select value={preferredDay} onChange={(e) => setPreferredDay(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-500 focus:ring-1 focus:ring-slate-500">
                    {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((d, i) => (
                      <option key={i} value={i}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Date *</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-500 focus:ring-1 focus:ring-slate-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Special Instructions</label>
                <textarea value={specialInstructions} onChange={(e) => setSpecialInstructions(e.target.value)} rows={2}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                  placeholder='e.g. "no lilies", "leave at back door"' />
              </div>
            </div>
          )}

          {/* Step 4: Payment / Review */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-slate-900">Review & Pay</h2>

              <div className="rounded-xl border border-slate-200 p-5 space-y-3">
                <h3 className="font-semibold text-slate-900">Order Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Style:</span>
                    <span className="text-slate-900">{style === "DESIGNERS_CHOICE" ? `Designer's Choice — ${selectedPlan?.name || ""}` : selectedProduct?.name || ""}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Frequency:</span>
                    <span className="text-slate-900">{FREQUENCIES.find((f) => f.value === frequency)?.label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Duration:</span>
                    <span className="text-slate-900">{DURATIONS.find((d) => d.value === duration)?.label} ({billingType === "RECURRING" ? "pay as you go" : "prepaid"})</span>
                  </div>
                  {colorPalette && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Color:</span>
                      <span className="text-slate-900">{colorPalette}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-200 pt-2 mt-2">
                    <div className="text-xs text-slate-500 mb-1">Delivering to:</div>
                    <div className="text-slate-900">{recipientName}</div>
                    <div className="text-slate-500">{recipientAddress}, {recipientCity}, {recipientProvince} {recipientPostalCode}</div>
                    <div className="text-slate-500">Starting: {new Date(startDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</div>
                  </div>
                  <div className="border-t border-slate-200 pt-2 mt-2 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Per delivery:</span>
                      <span className="text-slate-900">{formatCurrency(pricePerDelivery)}</span>
                    </div>
                    {billingType === "PREPAID" && totalDeliveries && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Deliveries:</span>
                          <span className="text-slate-900">{totalDeliveries}</span>
                        </div>
                        <div className="flex justify-between font-semibold text-base pt-1 border-t border-slate-200">
                          <span>Total:</span>
                          <span>{formatCurrency(totalPrepaidCents)}</span>
                        </div>
                      </>
                    )}
                    {billingType === "RECURRING" && (
                      <div className="flex justify-between font-semibold">
                        <span>Charged each delivery:</span>
                        <span>{formatCurrency(pricePerDelivery)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Confirmation */}
          {step === 4 && confirmation && (
            <div className="text-center space-y-6">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Subscription Confirmed!</h1>

              <div className="rounded-xl border border-slate-200 p-6 text-left max-w-md mx-auto space-y-3">
                <div className="text-center">
                  <div className="text-sm text-slate-500">Subscription #</div>
                  <div className="text-2xl font-bold text-slate-900">{confirmation.subscriptionNumber}</div>
                </div>
                <div className="border-t border-slate-200 pt-3 text-sm space-y-2">
                  <p className="text-slate-700 font-medium">Manage Deliveries:</p>
                  <p className="text-slate-500">Your recipient can view and manage upcoming deliveries at:</p>
                  <div className="bg-slate-50 rounded-lg p-3 text-sm">
                    <div className="font-medium text-slate-900">inyourvaseflowers.com/my-subscription</div>
                    <div className="text-slate-500 mt-1">Subscription #: {confirmation.subscriptionNumber}</div>
                    <div className="text-slate-500">Postal Code: {recipientPostalCode}</div>
                  </div>
                  <p className="text-xs text-slate-400">Confirmation emails sent to you and the recipient.</p>
                </div>
              </div>

              <button onClick={() => navigate("/my-subscription")} className="px-6 py-2.5 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800">
                View My Subscription
              </button>
            </div>
          )}

          {/* Navigation */}
          {step < 4 && (
            <div className="flex justify-between mt-8 pt-4 border-t border-slate-200">
              <button onClick={() => step > 0 ? setStep(step - 1) : navigate("/")}
                className="px-6 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">
                {step === 0 ? "Back" : "Back"}
              </button>

              {step < 3 ? (
                <button onClick={() => setStep(step + 1)} disabled={!canProceed()}
                  className="px-6 py-2.5 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed">
                  Next
                </button>
              ) : (
                <button onClick={handleSubmit} disabled={submitting}
                  className="px-6 py-2.5 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50">
                  {submitting ? "Processing..." : "Proceed to Payment"}
                </button>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default Subscriptions;
