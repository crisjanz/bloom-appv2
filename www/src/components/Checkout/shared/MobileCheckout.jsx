import PropTypes from "prop-types";
import { MobileAccordionSection } from "./AccordionSections";
import { MobileStepActions } from "./MobileInputs";
import MobileRecipientForm from "../RecipientStep/MobileRecipientForm";
import MobileCustomerForm from "../CustomerStep/MobileCustomerForm";
import MobilePaymentForm from "../PaymentStep/MobilePaymentForm";
import MobileStickyBottomSummary from "./MobileStickyBottomSummary";

const MobileCheckout = ({
  activeStep,
  setActiveStep,
  recipient,
  recipientErrors,
  onRecipientChange,
  deliveryDate,
  onDateChange,
  onRecipientPreset,
  instructionPresets,
  savedRecipientOptions,
  savedRecipientsLoading,
  savedRecipientsError,
  selectedRecipientOption,
  onSelectSavedRecipient,
  isNewRecipient,
  onAddressAutocompleteSelect,
  recipientModifiedAfterAutofill,
  customer,
  customerErrors,
  onCustomerChange,
  birthday,
  onBirthdayToggle,
  onBirthdayChange,
  isAuthenticated,
  payment,
  paymentErrors,
  onPaymentChange,
  cardError,
  onCardChange,
  savedCards,
  savedCardsLoading,
  selectedPaymentMethod,
  onSelectPaymentMethod,
  advanceStep,
  goBack,
  cart,
  cartCount,
  subtotal,
  deliveryFee,
  tax,
  total,
  discountAmount,
  discountLabel,
  couponFreeShipping,
  formatCurrency,
  formatDate,
  coupon,
  couponInput,
  onCouponInputChange,
  couponMessage,
  couponError,
  onApplyCoupon,
  onRemoveCoupon,
  applyingCoupon,
  onPlaceOrder,
  isSubmitting,
  submitError,
}) => (
  <section className="bg-white pb-32 pt-6 dark:bg-dark md:hidden">
    <div className="container mx-auto px-4">
      <div className="space-y-6">
        <MobileAccordionSection
          step={1}
          title="Recipient"
          open={activeStep === 1}
          onToggle={() => setActiveStep(activeStep === 1 ? 0 : 1)}
        >
          <MobileRecipientForm
            data={recipient}
            errors={recipientErrors}
            onChange={onRecipientChange}
            instructionPresets={instructionPresets}
            onPresetSelect={onRecipientPreset}
            deliveryDate={deliveryDate}
            onDateChange={onDateChange}
            savedRecipientOptions={savedRecipientOptions}
            savedRecipientsLoading={savedRecipientsLoading}
            savedRecipientsError={savedRecipientsError}
            selectedSavedRecipientOption={selectedRecipientOption}
            onSavedRecipientChange={onSelectSavedRecipient}
            isNewRecipient={isNewRecipient}
            onAddressAutocompleteSelect={onAddressAutocompleteSelect}
            recipientModifiedAfterAutofill={recipientModifiedAfterAutofill}
          />
          <MobileStepActions
            primaryLabel="Save & Continue"
            onPrimary={() => advanceStep(1)}
            primaryDisabled={false}
          />
        </MobileAccordionSection>

        <MobileAccordionSection
          step={2}
          title="Customer"
          open={activeStep === 2}
          onToggle={() => setActiveStep(activeStep === 2 ? 0 : 2)}
        >
        <MobileCustomerForm
          data={customer}
          errors={customerErrors}
          onChange={onCustomerChange}
          birthday={birthday}
          onBirthdayToggle={onBirthdayToggle}
          onBirthdayChange={onBirthdayChange}
          isAuthenticated={isAuthenticated}
        />
          <MobileStepActions
            primaryLabel="Save & Continue"
            onPrimary={() => advanceStep(2)}
            secondaryLabel="Previous"
            onSecondary={() => goBack(2)}
            primaryDisabled={false}
          />
        </MobileAccordionSection>

        <MobileAccordionSection
          step={3}
          title="Payment & Review"
          open={activeStep === 3}
          onToggle={() => setActiveStep(activeStep === 3 ? 0 : 3)}
        >
          <MobilePaymentForm
            data={payment}
            errors={paymentErrors}
            onChange={onPaymentChange}
            cardError={cardError}
            onCardChange={onCardChange}
            savedCards={savedCards}
            savedCardsLoading={savedCardsLoading}
            selectedPaymentMethod={selectedPaymentMethod}
            onSelectPaymentMethod={onSelectPaymentMethod}
            cart={cart}
            formatCurrency={formatCurrency}
            coupon={coupon}
            couponInput={couponInput}
            onCouponInputChange={onCouponInputChange}
            couponMessage={couponMessage}
            couponError={couponError}
            onApplyCoupon={onApplyCoupon}
            onRemoveCoupon={onRemoveCoupon}
            applyingCoupon={applyingCoupon}
            subtotal={subtotal}
            deliveryFee={deliveryFee}
            tax={tax}
            total={total}
            discountAmount={discountAmount}
            discountLabel={discountLabel}
            couponFreeShipping={couponFreeShipping}
          />
          <MobileStepActions
            primaryLabel={isSubmitting ? "Submitting…" : "Place Order"}
            onPrimary={onPlaceOrder}
            primaryDisabled={isSubmitting}
            secondaryLabel="Previous"
            onSecondary={() => goBack(3)}
          />
          {submitError && (
            <p className="text-red-500 pt-2 text-sm">{submitError}</p>
          )}
        </MobileAccordionSection>
      </div>
    </div>

    <MobileStickyBottomSummary
      cart={cart}
      subtotal={subtotal}
      deliveryFee={deliveryFee}
      tax={tax}
      total={total}
      discountAmount={discountAmount}
      discountLabel={discountLabel}
      coupon={coupon}
      couponFreeShipping={couponFreeShipping}
      formatCurrency={formatCurrency}
      formatDate={formatDate}
    />
  </section>
);

