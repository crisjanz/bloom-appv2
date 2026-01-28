import { formatCurrency } from '@shared/utils/currency';

type DiscountEntry = { type: string; amount: number; description: string };
type CouponDiscount = { amount: number; name?: string };
type AutoDiscount = { id: string; name: string; discountAmount: number };
type TaxEntry = { name: string; rate: number; amount: number };

type Props = {
  hasItems: boolean;
  subtotal: number;
  appliedDiscounts: DiscountEntry[];
  giftCardDiscount: number;
  couponDiscount: CouponDiscount;
  autoDiscounts: AutoDiscount[];
  taxBreakdown: TaxEntry[];
  total: number;
  onTakePayment: () => void;
  onRemoveDiscount?: (index: number) => void;
  onRemoveGiftCard?: () => void;
  onRemoveCoupon?: () => void;
  onSaveDraft?: () => void;
  onLoadDrafts?: () => void;
};

export default function POSCartSummary({
  hasItems,
  subtotal,
  appliedDiscounts,
  giftCardDiscount,
  couponDiscount,
  autoDiscounts,
  taxBreakdown,
  total,
  onTakePayment,
  onRemoveDiscount,
  onRemoveGiftCard,
  onRemoveCoupon,
  onSaveDraft,
  onLoadDrafts,
}: Props) {
  return (
    <div className="border-t border-gray-100 dark:border-gray-800">
      {hasItems && (
        <>
          <div className="p-6 border-b border-gray-100 dark:border-gray-800">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                <span className="font-medium text-black dark:text-white">{formatCurrency(subtotal)}</span>
              </div>

              {appliedDiscounts?.map((discount, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <span className="text-green-600 dark:text-green-400 flex-1">{discount.description}:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-green-600 dark:text-green-400">
                      -{formatCurrency(discount.amount)}
                    </span>
                    {onRemoveDiscount && (
                      <button
                        onClick={() => onRemoveDiscount(index)}
                        className="w-4 h-4 rounded-full bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800 flex items-center justify-center text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                        title="Remove discount"
                      >
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {giftCardDiscount > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-green-600 dark:text-green-400 flex-1">Gift Card:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-green-600 dark:text-green-400">
                      -{formatCurrency(giftCardDiscount)}
                    </span>
                    {onRemoveGiftCard && (
                      <button
                        onClick={onRemoveGiftCard}
                        className="w-4 h-4 rounded-full bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800 flex items-center justify-center text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                        title="Remove gift card"
                      >
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {couponDiscount?.amount > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-green-600 dark:text-green-400 flex-1">
                    Coupon{couponDiscount.name ? ` (${couponDiscount.name})` : ''}:
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-green-600 dark:text-green-400">
                      -{formatCurrency(couponDiscount.amount)}
                    </span>
                    {onRemoveCoupon && (
                      <button
                        onClick={onRemoveCoupon}
                        className="w-4 h-4 rounded-full bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800 flex items-center justify-center text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                        title="Remove coupon"
                      >
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {autoDiscounts?.map((discount) =>
                discount.discountAmount > 0 ? (
                  <div key={discount.id} className="flex justify-between items-center text-sm">
                    <span className="text-blue-600 dark:text-blue-400 flex-1">Auto: {discount.name}</span>
                    <span className="font-medium text-blue-600 dark:text-blue-400">
                      -{formatCurrency(discount.discountAmount || 0)}
                    </span>
                  </div>
                ) : null
              )}

              {taxBreakdown.map((tax, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    {tax.name} ({tax.rate.toFixed(1)}%):
                  </span>
                  <span className="font-medium text-black dark:text-white">{formatCurrency(tax.amount)}</span>
                </div>
              ))}

              <div className="flex justify-between">
                <span className="text-lg font-bold text-black dark:text-white">Total:</span>
                <span className="text-xl font-bold text-brand-500">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-3">
            <button
              onClick={onTakePayment}
              className="w-full py-4 bg-brand-500 hover:bg-brand-600 text-white rounded-2xl font-bold text-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Take Payment - {formatCurrency(total)}
            </button>
          </div>
        </>
      )}

      <div
        className={`flex justify-center gap-4 px-6 pb-6 pt-3 ${
          hasItems ? 'border-t border-gray-100 dark:border-gray-800' : ''
        }`}
      >
        <button
          onClick={onSaveDraft}
          disabled={!hasItems}
          className="text-xs text-gray-500 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-500 transition-colors underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:text-gray-400 dark:disabled:text-gray-500"
        >
          Save as Draft
        </button>
        <button
          onClick={onLoadDrafts}
          className="text-xs text-gray-500 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-500 transition-colors underline-offset-2 hover:underline"
        >
          Load Drafts
        </button>
      </div>
    </div>
  );
}
