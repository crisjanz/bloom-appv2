import React, { useState, useEffect } from 'react';
import { SaveIcon } from '@shared/assets/icons';
import InputField from '@shared/ui/forms/input/InputField';
import FormFooter from '@shared/ui/components/ui/form/FormFooter';

interface PaymentEditModalProps {
  payment: {
    deliveryFee: number;
    discount: number;
    gst: number;
    pst: number;
  };
  onChange: (payment: any) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}

const PaymentEditModal: React.FC<PaymentEditModalProps> = ({
  payment,
  onChange,
  onSave,
  onCancel,
  saving
}) => {
  const [deliveryFeeStr, setDeliveryFeeStr] = useState((payment.deliveryFee / 100).toString());
  const [discountStr, setDiscountStr] = useState((payment.discount / 100).toString());
  const [gstStr, setGstStr] = useState(payment.gst.toString());
  const [pstStr, setPstStr] = useState(payment.pst.toString());

  useEffect(() => {
    setDeliveryFeeStr((payment.deliveryFee / 100).toString());
    setDiscountStr((payment.discount / 100).toString());
    setGstStr(payment.gst.toString());
    setPstStr(payment.pst.toString());
  }, [payment.deliveryFee, payment.discount, payment.gst, payment.pst]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InputField
          label="Delivery Fee ($)"
          type="number"
          step="0.01"
          min="0"
          value={deliveryFeeStr}
          onChange={(e) => setDeliveryFeeStr(e.target.value)}
          onBlur={() => onChange({ ...payment, deliveryFee: Math.round((parseFloat(deliveryFeeStr || '0')) * 100) })}
        />
        <InputField
          label="Discount ($)"
          type="number"
          step="0.01"
          min="0"
          value={discountStr}
          onChange={(e) => setDiscountStr(e.target.value)}
          onBlur={() => onChange({ ...payment, discount: Math.round((parseFloat(discountStr || '0')) * 100) })}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InputField
          label="GST ($)"
          type="number"
          step="0.01"
          min="0"
          value={gstStr}
          onChange={(e) => setGstStr(e.target.value)}
          onBlur={() => onChange({ ...payment, gst: parseFloat(gstStr || '0') })}
        />
        <InputField
          label="PST ($)"
          type="number"
          step="0.01"
          min="0"
          value={pstStr}
          onChange={(e) => setPstStr(e.target.value)}
          onBlur={() => onChange({ ...payment, pst: parseFloat(pstStr || '0') })}
        />
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          <strong>Note:</strong> Changing these values will recalculate the order total.
        </p>
      </div>

      <FormFooter
        onCancel={onCancel}
        onSubmit={onSave}
        submitting={saving}
        submitIcon={<SaveIcon className="w-4 h-4" />}
      />
    </div>
  );
};

export default PaymentEditModal;