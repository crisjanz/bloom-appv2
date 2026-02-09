import PropTypes from "prop-types";

const CartItem = ({ img, title, subtitle, price, quantity, unitPrice }) => (
  <div className="-mx-1 flex items-center justify-between py-4">
    <div className="flex items-center px-1">
      <div className="mr-4 h-12 w-full max-w-[48px] overflow-hidden rounded">
        {img ? (
          <img src={img} alt={title} className="h-full w-full object-cover" />
        ) : (
          <div className="bg-gray-200 flex h-full w-full items-center justify-center text-xs text-dark">
            No image
          </div>
        )}
      </div>
      <div>
        <p className="mb-0.5 text-base font-medium text-dark dark:text-white">
          {title}
        </p>
        <p className="truncate text-sm text-body-color dark:text-dark-6">
          {subtitle}
        </p>
        <p className="text-xs text-body-color dark:text-dark-6">
          Qty {quantity} • {unitPrice}
        </p>
      </div>
    </div>
    <div className="px-1">
      <p className="text-base font-medium text-dark dark:text-white">{price}</p>
    </div>
  </div>
);

CartItem.propTypes = {
  img: PropTypes.string,
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string.isRequired,
  price: PropTypes.string.isRequired,
  quantity: PropTypes.number.isRequired,
  unitPrice: PropTypes.string.isRequired,
};

export default CartItem;
