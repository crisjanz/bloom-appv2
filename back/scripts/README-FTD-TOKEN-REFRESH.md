# FTD Token Refresh Script

Simple script to refresh your production FTD token from your local Mac.

## Why?

Render doesn't have Chrome/Chromium, so automatic token refresh fails. This script runs on your Mac (which has Chrome) and uploads the token directly to your production database.

---

## 🚀 Quick Start (Easy Way)

**Just double-click:**
```
Refresh FTD Token.command
```

Located in the root of your `bloom-app` folder.

**What it does:**
1. Opens Chrome with FTD Mercury HQ
2. Extracts the auth token
3. Uploads directly to production database
4. Done!

---

## 🛠️ Alternative: Run from Terminal

```bash
cd back
npm run refresh-ftd-token
```

---

## 📋 How It Works

1. **Opens Mercury HQ** in a visible Chrome window
2. **Checks if logged in:**
   - If yes → Grabs token immediately
   - If no → Prompts you to log in manually
3. **Extracts token** from browser storage
4. **Uploads to production** database
5. **Shows success message**

---

## 🔐 Security

- Uses your existing production database connection string
- Only updates the `ftdSettings.authToken` field
- Doesn't expose credentials (token is masked in output)
- Token is securely stored in production database

---

## ⏰ When to Run

**Run this script when:**
- FTD orders stop syncing
- You see "Auth token expired" errors
- Every few weeks as preventive maintenance
- After FTD changes your password/session

**Token typically lasts:** Weeks to months (FTD sessions are long-lived)

---

## 🐛 Troubleshooting

### "Could not find token after login"
- Make sure you fully logged in to Mercury HQ
- Wait for the dashboard to fully load
- Try refreshing the page in the browser window
- Press Enter in terminal after you confirm you're logged in

### "No FTD settings record found"
- Go to https://admin.hellobloom.ca
- Navigate to Settings → FTD
- Configure FTD settings first (API key, shop ID, etc.)
- Then run this script again

### Script won't run (permission denied)
```bash
chmod +x "Refresh FTD Token.command"
```

---

## 💡 Pro Tips

1. **Keep Chrome open:** If you stay logged in to Mercury HQ, the script runs instantly
2. **Bookmark Mercury HQ:** https://mercuryhq.com/orders
3. **Run monthly:** Set a calendar reminder to refresh token monthly
4. **Test after running:** Check FTD page in admin to verify orders sync

---

## 🔄 What Happens in Production

After running this script:
- ✅ Production backend immediately uses new token
- ✅ FTD order polling continues automatically
- ✅ No server restart needed
- ✅ All new FTD orders sync normally

---

## 📝 Manual Alternative

If the script doesn't work, you can update token manually:

1. Login to https://mercuryhq.com/orders
2. Open Browser DevTools (F12)
3. Go to **Console** tab
4. Type: `localStorage.getItem('AuthTokenCache')`
5. Copy the token value
6. Go to https://admin.hellobloom.ca/settings/ftd
7. Paste token and save

---

**Questions?** The script shows helpful error messages if something goes wrong!
