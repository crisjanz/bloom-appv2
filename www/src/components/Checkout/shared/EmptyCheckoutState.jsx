const EmptyCheckoutState = () => (
  <div className="rounded-[20px] border border-dashed border-stroke bg-white p-12 text-center shadow-xl dark:border-dark-3 dark:bg-dark-2">
    <p className="text-2xl font-semibold text-dark dark:text-white">
      Your cart is empty
    </p>
    <p className="text-body-color mx-auto mt-3 max-w-md text-base dark:text-dark-6">
      Add something beautiful to your cart before heading to checkout.
    </p>
    <a
      href="/shop"
      className="bg-primary mt-6 inline-flex items-center justify-center rounded-lg px-8 py-3 text-base font-semibold text-white transition hover:bg-primary/90"
    >
      Browse products
    </a>
  </div>
);

export default EmptyCheckoutState;
