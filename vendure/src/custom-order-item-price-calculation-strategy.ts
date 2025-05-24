import {
    OrderItemPriceCalculationStrategy,
    RequestContext,
    ProductVariant,
    Order,
    PriceCalculationResult,
    Injector,
    TransactionalConnection,
  } from '@vendure/core';
  
  export class CustomOrderItemPriceCalculationStrategy
    implements OrderItemPriceCalculationStrategy
  {
    readonly name = 'custom-price';
  
    private connection!: TransactionalConnection;
  
    init(injector: Injector) {
      this.connection = injector.get(TransactionalConnection);
    }
  
    async calculateUnitPrice(
      ctx: RequestContext,
      productVariant: ProductVariant,
      orderLineCustomFields: { [key: string]: any },
      order: Order,
      quantity: number
    ): Promise<PriceCalculationResult> {
      const basePrice = productVariant.listPrice;
      let totalAdjustment = 0;
  
      const selectedOptionIds: string[] = orderLineCustomFields?.selectedOptionIds || [];
  
      for (const id of selectedOptionIds) {
        const optionValue = await this.connection.getRepository(ctx, 'product_option_value').findOne({
          where: { id },
        });
  
        if (optionValue?.customFields?.priceAdjustment) {
          totalAdjustment += optionValue.customFields.priceAdjustment;
        }
      }
  
      return {
        price: basePrice + totalAdjustment,
        priceIncludesTax: false,
      };
    }
  }
  