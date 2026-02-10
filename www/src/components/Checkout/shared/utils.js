// Smooth scroll helper with controlled duration
export const smoothScrollTo = (element, duration = 600) => {
  if (!element) return;
  const headerOffset = 70; // Account for fixed header
  const elementPosition = element.getBoundingClientRect().top;
  const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
  const startPosition = window.pageYOffset;
  const distance = offsetPosition - startPosition;
  let startTime = null;

  const easeInOutCubic = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  const animation = (currentTime) => {
    if (startTime === null) startTime = currentTime;
    const timeElapsed = currentTime - startTime;
    const progress = Math.min(timeElapsed / duration, 1);
    const ease = easeInOutCubic(progress);
    window.scrollTo(0, startPosition + distance * ease);
    if (timeElapsed < duration) {
      requestAnimationFrame(animation);
    }
  };

  requestAnimationFrame(animation);
};

export const formatRecipientLabel = (recipient) => {
  if (!recipient) return "Recipient";
  const name = [recipient.firstName, recipient.lastName].filter(Boolean).join(" ").trim();
  if (name) return name;
  if (recipient.company) return recipient.company;
  if (recipient.email) return recipient.email;
  return "Recipient";
};

export const formatAddressLabel = (address, index) => {
  if (!address) return `Address ${index + 1}`;
  return (
    address.label ||
    [address.address1, address.city].filter(Boolean).join(", ") ||
    `Address ${index + 1}`
  );
};

export const buildSavedRecipientOptions = (recipients) => {
  if (!Array.isArray(recipients)) return [];

  const options = [];

  recipients.forEach((recipient) => {
    const baseLabel = formatRecipientLabel(recipient);

    // Use primaryAddress as the default address for this recipient
    let defaultAddress = null;

    if (recipient.primaryAddress) {
      defaultAddress = recipient.primaryAddress;
    } else if (Array.isArray(recipient.addresses) && recipient.addresses.length > 0) {
      // Fallback: use first address if no primary address
      defaultAddress = recipient.addresses[0];
    }

    // Create ONE option per recipient (not one per address)
    options.push({
      value: `recipient-${recipient.id}`,
      label: defaultAddress ? `${baseLabel} — ${formatAddressLabel(defaultAddress, 0)}` : baseLabel,
      recipient,
      address: defaultAddress,
    });
  });

  return options;
};

export const sanitizeCustomerPayload = (payload, birthdayPayload = {}) => ({
  firstName: payload.firstName.trim(),
  lastName: payload.lastName.trim(),
  email: payload.email?.trim().toLowerCase() || null,
  phone: payload.phone?.trim() || null,
  notes: payload.notes || null,
  ...birthdayPayload,
});

export const formatCurrency = (value) =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(value);

export const formatDate = (dateString) => {
  if (!dateString) return "Select delivery date";
  const date = new Date(`${dateString}T12:00:00`);
  return date.toLocaleDateString("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

export const formatSuccessCurrency = (amount) =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(amount);
