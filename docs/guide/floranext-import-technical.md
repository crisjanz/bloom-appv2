# FloraNext Customer Import - Technical Reference

> **TL;DR:** From `bloom-app/scripts/export`, run `pip3 install requests`, then loop `python3 export_all_customers_batched.py` until it prints “All customers processed”, repeat with `python3 export_web_orders.py`, and upload both JSON files under **Settings → Misc → Import FloraNext Complete Export**. Expect ~1 hour for ~1,000 customers.

> **🎯 Target Environment: LOCAL WORKSTATION + PRODUCTION ADMIN**
>
> Export scripts run on your **local Mac** because they reuse your browser session (`key` + `cookie`) to call FloraNext’s private admin APIs. Import happens via the **production Bloom admin** (`admin.hellobloom.ca`). Render cannot run these scripts (FloraNext blocks unknown IPs, and the session key lives inside your browser).

---

## Quick Reference

```bash
# 1) One-time dependency
pip3 install requests

# 2) Run from repo root
cd /Users/<you>/bloom-app/scripts/export

# 3) Export customers in 50-record batches
python3 export_all_customers_batched.py
# ⇢ rerun until you see “🎉 All customers processed!”

# 4) Export online-only customers (web orders)
python3 export_web_orders.py
# ⇢ rerun until you see “🎉 Reached end of orders!”

# 5) Import both JSON files in Bloom admin (Settings → Misc)
#    - floranext_complete_export.json
#    - floranext_web_orders_export.json
```

**Alternative:** Point operations staff to the [Quick Guide](./floranext-import-quick.md).

---

## When to Use This

**Symptoms indicating this runbook is needed:**
- Bloom is missing legacy customers/recipients from FloraNext ahead of go-live.
- Recent FloraNext customers are absent in Bloom after a previous import (incremental sync).
- Walk-in customers who originally ordered online (`-web` orders) can’t be found in the customer list.
- Support asks for quarterly refresh of FloraNext data for auditing.

**Why this is needed:**
- FloraNext’s API requires an authenticated browser session (`key` + cookie); there is no service account OAuth flow.
- FloraNext does not persist web customers into the regular customer table; orders ending in `-web` or `-web-PU` must be scraped from the orders grid.
- Bloom’s import logic (`admin/src/app/pages/settings/misc.tsx` + backend) expects the normalized JSON produced by these scripts (`floranext_complete_export.json`, `floranext_web_orders_export.json`).

---

## Overview

- **Customer export script:** `scripts/export/export_all_customers_batched.py`
  1. Prompts for the FloraNext session `key` (from the admin URL) and full cookie header.
  2. Downloads the Magento-style customer grid (`customer_listing`) in descending `entity_id` order.
  3. Processes 50 customers per run, fetching all recipient addresses per customer via `customer_address_listing`.
  4. Filters out self-address duplicates, tracks `max_customer_id`, and writes `floranext_complete_export.json`.

- **Web-orders export script:** `scripts/export/export_web_orders.py`
  1. Reuses the same `key`/cookie from `floranext_config.json`.
  2. Pages through the orders grid (`sales_order_grid`) 50 at a time.
  3. Keeps only `increment_id` values ending in `-web` or `-web-PU`.
  4. Parses inline address strings into structured fields and writes `floranext_web_orders_export.json`.

- **Import workflow:** Documented in `scripts/export/IMPORT_GUIDE.md` and implemented in the Bloom admin “Misc” settings page. Imports skip duplicates, link recipients, and can be run repeatedly (idempotent).

**Estimated runtime:** ~2 minutes per batch (50 customers) on a stable connection; plan ~1 hour for 1,000 customers plus web orders.

**Frequency:** Run once for the initial migration, then rerun quarterly or whenever >50 new FloraNext customers accumulate.

---

## Prerequisites

### System Requirements
1. **macOS workstation with Python 3.9+**
   ```bash
   python3 --version
   ```
   Install via Homebrew (`brew install python@3.11`) if missing.

2. **Python `requests` library**
   ```bash
   pip3 install requests
   ```

3. **Git checkout of Bloom repo**
   - Scripts expect to run inside `/Users/<you>/bloom-app/scripts/export`.

4. **FloraNext admin access**
   - Logged-in browser tab so you can capture the session key + cookie.

5. **Bloom admin access (production)**
   - Ability to visit `Settings → Misc` and run the import card.

### Credentials & Config Files

`scripts/export/floranext_config.json` stores:

```json
{
  "key": "<floranext-session-key>",
  "cookie": "<full Cookie header>"
}
```

- The scripts prompt you to paste values on first run and reuse them afterward.
- Regenerate whenever FloraNext logs you out (usually every few days).

