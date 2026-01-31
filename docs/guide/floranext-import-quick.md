# FloraNext Customer Import - Quick Guide

**When to use:** Migrating customer + recipient records from FloraNext into Bloom or syncing the latest customer batches before a cutover.

**Time needed:** ~10 minutes per 50 customers (plan 30–60 minutes for a full export/import cycle).

**Who can do this:** Store admins comfortable with Terminal and the Bloom admin dashboard.

> **🎯 Target Environment: LOCAL MAC + PRODUCTION ADMIN**
>
> Exports run from your **local Mac** (they need Chrome cookies + Python). Imports happen inside the **production Bloom admin** (`admin.hellobloom.ca`). Do not run these scripts on Render—FloraNext blocks server IPs.

---

## What You'll Need

- Mac with Python 3 + `pip3` installed
- FloraNext admin access to grab the session key + cookie (ask Cristian if you don’t have it)
- Bloom admin credentials (Settings → Misc)
- Terminal access to `/path/to/bloom-app/scripts/export`
- Stable internet (scripts call the live FloraNext API)

---

## Steps

### 1. Install Dependencies (One-Time)
```bash
pip3 install requests
```

**Tip:** If you already ran any FloraNext script recently, you can skip this.

### 2. Open Terminal in the Export Folder
```bash
cd /path/to/bloom-app/scripts/export
```

**What you should see:** `export_all_customers_batched.py`, `export_web_orders.py`, and several JSON files.

### 3. Export Regular Customers (50 at a time)
```bash
python3 export_all_customers_batched.py
```

- On the first run choose option **2** to paste a fresh FloraNext session key + cookie (copied from the URL + DevTools).
- The script saves them to `floranext_config.json` so future runs can pick option **1**.
- Each run grabs 50 customers, filters self-addresses, and appends them to `floranext_complete_export.json`.

**Keep rerunning** the command until you see:
```
🎉 All customers processed!
📄 Export file: floranext_complete_export.json
```

### 4. Export Web-Only Orders (same folder)
```bash
python3 export_web_orders.py
```

- This script scans FloraNext order history page by page.
- It only keeps orders ending in `-web` or `-web-PU` and stores them in `floranext_web_orders_export.json`.
- Repeat the command until the script prints `🎉 Reached end of orders!`

### 5. Import Both Files into Bloom
1. Open `https://admin.hellobloom.ca/settings/misc`
2. Find **Import FloraNext Complete Export**
3. Upload `floranext_complete_export.json` → Click **Import**
4. Repeat for `floranext_web_orders_export.json`

**Success looks like:**
```
✅ Import complete!
Created: 50 customers, 120 recipients
Skipped: 0 customers (already in Bloom)
```

### 6. Spot-Check Customers
- Search for a recently imported customer in Bloom (Customers page)
- Confirm their default recipients appear on the profile

---

## Troubleshooting

**Problem:** Script says `Authentication failed (401/403)`
- **Solution:** Grab a fresh session key (from the FloraNext URL `/key/<value>/`) and cookie (DevTools → Network → Request Headers). Re-run and choose option 2.

**Problem:** Script stops after one batch
- **Solution:** Just run the same command again. Progress is saved in `export_progress.json` and `web_orders_progress.json`.

**Problem:** Import fails with “Invalid file”
- **Solution:** Make sure you’re uploading the JSON created by the scripts (not a CSV). If needed, open the file and confirm it starts with `{ "customers": [...] }`.

**Problem:** Duplicate customers showing up
- **Solution:** Imports skip existing Bloom customers automatically. If duplicates still appear, note their names and follow the merge process or contact Cristian.

**Problem:** Still not working?
- **Solution:** Use the [Technical Guide](./floranext-import-technical.md) or message Cristian for help.

---

## Visual Reference

### Terminal Output (customer export)
```
📦 Processing batch: customers 1 to 50 of 1000
  [1/1000] Jane Doe (ID: 10123)...
     ↳ 3 recipients
✅ Batch Complete!
▶️  Run the script again to process next batch (50 customers)
```

### Bloom Admin Import Card
*(Screenshot: Settings → Misc → Import FloraNext Complete Export card with “Choose File” and “Import Complete Export” buttons.)*

---

**Need more detail?** See the [Technical Reference Guide](./floranext-import-technical.md)
