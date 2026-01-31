# Email & SMS Settings Integration

**Status:** 🔜 Ready for Implementation
**Created:** 2026-01-17
**Priority:** Medium

---

## Overview

Integrate Twilio SMS settings into the existing Email Settings page, creating a unified "Email & SMS Settings" configuration page. Move Twilio credentials from `.env` to database with encryption.

---

## Database Changes

✅ **ALREADY COMPLETED:**
- Added `smsEnabled`, `twilioAccountSid`, `twilioAuthToken`, `twilioPhoneNumber` to `EmailSettings` model
- Migration `20260117181500_add_sms_to_email_settings` applied
- Prisma client generated

---

## Backend Updates Needed

### 1. Update emailSettingsService.ts

**File:** `/back/src/services/emailSettingsService.ts`

**Add to interface:**
```typescript
// Add to EmailSettingsUpdate interface
smsEnabled?: boolean;
twilioAccountSid?: string;
twilioAuthToken?: string;
twilioPhoneNumber?: string;
```

**Update methods:**
- `getSettings()` - include SMS fields in response (mask twilioAuthToken)
- `updateSettings()` - handle SMS fields, encrypt twilioAuthToken
- `getSettingsWithSecrets()` - decrypt twilioAuthToken for smsService

### 2. Update smsService.ts

**File:** `/back/src/services/smsService.ts`

**Change from:**
```typescript
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

class SMSService {
  private fromPhone = process.env.TWILIO_PHONE_NUMBER || '';
```

**Change to:**
```typescript
import { emailSettingsService } from './emailSettingsService';

class SMSService {
  private async getTwilioClient() {
    const settings = await emailSettingsService.getSettingsWithSecrets();

    if (!settings.smsEnabled || !settings.twilioAccountSid || !settings.twilioAuthToken) {
      throw new Error('SMS is not configured');
    }

    return twilio(settings.twilioAccountSid, settings.twilioAuthToken);
  }

  private async getFromPhone() {
    const settings = await emailSettingsService.getSettingsWithSecrets();
    return settings.twilioPhoneNumber || '';
  }

  async sendSMS(options: SMSOptions): Promise<boolean> {
    try {
      const twilioClient = await this.getTwilioClient();
      const fromPhone = await this.getFromPhone();

      // ... rest of existing code
    }
  }
}
```

---

## Frontend Updates Needed

### Update Email Settings Page

**File:** `/admin/src/app/pages/settings/email.tsx`

**Changes:**

1. **Update page title:**
```typescript
<PageBreadcrumb pageTitle="Email & SMS Settings" />
<h2>Email & SMS Settings</h2>
```

2. **Add SMS state:**
```typescript
const [twilioAccountSidValue, setTwilioAccountSidValue] = useState("");
const [twilioAccountSidDirty, setTwilioAccountSidDirty] = useState(false);
const [twilioAuthTokenValue, setTwilioAuthTokenValue] = useState("");
const [twilioAuthTokenDirty, setTwilioAuthTokenDirty] = useState(false);
const [twilioPhoneNumberValue, setTwilioPhoneNumberValue] = useState("");
```

3. **Add SMS fields to type:**
```typescript
type EmailSettings = {
  // ... existing fields
  smsEnabled: boolean;
  twilioAccountSid: string | null;
  twilioAuthToken: string | null;
  twilioPhoneNumber: string | null;
};
```

