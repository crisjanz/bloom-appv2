/**
 * React Hook for Order Payments
 * Handles POS transfer and payment completion flows
 */

import { useState, useCallback } from 'react'
import { centsToDollars, coerceCents } from '@shared/utils/currency';

export const useOrderPayments = () => {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePOSTransfer = useCallback(async (customerState: any, orderState: any, totals: any, employee: string, cleanPhoneNumber: (value: string) => string) => {
    setProcessing(true);
    setError(null);

    try {
      console.log('📤 POS transfer initiated');

      // Ensure we have a customer ID - create one if needed
      let currentCustomerId = customerState.customer?.id || customerState.customerId;

      if (!currentCustomerId && customerState.customer) {
        console.log('👤 Creating new customer...');
        try {
          const customerResponse = await fetch('/api/customers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              firstName: customerState.customer.firstName || '',
              lastName: customerState.customer.lastName || '',
              email: customerState.customer.email || '',
              phone: customerState.customer.phone || ''
            })
          });

          if (customerResponse.ok) {
            const newCustomer = await customerResponse.json();
            currentCustomerId = newCustomer.id;
            console.log('✅ Customer created:', currentCustomerId);

            // Update the customer state with the new ID
            customerState.setCustomerId?.(currentCustomerId);
          } else {
            throw new Error('Failed to create customer');
          }
        } catch (error) {
          console.error('❌ Customer creation failed:', error);
          throw new Error('Failed to create customer');
        }
      }

      if (!currentCustomerId) {
        throw new Error('Customer information is required');
      }

      // NEW: Create/update recipients for delivery orders
      const ordersWithRecipientIds = await Promise.all(
        orderState.orders.map(async (order: any) => {
            if (order.orderType === 'DELIVERY') {
            if (order.recipientCustomerId) {
              if (order.selectedAddressId) {
                console.log('✓ POS Transfer using existing customer-based recipient:', order.recipientCustomerId);
                return {
                  ...order,
                  recipientCustomerId: order.recipientCustomerId,
                  deliveryAddressId: order.selectedAddressId,
                  recipientId: undefined // Don't use old format
                };
              }

              console.log('✓ POS Transfer adding new address to existing recipient');

              const createAddressResponse = await fetch(`/api/customers/${order.recipientCustomerId}/addresses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  label: order.recipientAddressLabel?.trim() || 'Home',
                  firstName: order.recipientFirstName.trim(),
                  lastName: order.recipientLastName.trim(),
                  phone: cleanPhoneNumber(order.recipientPhone),
                  address1: order.recipientAddress.address1.trim(),
                  address2: order.recipientAddress.address2?.trim() || '',
                  city: order.recipientAddress.city.trim(),
                  province: order.recipientAddress.province,
                  postalCode: order.recipientAddress.postalCode.trim(),
                  country: order.recipientAddress.country || 'CA',
                  company: order.recipientCompany?.trim() || '',
                  addressType: order.recipientAddressType || 'RESIDENCE',
                }),
              });

              if (!createAddressResponse.ok) {
                throw new Error('Failed to create recipient address');
              }

              const newAddress = await createAddressResponse.json();

              return {
                ...order,
                recipientCustomerId: order.recipientCustomerId,
                deliveryAddressId: newAddress.id,
                recipientId: undefined
              };
            }

            // NEW FLOW: Always create Customer for new recipients
            console.log('✓ POS Transfer creating new customer-based recipient');

            // Create new customer as recipient
            const createCustomerResponse = await fetch('/api/customers', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                firstName: order.recipientFirstName.trim(),
                lastName: order.recipientLastName.trim(),
                phone: cleanPhoneNumber(order.recipientPhone),
                email: '', // Recipients don't need email initially
              }),
            });

            if (!createCustomerResponse.ok) {
              throw new Error('Failed to create recipient customer');
            }

            const newCustomer = await createCustomerResponse.json();

            // Create address for this customer
            const createAddressResponse = await fetch(`/api/customers/${newCustomer.id}/addresses`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                label: order.recipientAddressLabel?.trim() || 'Home',
                firstName: order.recipientFirstName.trim(),
                lastName: order.recipientLastName.trim(),
                phone: cleanPhoneNumber(order.recipientPhone),
                address1: order.recipientAddress.address1.trim(),
                address2: order.recipientAddress.address2?.trim() || '',
                city: order.recipientAddress.city.trim(),
                province: order.recipientAddress.province,
                postalCode: order.recipientAddress.postalCode.trim(),
                country: order.recipientAddress.country || 'CA',
                company: order.recipientCompany?.trim() || '',
                addressType: order.recipientAddressType || 'RESIDENCE',
              }),
            });

            if (!createAddressResponse.ok) {
              throw new Error('Failed to create recipient address');
            }

            const newAddress = await createAddressResponse.json();

            // Link as recipient
            await fetch(`/api/customers/${currentCustomerId}/save-recipient`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                recipientCustomerId: newCustomer.id
              }),
            });

            return {
              ...order,
              recipientCustomerId: newCustomer.id,
              deliveryAddressId: newAddress.id,
              recipientId: undefined // Don't use old format
            };
          }
          return order;
        })
      );

      // Convert deliveryFee from cents to dollars for backend API
      const ordersInDollars = ordersWithRecipientIds.map((order: any) => ({
        ...order,
        deliveryFee: centsToDollars(order.deliveryFee),
        customProducts: Array.isArray(order.customProducts)
          ? order.customProducts.map((product: any) => ({
              ...product,
              price: centsToDollars(coerceCents(product.price || '0')).toFixed(2),
            }))
          : order.customProducts,
      }));

      // Create DRAFT orders for POS transfer
      const draftOrderData = {
        customerId: currentCustomerId,
        orders: ordersInDollars,
      };

      console.log('📦 Creating draft orders for POS transfer...');
      const response = await fetch('/api/orders/save-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draftOrderData)
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to create draft orders');
      }

      console.log('✅ Draft orders created successfully');

      // Return transfer data for POS
      return {
        type: 'pos_transfer',
        customer: customerState.customer,
        orders: result.drafts,
        draftIds: result.drafts.map((d: any) => d.id),
        totals,
        employee,
        orderSource: 'takeorder_to_pos'
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'POS transfer failed';
      console.error('❌ POS transfer failed:', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setProcessing(false);
    }
  }, []);

  const completeOrderPayment = useCallback(async (
    customerState: any,
    orderState: any,
    payments: any[],
    totals: any,
    employee: string,
    orderSource: string,
    cleanPhoneNumber: (value: string) => string
  ) => {
    setProcessing(true);
    setError(null);

    try {
      console.log('💰 Order payment completion initiated');

      // Ensure we have a customer ID - create one if needed
      let currentCustomerId = customerState.customer?.id || customerState.customerId;

      console.log('🔍 Customer ID check:', {
        customerObjectId: customerState.customer?.id,
        customerStateId: customerState.customerId,
        finalId: currentCustomerId,
        hasCustomerObject: !!customerState.customer
      });

      if (!currentCustomerId && customerState.customer) {
        console.log('👤 Creating new customer for payment...');
        try {
          const customerResponse = await fetch('/api/customers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              firstName: customerState.customer.firstName || '',
              lastName: customerState.customer.lastName || '',
              email: customerState.customer.email || '',
              phone: customerState.customer.phone || ''
            })
          });

          if (customerResponse.ok) {
            const newCustomer = await customerResponse.json();
            currentCustomerId = newCustomer.id;
            console.log('✅ Customer created for payment:', currentCustomerId);

            // Update the customer state with the new ID
            customerState.setCustomerId?.(currentCustomerId);
          } else {
            throw new Error('Failed to create customer');
          }
        } catch (error) {
          console.error('❌ Customer creation failed:', error);
          setError('Failed to create customer. Please try again.');
          return {
            success: false,
            error: 'Failed to create customer'
          };
        }
      }

      if (!currentCustomerId) {
        setError('Customer information is required');
        return {
          success: false,
          error: 'Customer information is required'
        };
      }

      // NEW: Create/update recipients for delivery orders
      const ordersWithRecipientIds = await Promise.all(
        orderState.orders.map(async (order: any) => {
          if (order.orderType === 'DELIVERY') {
            try {
              if (order.recipientCustomerId) {
                if (order.selectedAddressId) {
                  console.log('✓ Using existing customer-based recipient:', order.recipientCustomerId);
                  return {
                    ...order,
                    recipientCustomerId: order.recipientCustomerId,
                    deliveryAddressId: order.selectedAddressId,
                    recipientId: undefined // Don't use old format
                  };
                }

                console.log('✓ Adding new address to existing recipient');

                const createAddressResponse = await fetch(`/api/customers/${order.recipientCustomerId}/addresses`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    label: order.recipientAddressLabel?.trim() || 'Home',
                    firstName: order.recipientFirstName.trim(),
                    lastName: order.recipientLastName.trim(),
                    phone: cleanPhoneNumber(order.recipientPhone),
                    address1: order.recipientAddress.address1.trim(),
                    address2: order.recipientAddress.address2?.trim() || '',
                    city: order.recipientAddress.city.trim(),
                    province: order.recipientAddress.province,
                    postalCode: order.recipientAddress.postalCode.trim(),
                    country: order.recipientAddress.country || 'CA',
                    company: order.recipientCompany?.trim() || '',
                    addressType: order.recipientAddressType || 'RESIDENCE',
                  }),
                });

                if (!createAddressResponse.ok) {
                  throw new Error('Failed to create recipient address');
                }

                const newAddress = await createAddressResponse.json();

                return {
                  ...order,
                  recipientCustomerId: order.recipientCustomerId,
                  deliveryAddressId: newAddress.id,
                  recipientId: undefined
                };
              }

              // NEW FLOW: Always create Customer for new recipients
              console.log('✓ Creating new customer-based recipient');

              // Create new customer as recipient
              const createCustomerResponse = await fetch('/api/customers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  firstName: order.recipientFirstName.trim(),
                  lastName: order.recipientLastName.trim(),
                  phone: cleanPhoneNumber(order.recipientPhone),
                  email: '', // Recipients don't need email initially
                }),
              });

              if (!createCustomerResponse.ok) {
                throw new Error('Failed to create recipient customer');
              }

              const newCustomer = await createCustomerResponse.json();

              // Create address for this customer
              const createAddressResponse = await fetch(`/api/customers/${newCustomer.id}/addresses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  label: order.recipientAddressLabel?.trim() || 'Home',
                  firstName: order.recipientFirstName.trim(),
                  lastName: order.recipientLastName.trim(),
                  phone: cleanPhoneNumber(order.recipientPhone),
                  address1: order.recipientAddress.address1.trim(),
                  address2: order.recipientAddress.address2?.trim() || '',
                  city: order.recipientAddress.city.trim(),
                  province: order.recipientAddress.province,
                  postalCode: order.recipientAddress.postalCode.trim(),
                  country: order.recipientAddress.country || 'CA',
                  company: order.recipientCompany?.trim() || '',
                  addressType: order.recipientAddressType || 'RESIDENCE',
                }),
              });

              if (!createAddressResponse.ok) {
                throw new Error('Failed to create recipient address');
              }

              const newAddress = await createAddressResponse.json();

              // Link as recipient
              await fetch(`/api/customers/${currentCustomerId}/save-recipient`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  recipientCustomerId: newCustomer.id
                }),
              });

              return {
                ...order,
                recipientCustomerId: newCustomer.id,
                deliveryAddressId: newAddress.id,
                recipientId: undefined // Don't use old format
              };
            } catch (error) {
              console.error('❌ Recipient creation failed:', error);
              throw error;
            }
          }
          return order;
        })
      );

      // Convert deliveryFee from cents to dollars for backend API
      const ordersInDollars = ordersWithRecipientIds.map((order: any) => ({
        ...order,
        deliveryFee: centsToDollars(order.deliveryFee),
        customProducts: Array.isArray(order.customProducts)
          ? order.customProducts.map((product: any) => ({
              ...product,
              price: centsToDollars(coerceCents(product.price || '0')).toFixed(2),
            }))
          : order.customProducts,
      }));

      // Create orders via API
      const orderData = {
        customerId: currentCustomerId,
        orders: ordersInDollars,
        paymentConfirmed: true,
        employee,
        orderSource: orderSource.toUpperCase(),
      };

      console.log('📦 Creating orders via API...', { orderCount: ordersWithRecipientIds.length });
      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create orders');
      }

      const result = await response.json();

      if (!result.success || !result.orders) {
        throw new Error(result.error || 'Failed to create orders');
      }

      console.log('✅ Orders created successfully:', result.orders.map((o: any) => o.id));

      return {
        success: true,
        orders: result.orders
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Order payment completion failed';
      console.error('❌ Order creation failed:', errorMessage);
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setProcessing(false);
    }
  }, []);

  return {
    processing,
    error,
    handlePOSTransfer,
    completeOrderPayment
  };
};
