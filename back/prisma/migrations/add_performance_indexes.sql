-- Performance indexes for production
-- Run this manually in Render database console or create a migration

-- Orders - most frequently queried
CREATE INDEX IF NOT EXISTS idx_orders_status ON "Order"(status);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_date ON "Order"("deliveryDate");
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON "Order"("customerId");
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON "Order"("createdAt");
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON "Order"("orderNumber");

-- Customers - phone lookups
CREATE INDEX IF NOT EXISTS idx_customers_phone ON "Customer"(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON "Customer"(email);

-- Payment Transactions
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON "PaymentTransaction"("createdAt");
CREATE INDEX IF NOT EXISTS idx_payment_transactions_customer_id ON "PaymentTransaction"("customerId");

-- Order Items
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON "OrderItem"("orderId");
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON "OrderItem"("productId");

-- Products
CREATE INDEX IF NOT EXISTS idx_products_category_id ON "Product"("categoryId");
CREATE INDEX IF NOT EXISTS idx_products_is_active ON "Product"("isActive");