MobileCheckout.propTypes = {
  activeStep: PropTypes.number.isRequired,
  setActiveStep: PropTypes.func.isRequired,
  recipient: PropTypes.object.isRequired,
  recipientErrors: PropTypes.object.isRequired,
  onRecipientChange: PropTypes.func.isRequired,
  deliveryDate: PropTypes.string,
  onDateChange: PropTypes.func.isRequired,
  onRecipientPreset: PropTypes.func.isRequired,
  instructionPresets: PropTypes.array.isRequired,
  savedRecipientOptions: PropTypes.array.isRequired,
  savedRecipientsLoading: PropTypes.bool.isRequired,
  savedRecipientsError: PropTypes.string,
  selectedRecipientOption: PropTypes.string.isRequired,
  onSelectSavedRecipient: PropTypes.func.isRequired,
  isNewRecipient: PropTypes.bool.isRequired,
  onAddressAutocompleteSelect: PropTypes.func.isRequired,
  recipientModifiedAfterAutofill: PropTypes.bool.isRequired,
  customer: PropTypes.object.isRequired,
  customerErrors: PropTypes.object.isRequired,
  onCustomerChange: PropTypes.func.isRequired,
  birthday: PropTypes.object.isRequired,
  onBirthdayToggle: PropTypes.func.isRequired,
  onBirthdayChange: PropTypes.func.isRequired,
  isAuthenticated: PropTypes.bool.isRequired,
  payment: PropTypes.object.isRequired,
  paymentErrors: PropTypes.object.isRequired,
  onPaymentChange: PropTypes.func.isRequired,
  cardError: PropTypes.string.isRequired,
  onCardChange: PropTypes.func.isRequired,
  savedCards: PropTypes.array.isRequired,
  savedCardsLoading: PropTypes.bool.isRequired,
  selectedPaymentMethod: PropTypes.string.isRequired,
  onSelectPaymentMethod: PropTypes.func.isRequired,
  advanceStep: PropTypes.func.isRequired,
  goBack: PropTypes.func.isRequired,
  cart: PropTypes.array.isRequired,
  cartCount: PropTypes.number.isRequired,
  subtotal: PropTypes.number.isRequired,
  deliveryFee: PropTypes.number.isRequired,
  tax: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  discountAmount: PropTypes.number.isRequired,
  discountLabel: PropTypes.string.isRequired,
  couponFreeShipping: PropTypes.bool.isRequired,
  formatCurrency: PropTypes.func.isRequired,
  formatDate: PropTypes.func.isRequired,
  coupon: PropTypes.object,
  couponInput: PropTypes.string.isRequired,
  onCouponInputChange: PropTypes.func.isRequired,
  couponMessage: PropTypes.string,
  couponError: PropTypes.string,
  onApplyCoupon: PropTypes.func.isRequired,
  onRemoveCoupon: PropTypes.func.isRequired,
  applyingCoupon: PropTypes.bool.isRequired,
  onPlaceOrder: PropTypes.func.isRequired,
  isSubmitting: PropTypes.bool.isRequired,
  submitError: PropTypes.string,
};

export default MobileCheckout;
