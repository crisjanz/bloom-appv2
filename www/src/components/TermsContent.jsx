const TermsContent = () => (
  <div className="prose max-w-none dark:prose-invert prose-lg">
    <h1 className="mb-8 text-3xl font-bold text-dark dark:text-white">
      Terms & Conditions
    </h1>

    <section className="mb-8">
      <h2 className="mb-4 text-2xl font-semibold text-dark dark:text-white">
        1. Agreement to Terms
      </h2>
      <p className="mb-4 text-body-color dark:text-dark-6">
        By accessing and placing an order with In Your Vase Flowers, you confirm that you are in agreement with and bound by the terms and conditions contained in the Terms & Conditions outlined below. These terms apply to the entire website and any email or other type of communication between you and In Your Vase Flowers.
      </p>
    </section>

    <section className="mb-8">
      <h2 className="mb-4 text-2xl font-semibold text-dark dark:text-white">
        2. Delivery Policy
      </h2>
      <p className="mb-4 text-body-color dark:text-dark-6">
        We deliver fresh flowers and arrangements to addresses within our service area. Delivery times are estimates and may vary due to weather conditions, traffic, or other unforeseen circumstances. We will make every effort to deliver your order on the requested date.
      </p>
      <p className="mb-4 text-body-color dark:text-dark-6">
        If the recipient is not available at the time of delivery, we will make reasonable attempts to contact them or leave the arrangement in a safe location. In Your Vase Flowers is not responsible for orders left unattended per the recipient&apos;s or sender&apos;s request.
      </p>
    </section>

    <section className="mb-8">
      <h2 className="mb-4 text-2xl font-semibold text-dark dark:text-white">
        3. Product Quality
      </h2>
      <p className="mb-4 text-body-color dark:text-dark-6">
        All flowers are carefully selected and arranged by our professional florists. Due to the seasonal availability of flowers, we reserve the right to substitute flowers or containers of equal or greater value while maintaining the overall design and color scheme.
      </p>
      <p className="mb-4 text-body-color dark:text-dark-6">
        Photos shown on our website are representative of the arrangements. Actual products may vary slightly due to the natural variation in flowers and the creative discretion of our florists.
      </p>
    </section>

    <section className="mb-8">
      <h2 className="mb-4 text-2xl font-semibold text-dark dark:text-white">
        4. Pricing and Payment
      </h2>
      <p className="mb-4 text-body-color dark:text-dark-6">
        All prices are listed in Canadian Dollars (CAD) and include applicable taxes unless otherwise stated. We accept payment via credit card, debit card, and other payment methods as displayed during checkout.
      </p>
      <p className="mb-4 text-body-color dark:text-dark-6">
        Prices are subject to change without notice. However, the price charged will be the price displayed at the time of order placement.
      </p>
    </section>

    <section className="mb-8">
      <h2 className="mb-4 text-2xl font-semibold text-dark dark:text-white">
        5. Cancellation and Refund Policy
      </h2>
      <p className="mb-4 text-body-color dark:text-dark-6">
        Orders may be cancelled up to 24 hours before the scheduled delivery date for a full refund. Cancellations made less than 24 hours before delivery may be subject to a cancellation fee.
      </p>
      <p className="mb-4 text-body-color dark:text-dark-6">
        If you are not satisfied with your order, please contact us within 24 hours of delivery. We will work with you to resolve any issues, which may include a replacement arrangement or refund at our discretion.
      </p>
    </section>

    <section className="mb-8">
      <h2 className="mb-4 text-2xl font-semibold text-dark dark:text-white">
        6. Perishable Products
      </h2>
      <p className="mb-4 text-body-color dark:text-dark-6">
        Fresh flowers are perishable products. Proper care instructions will be provided with your order. In Your Vase Flowers is not responsible for the longevity of flowers once delivered and cared for by the recipient.
      </p>
    </section>

    <section className="mb-8">
      <h2 className="mb-4 text-2xl font-semibold text-dark dark:text-white">
        7. Privacy Policy
      </h2>
      <p className="mb-4 text-body-color dark:text-dark-6">
        We respect your privacy and are committed to protecting your personal information. We collect only the information necessary to process and deliver your order. Your information will not be shared with third parties except as necessary to complete your order.
      </p>
    </section>

    <section className="mb-8">
      <h2 className="mb-4 text-2xl font-semibold text-dark dark:text-white">
        8. Limitation of Liability
      </h2>
      <p className="mb-4 text-body-color dark:text-dark-6">
        In Your Vase Flowers shall not be liable for any indirect, incidental, special, or consequential damages arising out of or in connection with our products or services. Our total liability shall not exceed the purchase price of the product.
      </p>
    </section>

    <section className="mb-8">
      <h2 className="mb-4 text-2xl font-semibold text-dark dark:text-white">
        9. Contact Information
      </h2>
      <p className="mb-4 text-body-color dark:text-dark-6">
        If you have any questions about these Terms & Conditions, please contact us:
      </p>
      <div className="text-body-color dark:text-dark-6">
        <p className="mb-2">
          <strong className="text-dark dark:text-white">In Your Vase Flowers</strong>
        </p>
        <p className="mb-2">4190 15th Ave, Prince George, BC</p>
        <p className="mb-2">Phone: 1 (250) 562-8273</p>
        <p className="mb-2">Email: IYVflowers@gmail.com</p>
      </div>
    </section>

    <section className="mb-8">
      <h2 className="mb-4 text-2xl font-semibold text-dark dark:text-white">
        10. Changes to Terms
      </h2>
      <p className="mb-4 text-body-color dark:text-dark-6">
        We reserve the right to modify these Terms & Conditions at any time. Changes will be effective immediately upon posting to our website. Your continued use of our services after changes are posted constitutes acceptance of the modified terms.
      </p>
    </section>

    <p className="mt-12 text-sm text-body-color dark:text-dark-6">
      Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
    </p>
  </div>
);

export default TermsContent;