4. **Add SMS section to UI (after Email section):**
```tsx
{/* SMS Settings Section */}
<ComponentCard title="SMS Settings (Twilio)">
  <div className="space-y-4">
    <div className="flex items-center gap-3">
      <Switch
        checked={settings?.smsEnabled || false}
        onChange={(checked) => updateField("smsEnabled", checked)}
      />
      <div>
        <label className="block text-sm font-medium text-gray-900 dark:text-white">
          Enable SMS
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Send SMS notifications via Twilio
        </p>
      </div>
    </div>

    {settings?.smsEnabled && (
      <>
        <InputField
          label="Twilio Account SID"
          value={twilioAccountSidValue}
          onChange={(e) => {
            setTwilioAccountSidValue(e.target.value);
            setTwilioAccountSidDirty(true);
          }}
          placeholder="AC..."
        />

        <InputField
          label="Twilio Auth Token"
          type="password"
          value={twilioAuthTokenValue}
          onChange={(e) => {
            setTwilioAuthTokenValue(e.target.value);
            setTwilioAuthTokenDirty(true);
          }}
          placeholder={settings.twilioAuthToken ? "••••••••" : "Enter auth token"}
        />

        <InputField
          label="Twilio Phone Number"
          value={twilioPhoneNumberValue}
          onChange={(e) => setTwilioPhoneNumberValue(e.target.value)}
          placeholder="+1234567890"
        />

        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-900/20">
          <p className="text-sm text-blue-700 dark:text-blue-200">
            <strong>Twilio Setup:</strong> Get your credentials at{" "}
            <a
              href="https://console.twilio.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:no-underline"
            >
              console.twilio.com
            </a>
          </p>
        </div>
      </>
    )}
  </div>
</ComponentCard>
```

5. **Update handleSave to include SMS fields:**
```typescript
const payload: Record<string, any> = {
  // ... existing fields
  smsEnabled: settings.smsEnabled,
  twilioPhoneNumber: twilioPhoneNumberValue,
};

if (twilioAccountSidDirty) {
  payload.twilioAccountSid = twilioAccountSidValue;
}

if (twilioAuthTokenDirty) {
  payload.twilioAuthToken = twilioAuthTokenValue;
}
```

6. **Update loadSettings to handle SMS fields:**
```typescript
setTwilioAccountSidValue(data.twilioAccountSid || "");
setTwilioAccountSidDirty(false);
setTwilioAuthTokenValue(data.twilioAuthToken || "");
setTwilioAuthTokenDirty(false);
setTwilioPhoneNumberValue(data.twilioPhoneNumber || "");
```

---

## Implementation Checklist

### Backend
- [ ] Update `/back/src/services/emailSettingsService.ts`:
  - [ ] Add SMS fields to interfaces
  - [ ] Encrypt `twilioAuthToken` on save
  - [ ] Mask `twilioAuthToken` in `getSettings()`
  - [ ] Decrypt `twilioAuthToken` in `getSettingsWithSecrets()`
- [ ] Update `/back/src/services/smsService.ts`:
  - [ ] Remove hardcoded `.env` credentials
  - [ ] Load from database via `emailSettingsService`
  - [ ] Check `smsEnabled` before sending
  - [ ] Handle missing credentials gracefully

### Frontend
- [ ] Update `/admin/src/app/pages/settings/email.tsx`:
  - [ ] Change title to "Email & SMS Settings"
  - [ ] Add SMS state variables
  - [ ] Add SMS fields to TypeScript type
  - [ ] Add SMS Settings section UI
  - [ ] Update `handleSave()` to include SMS
  - [ ] Update `loadSettings()` to include SMS
  - [ ] Add Twilio setup instructions/link

### Testing
- [ ] Test SMS toggle on/off
- [ ] Test saving Twilio credentials
- [ ] Test encrypted storage of auth token
- [ ] Test SMS sending with database credentials
- [ ] Test SMS disabled when toggle off
- [ ] Test masked auth token in UI
- [ ] Verify `.env` Twilio vars no longer needed

---

## Migration Path

1. **Current state:** Twilio credentials in `.env`
2. **After implementation:** Credentials in database
3. **Migration:** Admin enters Twilio creds via settings page, then remove from `.env`

---

## Security Notes

- `twilioAuthToken` stored encrypted (same encryption as email apiKey)
- Masked in UI (show `••••••••` if set)
- Only decrypted server-side when sending SMS
- Never sent to frontend after initial save

---

## Success Criteria

- [ ] Email & SMS settings on single page
- [ ] Twilio credentials encrypted in database
- [ ] SMS service uses database credentials
- [ ] Toggle to enable/disable SMS
- [ ] All existing SMS functionality works
- [ ] Settings page renamed to "Email & SMS Settings"
- [ ] No hardcoded Twilio credentials in code