**Where to find values:**
- **Session key:** Look at the FloraNext admin URL in your browser: `https://app.floranext.com/.../key/<session-key>/...`
- **Cookie:** Browser DevTools → Network → any request → Request Headers → `Cookie`.

---

## Step-by-Step Instructions

### 1. Prepare the Export Directory

```bash
cd /Users/<you>/bloom-app/scripts/export
ls
```

**Purpose:** ensures subsequent commands read/write the shared JSON + config files in the expected location.

### 2. Configure FloraNext Session (first run only)

Run:
```bash
python3 export_all_customers_batched.py
```

Choose option **2** (“Enter new key & cookie”) and paste:
- **Session key** from the URL (hex string between `/key/` and the next slash)
- **Full Cookie** header from DevTools

The script writes `floranext_config.json` and restarts using the new credentials.

### 3. Export Customer Batches

```bash
python3 export_all_customers_batched.py
```

**Expected output:**
```
📦 Processing batch: customers 1 to 50 of 987
  [1/987] Jane Doe (ID: 10123)...
     ↳ 3 recipients
   ℹ️  Skipped 1 self-address
✅ Batch Complete!
▶️  Run the script again to process next batch (50 customers)
```

**What this does internally:**
- Calls `/mui/index/render/key/<key>/?namespace=customer_listing` to fetch metadata (200/customer page).
- Pulls recipients via `/customer_address_listing` for each customer ID.
- Filters duplicates via `filter_self_addresses` (see `scripts/export/export_all_customers_batched.py:151`).
- Updates `export_progress.json` with `last_customer_index`, `total_recipients`, and `max_customer_id`.

**Repeat** the command until you see:
```
🎉 All customers processed!
📄 Export file: floranext_complete_export.json
```

For incremental runs (after a complete export), the script automatically switches to “NEW customers only” mode using `max_customer_id`.

### 4. Export Web-Only Orders

```bash
python3 export_web_orders.py
```

**Expected output:**
```
📦 Fetching orders page 1...
  🌐 000004218-web
     Sender: John Smith
     Recipient: Bob Johnson
✅ Batch Complete!
Orders checked: 50
Web orders found: 12
```

**Internal behavior:**
- Pages through `sales_order_grid` using the same `key`/cookie.
- Identifies order numbers ending with `-web` or `-web-PU` (`is_web_order`).
- Splits address strings via `parse_address_string` to fill `street/city/region/postcode`.
- Appends to `floranext_web_orders_export.json` and updates `web_orders_progress.json`.

Rerun until the script prints `🎉 Reached end of orders!`.

### 5. Import into Bloom

1. Visit `https://admin.hellobloom.ca/settings/misc`.
2. In **Import FloraNext Complete Export**, upload `floranext_complete_export.json` and click **Import Complete Export**.
3. After success, upload `floranext_web_orders_export.json` (same card).

Under the hood, the admin page calls `/api/imports/floranext` (see `scripts/export/IMPORT_GUIDE.md`). The backend de-duplicates by FloraNext ID and links recipients via the `CustomerRecipient` relation.

### 6. Verify the Import

```bash
jq '.metadata' floranext_complete_export.json
```

Check the import toast or logs for counts. Then, in the Bloom admin:
- Search for a newly imported customer.
- Confirm recipients appear under the customer profile.
- Spot-check an online-only (`WEB-`) customer to ensure their address exists.

---

## Troubleshooting

### Error: `Authentication failed (401/403)`

```
❌ Authentication failed
   Your cookie/token may be expired
```

**Cause:** Session key or cookie expired.

**Solution:**
1. Log back into FloraNext.
2. Copy the new session key and cookie.
3. Rerun `export_all_customers_batched.py`, choose option **2** to overwrite the config.

### Error: `Endpoint not found (404)`

```
❌ Error fetching customers page 1: 404 Client Error
```

**Cause:** Session key does not match the `inyourvase_ca` store or FloraNext changed the namespace.

**Solution:** Confirm the URL structure in your browser (the script currently targets `inyourvase_ca`). Update the base URL in `export_all_customers_batched.py` (`fetch_all_customers`) if the store slug changed.

### Problem: Script stops midway / network hiccup

- Progress auto-saves. Just rerun the command; it resumes from `last_customer_index`.
- If you need to restart from scratch, delete `floranext_complete_export.json` and `export_progress.json` first.

### Import Fails with “Invalid JSON”

- Ensure you upload the file directly from `scripts/export` (not via AirDrop or Messenger, which can reformat text).
- Validate the file:
  ```bash
  python3 -m json.tool floranext_complete_export.json >/dev/null
  ```

### Duplicate Customers After Import

