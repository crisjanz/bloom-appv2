import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Breadcrumb from "../components/Breadcrumb.jsx";
import BirthdayOptIn from "../components/Checkouts/BirthdayOptIn.jsx";
import { fetchGift, saveGift } from "../services/giftTokenService.js";

const initialBirthday = { optIn: true, month: "", day: "", year: "" };

const BirthdayGift = () => {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [gift, setGift] = useState(null);
  const [error, setError] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [birthday, setBirthday] = useState(initialBirthday);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    contactType: "email",
    email: "",
    phone: "",
    consent: false,
  });

  useEffect(() => {
    const loadGift = async () => {
      try {
        const data = await fetchGift(token);
        setGift(data);
      } catch (err) {
        setError(err.message || "Unable to load gift");
      } finally {
        setLoading(false);
      }
    };
    loadGift();
  }, [token]);

  const couponLabel = useMemo(() => {
    if (!gift) return "";
    if (gift.couponType === "PERCENTAGE") return `${gift.couponValue}% off`;
    if (gift.couponType === "FIXED_AMOUNT") return `$${(gift.couponValue / 100).toFixed(2)} off`;
    if (gift.couponType === "FREE_SHIPPING") return "Free delivery";
    return "Birthday gift";
  }, [gift]);

  const handleBirthdayToggle = (checked) => {
    setBirthday((prev) => ({
      ...prev,
      optIn: checked,
      ...(checked ? {} : { month: "", day: "", year: "" }),
    }));
  };

  const handleBirthdayChange = (field, value) => {
    setBirthday((prev) => ({ ...prev, [field]: value }));
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const validate = () => {
    const errs = {};
    if (!form.firstName.trim()) errs.firstName = "First name required";
    if (!form.lastName.trim()) errs.lastName = "Last name required";
    if (form.contactType === "email") {
      if (!form.email.trim()) errs.email = "Email required";
    } else if (!form.phone.trim()) {
      errs.phone = "Phone required";
    }
    if (!form.consent) errs.consent = "Consent required";
    if (birthday.optIn) {
      if (!birthday.month) errs.birthdayMonth = "Select month";
      if (!birthday.day) errs.birthdayDay = "Select day";
    }
    return errs;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveMessage("");
    const errs = validate();
    setFormErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        contactType: form.contactType,
        email: form.contactType === "email" ? form.email.trim() : undefined,
        phone: form.contactType === "sms" ? form.phone.trim() : undefined,
        consent: form.consent,
        birthdayMonth: Number(birthday.month),
        birthdayDay: Number(birthday.day),
        birthdayYear: birthday.year ? Number(birthday.year) : null,
      };
      const result = await saveGift(token, payload);
      setSaveMessage(result.message || "Saved! We'll remember your birthday surprise.");
      setGift((prev) => prev ? { ...prev, status: "CLAIMED" } : prev);
    } catch (err) {
      setError(err.message || "Failed to save gift");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <Breadcrumb pageName="Birthday Gift" />
        <section className="bg-white py-16 dark:bg-dark">
          <div className="container mx-auto text-center text-dark dark:text-white">Loading gift…</div>
        </section>
      </>
    );
  }

  if (error || !gift) {
    return (
      <>
        <Breadcrumb pageName="Birthday Gift" />
        <section className="bg-white py-16 dark:bg-dark">
          <div className="container mx-auto text-center">
            <p className="text-lg font-semibold text-dark dark:text-white">This gift link is not available.</p>
            <p className="text-body-color dark:text-dark-6 mt-2">{error || "Please contact us for help."}</p>
          </div>
        </section>
      </>
    );
  }

  const isInactive = ["EXPIRED", "CLAIMED", "REDEEMED", "REVOKED"].includes(gift.status);

  return (
    <>
      <Breadcrumb pageName="Birthday Gift" />
      <section className="bg-white py-10 dark:bg-dark lg:py-16">
        <div className="container mx-auto">
          <div className="mx-auto max-w-3xl rounded-lg border border-stroke/60 bg-white p-6 shadow-lg dark:border-dark-3 dark:bg-dark-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-wide text-primary">Birthday Gift</p>
                <h1 className="mt-1 text-2xl font-semibold text-dark dark:text-white">
                  {couponLabel}
                </h1>
                <p className="text-body-color dark:text-dark-6">Courtesy of Bloom — no login needed.</p>
                {gift.expiresAt && (
                  <p className="text-xs text-body-color dark:text-dark-6">
                    Expires {new Date(gift.expiresAt).toLocaleDateString("en-CA")}
                  </p>
                )}
              </div>
              {gift.status && (
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {gift.status}
                </span>
              )}
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <button
                  type="button"
                  className="w-full rounded-md bg-primary px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => setShowCode(true)}
                  disabled={!gift.couponCode}
                >
                  Use now
                </button>
                {showCode && (
                  <div className="rounded-md border border-dashed border-primary/50 bg-primary/5 p-4 text-center">
                    <p className="text-xs uppercase tracking-wide text-body-color dark:text-dark-6">Coupon code</p>
                    <p className="mt-1 text-2xl font-semibold text-dark dark:text-white">{gift.couponCode}</p>
                    <Link
                      to="/shop"
                      className="mt-3 inline-flex items-center justify-center rounded-md bg-dark px-4 py-2 text-xs font-semibold text-white transition hover:bg-dark/80 dark:bg-primary"
                    >
                      Shop now
                    </Link>
                  </div>
                )}

                <div className="rounded-md bg-gray-50 p-4 text-sm text-body-color dark:bg-dark-3 dark:text-dark-6">
                  <p className="font-semibold text-dark dark:text-white">How it works</p>
                  <ol className="mt-2 space-y-1 list-decimal pl-5">
                    <li>Use your gift right away with the coupon code.</li>
                    <li>Or save it — we’ll remember your birthday and keep this code handy.</li>
                  </ol>
                </div>
              </div>

              <div className="rounded-md border border-stroke/60 p-4 dark:border-dark-3">
                <h2 className="text-lg font-semibold text-dark dark:text-white">Save for later</h2>
                <p className="text-sm text-body-color dark:text-dark-6">
                  We’ll keep this gift for you. Provide your contact and birthday so we can send it at the right time.
                </p>
                <form className="mt-4 space-y-3" onSubmit={handleSave}>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <LabeledInput
                      label="First name"
                      name="firstName"
                      value={form.firstName}
                      onChange={handleInputChange}
                      error={formErrors.firstName}
                      required
                    />
                    <LabeledInput
                      label="Last name"
                      name="lastName"
                      value={form.lastName}
                      onChange={handleInputChange}
                      error={formErrors.lastName}
                      required
                    />
                  </div>

                  <div className="flex gap-3">
                    <label className="flex items-center gap-2 text-sm text-body-color dark:text-dark-6">
                      <input
                        type="radio"
                        name="contactType"
                        value="email"
                        checked={form.contactType === "email"}
                        onChange={handleInputChange}
                        className="text-primary focus:ring-primary"
                      />
                      Email
                    </label>
                    <label className="flex items-center gap-2 text-sm text-body-color dark:text-dark-6">
                      <input
                        type="radio"
                        name="contactType"
                        value="sms"
                        checked={form.contactType === "sms"}
                        onChange={handleInputChange}
                        className="text-primary focus:ring-primary"
                      />
                      SMS
                    </label>
                  </div>

                  {form.contactType === "email" ? (
                    <LabeledInput
                      label="Email"
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleInputChange}
                      error={formErrors.email}
                      required
                    />
                  ) : (
                    <LabeledInput
                      label="Phone"
                      name="phone"
                      value={form.phone}
                      onChange={handleInputChange}
                      error={formErrors.phone}
                      required
                    />
                  )}

                  <BirthdayOptIn
                    value={birthday}
                    onToggle={handleBirthdayToggle}
                    onChange={handleBirthdayChange}
                    errors={formErrors}
                  />

                  <label className="flex items-start gap-3 text-sm text-body-color dark:text-dark-6">
                    <input
                      type="checkbox"
                      name="consent"
                      checked={form.consent}
                      onChange={handleInputChange}
                      className="mt-1 h-4 w-4 rounded border border-stroke text-primary focus:ring-primary"
                    />
                    <span>I agree to receive this birthday gift and related reminders.</span>
                  </label>
                  {formErrors.consent && <p className="text-xs text-red-500">{formErrors.consent}</p>}

                  <button
                    type="submit"
                    disabled={saving || isInactive}
                    className="w-full rounded-md bg-dark px-4 py-3 text-sm font-semibold text-white transition hover:bg-dark/80 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-primary"
                  >
                    {saving ? "Saving…" : "Save for later"}
                  </button>
                  {saveMessage && <p className="text-sm font-semibold text-success">{saveMessage}</p>}
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

const LabeledInput = ({ label, name, value, onChange, error, type = "text", required }) => (
  <div className="space-y-1">
    <label className="text-xs font-medium text-body-color dark:text-dark-6">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      className="w-full rounded-md border border-stroke bg-transparent px-3 py-2 text-sm text-dark outline-hidden focus:border-primary dark:border-dark-3 dark:text-white"
    />
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
);

export default BirthdayGift;
