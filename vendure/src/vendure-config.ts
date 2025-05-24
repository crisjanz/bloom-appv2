import { join } from 'path';
import dotenv from 'dotenv';
dotenv.config();

import {
  VendureConfig,
  dummyPaymentHandler,
  DefaultJobQueuePlugin,
  DefaultSearchPlugin,
} from '@vendure/core';

import { EmailPlugin } from '@vendure/email-plugin';
import { AssetServerPlugin } from '@vendure/asset-server-plugin';
import { StripePlugin } from '@vendure/payments-plugin/package/stripe';
import { AdminUiPlugin } from '@vendure/admin-ui-plugin';
import { DataSource } from 'typeorm';

import { CustomOrderItemPriceCalculationStrategy } from './custom-order-item-price-calculation-strategy';

export const config: VendureConfig = {
  apiOptions: {
    port: Number(process.env.PORT) || 3000,
    adminApiPath: 'admin-api',
    shopApiPath: 'shop-api',
    hostname: 'localhost',
  },

  orderOptions: {
    orderItemPriceCalculationStrategy: new CustomOrderItemPriceCalculationStrategy(),
  },

  authOptions: {
    superadminCredentials: {
      identifier: process.env.SUPERADMIN_USERNAME || 'superadmin',
      password: process.env.SUPERADMIN_PASSWORD || 'superadmin',
    },
    tokenMethod: 'cookie',
    cookieOptions: {
      secret: process.env.COOKIE_SECRET || 'cookie-secret',
    },
  },

  dbConnectionOptions: {
    type: 'postgres',
    synchronize: false,
    logging: false,
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    schema: process.env.DB_SCHEMA || 'public',
    migrations: [join(__dirname, './migrations/*.{ts,js}')],
  },

  paymentOptions: {
    paymentMethodHandlers: [dummyPaymentHandler],
  },

  // ✅ Custom fields now added to ProductVariant instead of ProductOptionValue
  customFields: {
    ProductVariant: [
      { name: 'size', type: 'string' },
      { name: 'color', type: 'string' },
      { name: 'priceAdjustment', type: 'int', defaultValue: 0 },
    ],
  },

  plugins: [
    DefaultJobQueuePlugin,
    DefaultSearchPlugin,

    AssetServerPlugin.init({
      route: 'assets',
      assetUploadDir: join(__dirname, '../static/assets'),
    }),

    AdminUiPlugin.init({
      route: 'admin',
      port: 3002,
    }),

    ...(process.env.APP_ENV === 'dev'
      ? [
          EmailPlugin.init({
            devMode: true,
            outputPath: join(__dirname, '../static/email/test-emails'),
            templatePath: join(__dirname, '../static/email/templates'),
            route: 'mailbox',
            handlers: [],
          }),
        ]
      : []),

    StripePlugin.init({
      storeCustomersInStripe: true,
    }),
  ],
};

// Used by TypeORM CLI
export const connectionOptions = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  schema: process.env.DB_SCHEMA || 'public',
  migrations: [join(__dirname, './migrations/*.{ts,js}')],
  synchronize: false,
  logging: false,
});