- Imports skip senders/recipients that already exist (matching `notes` or `externalId`). If duplicates are visible, run the merge tool in the Customers page.
- For a clean restart, delete Bloom customers whose notes contain “FloraNext ID:” (contact Cristian before running bulk deletes).

---

## Manual Fallback (Alternative Methods)

### Single-Customer Export

Use `scripts/export/export_customer_with_recipients.py` to pull a specific customer + recipients if you need to re-import one record without re-running the full batch.

```bash
python3 export_customer_with_recipients.py
# Enter key/cookie when prompted
# Provide the FloraNext customer ID
```

### Legacy Generic Script

If the Magento admin endpoints ever change, fall back to `scripts/floranext_extract.py`. Update `FLORANEXT_BASE_URL`, `CUSTOMERS_ENDPOINT`, and `RECIPIENTS_ENDPOINT` to match the new API paths and re-run:

```bash
cd /Users/<you>/bloom-app/scripts
python3 floranext_extract.py
```

This version uses plain REST endpoints and is slower but more flexible.

---

## Technical Details

### Data Filtering (`export_all_customers_batched.py:151`)

```python
def filter_self_addresses(customer, recipients):
    customer_fname = customer.get('billing_firstname', ...).lower()
    # ...
    if recipient_fname == customer_fname and recipient_lname == customer_lname:
        skipped += 1
        continue
```

- Prevents the customer’s own billing address from being imported as a recipient.
- Logs `ℹ️  Skipped X self-addresses` so you can audit how many were removed.

### Incremental Exports (`export_progress.json`)

```json
{
  "max_customer_id": 11842,
  "export_complete": true
}
```

- When `export_complete` is `true`, the next run filters out customers whose `entity_id <= max_customer_id`, allowing quick incremental exports.

### Web Order Parsing (`export_web_orders.py:71`)

```python
parts = [p.strip() for p in address_str.split(',')]
if len(parts) == 4:
    street, city, region, postcode = parts
```

- Handles pickup orders that only provide a province by falling back to `region` only.
- Assigns synthetic IDs (`WEB-<order>` / `WEB-RECIP-<order>`) so the Bloom import can keep them separate from regular customers.

### Import Flow

- Admin UI: `admin/src/app/pages/settings/misc.tsx` → “Import FloraNext Complete Export”.
- Backend expects payload:
  ```json
  {
    "customers": [
      { "customer": {...}, "recipients": [...] }
    ],
    "metadata": { ... }
  }
  ```
- Each `customer` becomes a Bloom `Customer` with `notes` containing `FloraNext ID`.
- `recipients` map to Bloom `CustomerRecipient` + `Address` rows.

---

## Related Files

- `scripts/export/export_all_customers_batched.py` — main customer export pipeline.
- `scripts/export/export_web_orders.py` — web-only customer extractor.
- `scripts/export/export_customer_with_recipients.py` — targeted single-customer export.
- `scripts/export/IMPORT_GUIDE.md` — UI-driven import instructions for operators.
- `scripts/export/README_SIMPLE.md` — simplified overview.
- `scripts/FLORANEXT_EXTRACTION_GUIDE.md` — legacy generic extractor.

---

## Monitoring & Maintenance

- **During export:** Watch Terminal for sudden spikes in skipped addresses or HTTP errors (FloraNext rate limiting).
- **After import:** Check Bloom logs for `/api/imports/floranext` entries and ensure processing time stays under 60s.
- **Schedule:** Re-run the export every quarter or after any major FloraNext campaign to keep Bloom in sync.

---

## Security Notes

- FloraNext cookies grant full admin access—store `floranext_config.json` locally and never commit it.
- Remove config + JSON files once migration is done or store them in an encrypted drive.
- Imports go straight into production; ensure you trust the laptop you run the scripts on.
- If the cookie leaks, reset your FloraNext password immediately (rotates the session key).

---

## Performance Considerations

- Export scripts sleep 1.5–2.5s between recipient calls to mimic human browsing. Avoid reducing delays—FloraNext may throttle or block IPs.
- Each batch uses <5 MB of memory; JSON output can exceed 20 MB for 1,000 customers—keep enough disk space.
- Network hiccups may cause per-customer retries; rerunning is safe thanks to progress checkpoints.

---

## Support

- **Primary:** Cristian Janz (`@cristian`) — overall migration owner.
- **Secondary:** Dev team on-call — questions about import failures or schema mismatches.
- **Escalation:** If exports fail repeatedly (HTTP 5xx), contact FloraNext support to confirm the admin API isn’t rate limited.

Additional resources:
- [Quick Guide](./floranext-import-quick.md) — for operators or after-hours staff.
- `docs/System_Reference.md` — architecture context for imports.

---

## Changelog

- **2025-02-05 — ChatGPT**: First edition covering both customer and web-order exports plus Bloom import flow.
