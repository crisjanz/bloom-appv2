import { logger } from '../main';

export interface OrderTicketData {
  orderNumber: string;
  orderDate: string;
  deliveryDate: string;
  deliveryTime: string;
  driverRouteUrl?: string;
  driverRouteQrCodeDataUrl?: string;

  // Customer (who ordered)
  customerName: string;
  customerPhone: string;

  // Recipient (who receives)
  recipientName: string;
  recipientPhone: string;
  recipientAddress: {
    address1: string;
    city: string;
    province: string;
    postalCode: string;
  };

  // Order details
  items: Array<{
    quantity: number;
    name: string;
    description?: string;
    unitPrice: number; // in cents
    total: number; // in cents
  }>;

  cardMessage: string;
  specialInstructions: string;

  // Pricing
  subtotal: number; // in cents
  deliveryFee: number; // in cents
  taxes: Array<{
    name: string;
    amount: number; // in cents
  }>;
  discount: number; // in cents
  total: number; // in cents
}

/**
 * Generate order ticket HTML with landscape layout (11" × 8.5")
 */
export function generateOrderTicketHTML(data: OrderTicketData): string {
  const formatCurrency = (cents: number) => `CA$${(cents / 100).toFixed(2)}`;

  // Format delivery date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[date.getDay()]}. ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Order Ticket - ${data.orderNumber}</title>
  <style>
    @page {
      size: 11in 8.5in landscape;
      margin: 0;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11pt;
      line-height: 1.4;
      margin: 0;
      padding: 0;
    }

    .page {
      width: 11in;
      height: 8.5in;
      display: flex;
      position: relative;
      border: 2px solid #ccc;
    }

    /* LEFT SIDE: 7" wide */
    .left-side {
      width: 7in;
      height: 8.5in;
      display: flex;
      flex-direction: column;
      border-right: 2px dashed #666;
    }

    /* Shop Records: 7" × 5 5/8" */
    .shop-records {
      width: 7in;
      height: 5.625in;
      padding: 0.4in;
      border-bottom: 2px dashed #666;
      position: relative;
    }

    /* Driver Slip: 7" × 2 5/8" */
    .driver-slip {
      width: 7in;
      height: 2.625in;
      padding: 0.4in;
      position: relative;
    }

    .signature-line {
      border-top: 2px solid #000;
      margin-top: 30px;
      padding-top: 5px;
    }

    .driver-slip-qr {
      position: absolute;
      top: 0.35in;
      right: 0.35in;
      width: 1.2in;
      text-align: center;
    }

    .driver-slip .header-line {
      margin-right: 1.35in;
    }

    .driver-slip-top-row {
      margin-right: 1.35in;
    }

    .qr-label {
      font-size: 7pt;
      font-weight: bold;
      margin-bottom: 4px;
    }

    .qr-image {
      width: 1.15in;
      height: 1.15in;
      object-fit: contain;
    }

    /* RIGHT SIDE: 4" wide × 8.5" tall, divided into 3 equal sections */
    .right-side {
      width: 4in;
      height: 8.5in;
      display: flex;
      flex-direction: column;
    }

    /* Each section: 4" × 2.833" */
    .right-section {
      width: 4in;
      height: 2.833in;
      padding: 0.3in;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      border-bottom: 1px dashed #999;
    }

    .right-section:last-child {
      border-bottom: none;
    }

    /* Fold line indicators */
    .right-section::after {
      content: '— fold line —';
      position: absolute;
      right: 0.1in;
      font-size: 7pt;
      color: #999;
      width: 3.8in;
      text-align: right;
      margin-top: 2.7in;
    }

    .right-section:last-child::after {
      content: '';
    }

    /* Cut line indicator */
    .page::before {
      content: '✂';
      position: absolute;
      left: 7in;
      top: 50%;
      transform: translate(-50%, -50%);
      font-size: 20pt;
      color: #666;
      background: white;
      padding: 5px;
      z-index: 10;
    }

    /* Section styling */
    .header-line {
      display: flex;
      justify-content: space-between;
      font-weight: bold;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 2px solid #000;
      font-size: 10pt;
    }

    .field-group {
      margin-bottom: 10px;
      font-size: 10pt;
    }

    .field-label {
      font-weight: bold;
      margin-bottom: 2px;
    }

    .field-value {
      margin-left: 0;
    }

    .two-column {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 10px;
    }

    .order-line {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2px;
      font-size: 9pt;
    }

    .order-line.total {
      font-weight: bold;
      font-size: 10pt;
      margin-top: 4px;
      padding-top: 4px;
      border-top: 2px solid #000;
    }

    /* Product details area */
    .product-details {
      flex: 1;
      font-size: 9pt;
      border-left: 2px solid #000;
      padding-left: 12px;
    }

    .product-details-title {
      font-weight: bold;
      font-size: 9pt;
      margin-bottom: 8px;
    }

    .product-item {
      margin-bottom: 6px;
    }

    .product-name {
      font-weight: bold;
      margin-bottom: 2px;
      font-size: 9pt;
    }

    /* First item: 4 lines max */
    .product-item:first-of-type .product-description {
      font-size: 8pt;
      color: #333;
      line-height: 1.3;
      margin-bottom: 2px;
      display: -webkit-box;
      -webkit-line-clamp: 4;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    /* Other items: 2 lines max */
    .product-item:not(:first-of-type) .product-description {
      font-size: 8pt;
      color: #333;
      line-height: 1.3;
      margin-bottom: 2px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    /* Items that should hide description when too many items */
    .product-item.hide-description .product-description {
      display: none;
    }

    /* Divider line between products and financials */
    .financial-divider {
      border-top: 2px solid #000;
      margin-top: 12px;
      padding-top: 12px;
    }

    /* Remove borders from driver slip field groups */
    .driver-slip .field-group {
      border-bottom: none;
      padding-bottom: 0;
    }

    /* Card message section */
    .card-message {
      font-size: 14pt;
      font-weight: bold;
      line-height: 1.5;
      overflow: hidden;
    }

    /* Business info section */
    .business-info {
      font-size: 12pt;
    }

    .business-info .name {
      font-size: 20pt;
      font-weight: bold;
      color: #597485;
      margin-bottom: 8px;
    }

    .business-info .details {
      font-size: 10pt;
      color: #666;
      line-height: 1.5;
    }

    /* Address label section */
    .address-label {
      font-size: 13pt;
      line-height: 1.5;
    }

    .address-label .name {
      font-weight: bold;
      font-size: 14pt;
      margin-bottom: 8px;
    }

    .address-label .date-order {
      margin-top: 12px;
      font-size: 10pt;
      font-weight: bold;
    }

    @media print {
      .page {
        border: none;
      }
      .page::before,
      .left-side,
      .shop-records,
      .driver-slip {
        border-color: transparent !important;
      }
      .right-section::after {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- LEFT SIDE (7" wide) -->
    <div class="left-side">
      <!-- TOP: Shop Records (7" × 5 5/8") -->
      <div class="shop-records">
        <div class="header-line">
          <span>Delivery Date: <strong>${formatDate(data.deliveryDate)}</strong></span>
          <span># ${data.orderNumber}</span>
        </div>

        <div class="two-column">
          <div class="field-group">
            <div class="field-label">Recipient:</div>
            <div class="field-value">
              <strong>${data.recipientName}</strong><br>
              ${data.recipientPhone}<br>
              ${data.recipientAddress.address1}<br>
              ${data.recipientAddress.city}, ${data.recipientAddress.province} ${data.recipientAddress.postalCode}
            </div>
          </div>

          <div class="field-group">
            <div class="field-label">Sender:</div>
            <div class="field-value">
              <strong>${data.customerName}</strong><br>
              ${data.customerPhone}<br>
              Placed on: ${data.orderDate}
            </div>
          </div>
        </div>

        <!-- Two column layout: Financial Summary | Product Details -->
        <div class="two-column financial-divider" style="align-items: stretch;">
          <!-- LEFT: Financial Summary Only -->
          <div>
            <div class="order-line">
              <span>Subtotal:</span>
              <span>${formatCurrency(data.subtotal)}</span>
            </div>
            <div class="order-line">
              <span>Delivery:</span>
              <span>${formatCurrency(data.deliveryFee)}</span>
            </div>
            ${data.discount > 0 ? `
            <div class="order-line">
              <span>Discount:</span>
              <span>-${formatCurrency(data.discount)}</span>
            </div>
            ` : ''}
            ${data.taxes.map(tax => `
            <div class="order-line">
              <span>${tax.name}:</span>
              <span>${formatCurrency(tax.amount)}</span>
            </div>
            `).join('')}
            <div class="order-line total">
              <span>Total:</span>
              <span>${formatCurrency(data.total)}</span>
            </div>
          </div>

          <!-- RIGHT: Product Details with Descriptions -->
          <div class="product-details">
            <div class="product-details-title">Products:</div>
            ${data.items.map((item, index) => `
            <div class="product-item">
              <div class="product-name">${item.quantity}x ${item.name} - ${formatCurrency(item.total)}</div>
              ${item.description ? `<div class="product-description">${item.description}</div>` : ''}
            </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- BOTTOM: Driver Slip (7" × 2 5/8") -->
      <div class="driver-slip">
        ${data.driverRouteQrCodeDataUrl
          ? `
        <div class="driver-slip-qr">
          <div class="qr-label">Scan for Route</div>
          <img class="qr-image" src="${data.driverRouteQrCodeDataUrl}" alt="Driver route QR code" />
        </div>
        `
          : ''}

        <div class="header-line">
          <span>Delivery Date: <strong>${formatDate(data.deliveryDate)}</strong></span>
          <span>Order # ${data.orderNumber}</span>
        </div>

        <div class="two-column driver-slip-top-row">
          <div class="field-group">
            <div class="field-label">Recipient:</div>
            <div class="field-value">
              <strong>${data.recipientName}</strong><br>
              ${data.recipientAddress.address1}<br>
              ${data.recipientAddress.city}, ${data.recipientAddress.province} ${data.recipientAddress.postalCode}<br>
              ${data.recipientPhone}
            </div>
          </div>

          <div class="field-group">
            <div class="field-label">Products:</div>
            <div class="field-value">
              ${data.items.map(item => `${item.name}`).join('<br>')}
            </div>
          </div>
        </div>

        <div class="two-column" style="margin-top: 10px;">
          <div class="field-group">
            <div class="field-label">Delivery Instructions:</div>
            <div class="field-value">
              ${data.specialInstructions || 'None'}
            </div>
          </div>

          <div class="field-group">
            <div class="field-label">Signature:</div>
            <div class="signature-line"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- RIGHT SIDE (4" wide × 8.5" tall, 3 equal sections) -->
    <div class="right-side">
      <!-- Section 1: Card Message (4" × 2.833") -->
      <div class="right-section card-message">
        <div>
          ${data.cardMessage.toUpperCase().split('\n').join('<br>')}
        </div>
      </div>

      <!-- Section 2: Business Info (4" × 2.833") -->
      <div class="right-section business-info">
        <div class="name">🌸 BLOOM</div>
        <div class="details">
          123 Main Street<br>
          Vancouver, BC V6B 1A1<br>
          (604) 555-BLOOM<br>
          www.hellobloom.ca
        </div>
      </div>

      <!-- Section 3: Address Label (4" × 2.833") -->
      <div class="right-section address-label">
        <div>
          <div class="name">${data.recipientName}</div>
          <div>${data.recipientAddress.address1}</div>
          <div>${data.recipientAddress.city}, ${data.recipientAddress.province} ${data.recipientAddress.postalCode}</div>
          <div>${data.recipientPhone}</div>
          <div class="date-order">
            ${formatDate(data.deliveryDate)}<br>
            # ${data.orderNumber}
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    // Smart overflow handling: Remove descriptions from last items backward if content doesn't fit
    function handleProductOverflow() {
      const productDetails = document.querySelector('.product-details');
      const productItems = Array.from(document.querySelectorAll('.product-item'));

      if (!productDetails || productItems.length <= 1) return;

      const container = document.querySelector('.shop-records');
      const containerHeight = container.offsetHeight;

      function isOverflowing() {
        return container.scrollHeight > containerHeight;
      }

      let currentIndex = productItems.length - 1;

      while (isOverflowing() && currentIndex > 0) {
        productItems[currentIndex].classList.add('hide-description');
        currentIndex--;
      }
    }

    window.addEventListener('load', handleProductOverflow);
  </script>
</body>
</html>
  `;
}

/**
 * Parse order data from backend into ticket format
 */
export function parseOrderForTicket(orderData: any): OrderTicketData {
  try {
    const order = orderData;

    return {
      orderNumber: order.orderNumber?.toString() || 'N/A',
      orderDate: new Date(order.createdAt).toLocaleDateString(),
      deliveryDate: order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString() : 'TBD',
      deliveryTime: order.deliveryTime || 'TBD',
      driverRouteUrl: order.driverRouteUrl || '',

      customerName: `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim() || 'Unknown',
      customerPhone: order.customer?.phone || '',

      recipientName: `${order.recipientCustomer?.firstName || ''} ${order.recipientCustomer?.lastName || ''}`.trim() || 'Unknown',
      recipientPhone: order.deliveryAddress?.phone || order.recipientCustomer?.phone || '',
      recipientAddress: {
        address1: order.deliveryAddress?.address1 || '',
        city: order.deliveryAddress?.city || '',
        province: order.deliveryAddress?.province || '',
        postalCode: order.deliveryAddress?.postalCode || ''
      },

      items: (order.orderItems || []).map((item: any) => ({
        quantity: item.quantity || 1,
        name: item.customName || 'Unknown Item',
        description: item.description || '',
        unitPrice: item.unitPrice || 0,
        total: item.rowTotal || 0
      })),

      cardMessage: order.cardMessage || '',
      specialInstructions: order.specialInstructions || '',

      subtotal: (order.orderItems || []).reduce((sum: number, item: any) => sum + (item.rowTotal || 0), 0),
      deliveryFee: order.deliveryFee || 0,
      taxes: Array.isArray(order.taxBreakdown) ? order.taxBreakdown.map((tax: any) => ({
        name: tax.name || 'Tax',
        amount: tax.amount || 0
      })) : [],
      discount: order.discount || 0,
      total: order.paymentAmount || 0
    };
  } catch (error) {
    logger.error('Failed to parse order for ticket:', error);
    throw new Error('Invalid order data format');
  }
}
