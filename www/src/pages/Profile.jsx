import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Navigate } from "react-router-dom";
import Breadcrumb from "../components/Breadcrumb.jsx";
import PaymentMethodsTab from "../components/Profile/PaymentMethodsTab.jsx";
import AddressAutocomplete from "../components/AddressAutocomplete.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import authService from "../services/authService.js";
import api from "../services/api.js";

const tabs = [
  { id: "orders", label: "Order History" },
  { id: "recipients", label: "Saved Recipients" },
  { id: "payments", label: "Payment Methods" },
  { id: "account", label: "Account Settings" },
];

const Profile = () => {
  const { customer, isAuthenticated, initializing, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState("orders");
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");

  const [recipients, setRecipients] = useState([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [recipientsError, setRecipientsError] = useState("");

  useEffect(() => {
    if (!customer) return;

    if (activeTab === "orders") {
      loadOrders();
    }

    if (activeTab === "recipients") {
      loadRecipients();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, customer?.id]);

  const loadOrders = async () => {
    try {
      setOrdersLoading(true);
      setOrdersError("");
      const data = await authService.getOrders();
      setOrders(data || []);
    } catch (error) {
      setOrdersError(error.message || "Unable to load orders");
    } finally {
      setOrdersLoading(false);
    }
  };

  const loadRecipients = async () => {
    if (!customer?.id) return;
    try {
      setRecipientsLoading(true);
      setRecipientsError("");
      const data = await api.get(`/customers/${customer.id}/recipients`);
      setRecipients(data || []);
    } catch (error) {
      setRecipientsError(error.message || "Unable to load recipients");
    } finally {
      setRecipientsLoading(false);
    }
  };

  if (!initializing && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (initializing || !customer) {
    return (
      <section className="bg-tg-bg py-20 dark:bg-dark">
        <div className="container mx-auto text-center text-body-color dark:text-dark-6">
          Loading your account...
        </div>
      </section>
    );
  }

  return (
    <>
      <Breadcrumb pageName="My Account" />
      <section className="bg-tg-bg py-20 dark:bg-dark">
        <div className="container mx-auto">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-dark text-3xl font-bold dark:text-white">
                Hello, {customer.firstName}
              </h1>
              <p className="text-body-color text-base dark:text-dark-6">
                Manage your orders, recipients, and account details from one place.
              </p>
            </div>
          </div>

          <div className="mb-6 flex flex-wrap gap-3">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full px-6 py-2 text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? "bg-primary text-white"
                    : "bg-white text-dark hover:bg-primary hover:text-white dark:bg-dark-2 dark:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-stroke bg-white p-6 shadow-xl dark:border-dark-3 dark:bg-dark-2">
            {activeTab === "orders" && (
              <OrdersTab loading={ordersLoading} error={ordersError} orders={orders} />
            )}
            {activeTab === "recipients" && (
              <RecipientsTab
                customerId={customer.id}
                recipients={recipients}
                loading={recipientsLoading}
                error={recipientsError}
                refresh={loadRecipients}
              />
            )}
            {activeTab === "payments" && <PaymentMethodsTab customer={customer} />}
            {activeTab === "account" && (
              <AccountSettingsTab customer={customer} refreshProfile={refreshProfile} />
            )}
          </div>
        </div>
      </section>
    </>
  );
};

const OrdersTab = ({ loading, error, orders }) => {
  if (loading) {
    return <p className="text-body-color dark:text-dark-6">Loading orders...</p>;
  }

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  if (!orders.length) {
    return <p className="text-body-color dark:text-dark-6">No orders yet. Once you place an order, it will appear here.</p>;
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <div
          key={order.id}
          className="rounded-xl border border-stroke p-5 dark:border-dark-3"
        >
          <div className="mb-3 flex flex-wrap items-center justify-between">
            <div>
              <p className="text-dark text-lg font-semibold dark:text-white">
                Order #{order.orderNumber}
              </p>
              <p className="text-body-color text-sm dark:text-dark-6">
                Placed on {new Date(order.createdAt).toLocaleDateString()}
              </p>
            </div>
            <span className="rounded-full bg-primary/10 px-4 py-1 text-sm font-semibold text-primary">
              {order.status.replace(/_/g, " ")}
            </span>
          </div>

          <div className="space-y-2">
            {order.orderItems.map((item) => (
              <div key={item.id} className="flex justify-between text-sm text-body-color dark:text-dark-6">
                <span>
                  {item.customName} × {item.quantity}
                </span>
                <span>{formatCurrencyCents(item.rowTotal)}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 border-t border-stroke pt-3 text-sm dark:border-dark-3">
            <div className="flex justify-between">
              <span className="font-semibold text-dark dark:text-white">Total Paid</span>
              <span className="font-semibold text-dark dark:text-white">
                {formatCurrencyCents(order.paymentAmount)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const RecipientsTab = ({ customerId, recipients, loading, error, refresh }) => {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    address1: "",
    address2: "",
    city: "",
    province: "",
    postalCode: "",
    country: "CA",
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddressSelect = (parsedAddress) => {
    setForm((prev) => ({
      ...prev,
      address1: parsedAddress.address1,
      address2: parsedAddress.address2 || "",
      city: parsedAddress.city,
      province: parsedAddress.province,
      postalCode: parsedAddress.postalCode,
      country: parsedAddress.country || "CA",
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    setFormSuccess("");

    try {
      await api.post(`/customers/${customerId}/recipients`, form);
      setFormSuccess("Recipient saved");
      setForm({
        firstName: "",
        lastName: "",
        phone: "",
        address1: "",
        address2: "",
        city: "",
        province: "",
        postalCode: "",
        country: "CA",
      });
      await refresh();
    } catch (error) {
      setFormError(error.message || "Failed to save recipient");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div>
        <h2 className="text-dark mb-4 text-xl font-semibold dark:text-white">Saved Recipients</h2>
        {loading && <p className="text-body-color dark:text-dark-6">Loading recipients...</p>}
        {error && <p className="text-red-500 text-sm">{error}</p>}
        {!loading && !recipients.length && !error && (
          <p className="text-body-color dark:text-dark-6">
            Add frequent recipients so you can send blooms even quicker next time.
          </p>
        )}
        <div className="space-y-4">
          {recipients.map((recipient) => (
            <div key={recipient.id} className="rounded-xl border border-stroke p-4 dark:border-dark-3">
              <p className="text-dark text-lg font-semibold dark:text-white">
                {recipient.firstName} {recipient.lastName}
              </p>
              <p className="text-body-color text-sm dark:text-dark-6">
                {recipient.addresses?.[0]?.address1 || "No address on file"}
              </p>
              {recipient.phone && (
                <p className="text-body-color text-sm dark:text-dark-6">Phone: {recipient.phone}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-dark mb-4 text-xl font-semibold dark:text-white">Add a Recipient</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="First name"
              name="firstName"
              value={form.firstName}
              onChange={handleChange}
              required
            />
            <Input
              label="Last name"
              name="lastName"
              value={form.lastName}
              onChange={handleChange}
              required
            />
          </div>
          <Input
            label="Phone"
            name="phone"
            value={form.phone}
            onChange={handleChange}
          />
          <div>
            <label className="text-dark mb-2 block text-sm font-medium dark:text-white" htmlFor="address1">
              Address
            </label>
            <AddressAutocomplete
              id="address1"
              value={form.address1}
              onChange={(value) => setForm((prev) => ({ ...prev, address1: value }))}
              onAddressSelect={handleAddressSelect}
              placeholder="Enter street address"
              className="h-12 w-full rounded-lg border border-stroke bg-transparent px-4 text-sm text-dark outline-hidden transition focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
            />
          </div>
          <Input
            label="Apartment / Suite"
            name="address2"
            value={form.address2}
            onChange={handleChange}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="City"
              name="city"
              value={form.city}
              onChange={handleChange}
              required
            />
            <Input
              label="Province / State"
              name="province"
              value={form.province}
              onChange={handleChange}
              required
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Postal code"
              name="postalCode"
              value={form.postalCode}
              onChange={handleChange}
              required
            />
            <Input
              label="Country"
              name="country"
              value={form.country}
              onChange={handleChange}
            />
          </div>

          {formError && <p className="text-red-500 text-sm">{formError}</p>}
          {formSuccess && <p className="text-success text-sm">{formSuccess}</p>}

          <button
            type="submit"
            className="bg-primary hover:bg-primary-dark inline-flex h-12 w-full items-center justify-center rounded-lg text-base font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save recipient"}
          </button>
        </form>
      </div>
    </div>
  );
};


const AccountSettingsTab = ({ customer, refreshProfile }) => {
  const [profileForm, setProfileForm] = useState({
    firstName: customer.firstName || "",
    lastName: customer.lastName || "",
    email: customer.email || "",
    phone: customer.phone || "",
    notes: customer.notes || "",
  });
  const [profileStatus, setProfileStatus] = useState({ loading: false, message: "", error: "" });

  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "" });
  const [passwordStatus, setPasswordStatus] = useState({ loading: false, message: "", error: "" });

  useEffect(() => {
    setProfileForm({
      firstName: customer.firstName || "",
      lastName: customer.lastName || "",
      email: customer.email || "",
      phone: customer.phone || "",
      notes: customer.notes || "",
    });
  }, [customer]);

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setProfileStatus({ loading: true, message: "", error: "" });

    try {
      await authService.updateProfile(profileForm);
      await refreshProfile();
      setProfileStatus({ loading: false, message: "Profile updated", error: "" });
    } catch (error) {
      setProfileStatus({ loading: false, message: "", error: error.message || "Failed to update profile" });
    }
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setPasswordStatus({ loading: true, message: "", error: "" });

    try {
      await authService.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordStatus({ loading: false, message: "Password updated", error: "" });
      setPasswordForm({ currentPassword: "", newPassword: "" });
    } catch (error) {
      setPasswordStatus({ loading: false, message: "", error: error.message || "Failed to change password" });
    }
  };

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <form onSubmit={handleProfileSubmit} className="space-y-4">
        <h2 className="text-dark text-xl font-semibold dark:text-white">Profile details</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="First name"
            name="firstName"
            value={profileForm.firstName}
            onChange={handleProfileChange}
            required
          />
          <Input
            label="Last name"
            name="lastName"
            value={profileForm.lastName}
            onChange={handleProfileChange}
            required
          />
        </div>
        <Input
          label="Email"
          name="email"
          type="email"
          value={profileForm.email}
          onChange={handleProfileChange}
          required
        />
        <Input
          label="Phone"
          name="phone"
          value={profileForm.phone}
          onChange={handleProfileChange}
        />
        <TextArea
          label="Notes"
          name="notes"
          value={profileForm.notes}
          onChange={handleProfileChange}
        />
        {profileStatus.error && <p className="text-red-500 text-sm">{profileStatus.error}</p>}
        {profileStatus.message && <p className="text-success text-sm">{profileStatus.message}</p>}
        <button
          type="submit"
          className="bg-primary hover:bg-primary-dark inline-flex h-12 items-center justify-center rounded-lg px-6 text-base font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
          disabled={profileStatus.loading}
        >
          {profileStatus.loading ? "Saving..." : "Save changes"}
        </button>
      </form>

      <form onSubmit={handlePasswordSubmit} className="space-y-4">
        <h2 className="text-dark text-xl font-semibold dark:text-white">Change password</h2>
        <Input
          label="Current password"
          name="currentPassword"
          type="password"
          value={passwordForm.currentPassword}
          onChange={handlePasswordChange}
          required
        />
        <Input
          label="New password"
          name="newPassword"
          type="password"
          value={passwordForm.newPassword}
          onChange={handlePasswordChange}
          required
        />
        {passwordStatus.error && <p className="text-red-500 text-sm">{passwordStatus.error}</p>}
        {passwordStatus.message && <p className="text-success text-sm">{passwordStatus.message}</p>}
        <button
          type="submit"
          className="bg-primary hover:bg-primary-dark inline-flex h-12 items-center justify-center rounded-lg px-6 text-base font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
          disabled={passwordStatus.loading}
        >
          {passwordStatus.loading ? "Updating..." : "Update password"}
        </button>
      </form>
    </div>
  );
};

const Input = ({ label, name, value, onChange, type = "text", required = false }) => (
  <div>
    <label className="text-dark mb-2 block text-sm font-medium dark:text-white" htmlFor={name}>
      {label}
    </label>
    <input
      id={name}
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      required={required}
      className="h-12 w-full rounded-lg border border-stroke bg-transparent px-4 text-sm text-dark outline-hidden transition focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
    />
  </div>
);

const TextArea = ({ label, name, value, onChange }) => (
  <div>
    <label className="text-dark mb-2 block text-sm font-medium dark:text-white" htmlFor={name}>
      {label}
    </label>
    <textarea
      id={name}
      name={name}
      value={value}
      onChange={onChange}
      rows={4}
      className="w-full rounded-lg border border-stroke bg-transparent p-4 text-sm text-dark outline-hidden transition focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
    />
  </div>
);

const formatCurrencyCents = (amountInCents) => {
  if (typeof amountInCents !== "number") return "$0.00";
  return (amountInCents / 100).toLocaleString("en-CA", {
    style: "currency",
    currency: "CAD",
  });
};

OrdersTab.propTypes = {
  loading: PropTypes.bool.isRequired,
  error: PropTypes.string,
  orders: PropTypes.arrayOf(PropTypes.object).isRequired,
};

RecipientsTab.propTypes = {
  customerId: PropTypes.string.isRequired,
  recipients: PropTypes.arrayOf(PropTypes.object).isRequired,
  loading: PropTypes.bool.isRequired,
  error: PropTypes.string,
  refresh: PropTypes.func.isRequired,
};

AccountSettingsTab.propTypes = {
  customer: PropTypes.object.isRequired,
  refreshProfile: PropTypes.func.isRequired,
};

Input.propTypes = {
  label: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onChange: PropTypes.func.isRequired,
  type: PropTypes.string,
  required: PropTypes.bool,
};

TextArea.propTypes = {
  label: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
};

export default Profile;
