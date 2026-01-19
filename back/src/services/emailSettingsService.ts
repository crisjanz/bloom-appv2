import { PrismaClient } from '@prisma/client';
import { decryptSecret, encryptSecret, hasConfiguredEncryptionKey } from '../utils/crypto';

const prisma = new PrismaClient();

const MASKED_SECRET = '********';

export type EmailProvider = 'sendgrid' | 'smtp' | 'disabled';

export interface EmailSettingsUpdate {
  provider?: EmailProvider;
  enabled?: boolean;
  apiKey?: string | null;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpUser?: string | null;
  smtpPassword?: string | null;
  fromEmail?: string | null;
  fromName?: string | null;
  smsEnabled?: boolean;
  twilioAccountSid?: string | null;
  twilioAuthToken?: string | null;
  twilioPhoneNumber?: string | null;
}

export interface EmailSettingsPublic {
  id: string;
  provider: EmailProvider;
  enabled: boolean;
  apiKey: string | null;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  smtpPassword: string | null;
  fromEmail: string;
  fromName: string;
  smsEnabled: boolean;
  twilioAccountSid: string | null;
  twilioAuthToken: string | null;
  twilioPhoneNumber: string | null;
  encryptionConfigured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailSettingsWithSecrets {
  provider: EmailProvider;
  enabled: boolean;
  apiKey: string | null;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  smtpPassword: string | null;
  fromEmail: string;
  fromName: string;
  smsEnabled: boolean;
  twilioAccountSid: string | null;
  twilioAuthToken: string | null;
  twilioPhoneNumber: string | null;
}

const normalizeOptionalString = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const normalizeRequiredString = (value: string | null | undefined, fallback: string) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
};

const isMaskedSecret = (value?: string | null) => {
  return value === MASKED_SECRET;
};

const maskSecret = (value?: string | null) => {
  return value ? MASKED_SECRET : null;
};

export class EmailSettingsService {
  private async getOrCreateSettings() {
    const existing = await prisma.emailSettings.findFirst();
    if (existing) {
      return existing;
    }

    return prisma.emailSettings.create({
      data: {},
    });
  }

  async getSettingsForUi(): Promise<EmailSettingsPublic> {
    const settings = await this.getOrCreateSettings();

    return {
      id: settings.id,
      provider: settings.provider as EmailProvider,
      enabled: settings.enabled,
      apiKey: maskSecret(settings.apiKey),
      smtpHost: settings.smtpHost,
      smtpPort: settings.smtpPort,
      smtpUser: settings.smtpUser,
      smtpPassword: maskSecret(settings.smtpPassword),
      fromEmail: settings.fromEmail,
      fromName: settings.fromName,
      smsEnabled: settings.smsEnabled,
      twilioAccountSid: settings.twilioAccountSid,
      twilioAuthToken: maskSecret(settings.twilioAuthToken),
      twilioPhoneNumber: settings.twilioPhoneNumber,
      encryptionConfigured: hasConfiguredEncryptionKey(),
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    };
  }

  async getSettingsWithSecrets(): Promise<EmailSettingsWithSecrets> {
    const settings = await this.getOrCreateSettings();

    let apiKey: string | null = null;
    let smtpPassword: string | null = null;
    let twilioAuthToken: string | null = null;

    if (settings.apiKey) {
      apiKey = decryptSecret(settings.apiKey);
    }
    if (settings.smtpPassword) {
      smtpPassword = decryptSecret(settings.smtpPassword);
    }
    if (settings.twilioAuthToken) {
      twilioAuthToken = decryptSecret(settings.twilioAuthToken);
    }

    return {
      provider: settings.provider as EmailProvider,
      enabled: settings.enabled,
      apiKey,
      smtpHost: settings.smtpHost,
      smtpPort: settings.smtpPort,
      smtpUser: settings.smtpUser,
      smtpPassword,
      fromEmail: settings.fromEmail,
      fromName: settings.fromName,
      smsEnabled: settings.smsEnabled,
      twilioAccountSid: settings.twilioAccountSid,
      twilioAuthToken,
      twilioPhoneNumber: settings.twilioPhoneNumber,
    };
  }

  async updateSettings(payload: EmailSettingsUpdate): Promise<EmailSettingsPublic> {
    const settings = await this.getOrCreateSettings();
    const data: any = {};

    if (payload.provider !== undefined) {
      data.provider = payload.provider;
    }

    if (payload.enabled !== undefined) {
      data.enabled = payload.enabled;
    }

    if (payload.provider === 'disabled') {
      data.enabled = false;
    }

    if (payload.fromEmail !== undefined) {
      data.fromEmail = normalizeRequiredString(payload.fromEmail, settings.fromEmail);
    }

    if (payload.fromName !== undefined) {
      data.fromName = normalizeRequiredString(payload.fromName, settings.fromName);
    }

    if (payload.smsEnabled !== undefined) {
      data.smsEnabled = payload.smsEnabled;
    }

    if (payload.smtpHost !== undefined) {
      data.smtpHost = normalizeOptionalString(payload.smtpHost);
    }

    if (payload.smtpPort !== undefined) {
      data.smtpPort = payload.smtpPort ?? null;
    }

    if (payload.smtpUser !== undefined) {
      data.smtpUser = normalizeOptionalString(payload.smtpUser);
    }

    if (payload.twilioAccountSid !== undefined) {
      data.twilioAccountSid = normalizeOptionalString(payload.twilioAccountSid);
    }

    if (payload.twilioPhoneNumber !== undefined) {
      data.twilioPhoneNumber = normalizeOptionalString(payload.twilioPhoneNumber);
    }

    if (payload.apiKey !== undefined && !isMaskedSecret(payload.apiKey)) {
      const trimmed = payload.apiKey?.trim();
      if (!trimmed) {
        data.apiKey = null;
      } else {
        try {
          data.apiKey = encryptSecret(trimmed);
        } catch (error) {
          throw new Error('Unable to encrypt email API key. Ensure CONFIG_ENCRYPTION_KEY is configured.');
        }
      }
    }

    if (payload.smtpPassword !== undefined && !isMaskedSecret(payload.smtpPassword)) {
      const trimmed = payload.smtpPassword?.trim();
      if (!trimmed) {
        data.smtpPassword = null;
      } else {
        try {
          data.smtpPassword = encryptSecret(trimmed);
        } catch (error) {
          throw new Error('Unable to encrypt SMTP password. Ensure CONFIG_ENCRYPTION_KEY is configured.');
        }
      }
    }

    if (payload.twilioAuthToken !== undefined && !isMaskedSecret(payload.twilioAuthToken)) {
      const trimmed = payload.twilioAuthToken?.trim();
      if (!trimmed) {
        data.twilioAuthToken = null;
      } else {
        try {
          data.twilioAuthToken = encryptSecret(trimmed);
        } catch (error) {
          throw new Error('Unable to encrypt Twilio auth token. Ensure CONFIG_ENCRYPTION_KEY is configured.');
        }
      }
    }

    await prisma.emailSettings.update({
      where: { id: settings.id },
      data,
    });

    return this.getSettingsForUi();
  }
}

export const emailSettingsService = new EmailSettingsService();
export { MASKED_SECRET };
