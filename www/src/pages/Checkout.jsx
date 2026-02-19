import { useMemo, useState } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import Breadcrumb from '../components/Breadcrumb.jsx';
import WizardCheckout from '../components/Checkout/WizardCheckout.jsx';
import { useCart } from '../contexts/CartContext.jsx';
import {
  stripePromise,
  DELIVERY_FEE,
  TAX_RATE,
  STRIPE_APPEARANCE,
} from '../components/Checkout/shared/constants.js';

const CheckoutElements = () => {
  const { cart, getDiscountAmount, hasFreeShipping } = useCart();
  const [completedOrder, setCompletedOrder] = useState(null);

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart],
  );

  const discountAmount = getDiscountAmount();
  const deliveryFee = hasFreeShipping() ? 0 : cart.length ? DELIVERY_FEE : 0;
  const discountedSubtotal = Math.max(subtotal - discountAmount, 0);
  const estimatedTax = Number((discountedSubtotal * TAX_RATE).toFixed(2));
  const estimatedTotal = discountedSubtotal + deliveryFee + estimatedTax;
  const amountInCents = Math.max(Math.round(estimatedTotal * 100), 50);

  return (
    <Elements
      key={`checkout-elements-${amountInCents}`}
      stripe={stripePromise}
      options={{
        mode: 'payment',
        amount: amountInCents,
        currency: 'cad',
        appearance: STRIPE_APPEARANCE,
      }}
    >
      <WizardCheckout
        persistedOrderResult={completedOrder}
        onOrderPlaced={setCompletedOrder}
      />
    </Elements>
  );
};

const Checkout = () => (
  <>
    <Breadcrumb pageName="Checkout" />
    <CheckoutElements />
  </>
);

export default Checkout;
