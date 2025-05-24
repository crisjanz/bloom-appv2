import { VendurePlugin, PluginCommonModule } from '@vendure/core';

@VendurePlugin({
  imports: [PluginCommonModule],
})
export class ProductOptionValueCustomFieldsPlugin {}
