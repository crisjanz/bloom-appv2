#!/usr/bin/env python3
"""
Customer Data Merge Tool

Reads all export files and merges them into one clean dataset for Bloom import.

Sources:
1. Floranext customer database export (floranext_complete_export.json)
2. Floranext web orders export (floranext_web_orders_export.json)
3. Stripe customers export (unified_customers.csv)

Output:
- bloom_import.json - Final merged customer data ready for Bloom import
- merge_report.txt - Human-readable report of what was merged

Usage:
  python3 merge_customer_data.py
"""

import json
import csv
from collections import defaultdict
from datetime import datetime


# File paths
FLORANEXT_EXPORT = "export/floranext_complete_export.json"
WEB_ORDERS_EXPORT = "export/floranext_web_orders_export.json"
STRIPE_EXPORT = "unified_customers.csv"
OUTPUT_FILE = "bloom_import.json"
REPORT_FILE = "merge_report.txt"


def normalize_phone(phone):
    """Normalize phone number for matching"""
    if not phone:
        return None
    # Remove all non-digits
    digits = ''.join(c for c in str(phone) if c.isdigit())
    if len(digits) >= 10:
        # Take last 10 digits
        return digits[-10:]
    return None


def normalize_email(email):
    """Normalize email for matching"""
    if not email:
        return None
    return email.lower().strip()


def normalize_name(name):
    """Normalize name for matching"""
    if not name:
        return None
    return name.lower().strip()


def load_floranext_customers():
    """Load customers from Floranext export"""
    print("📂 Loading Floranext customer export...")

    try:
        with open(FLORANEXT_EXPORT, 'r') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"   ⚠️  File not found: {FLORANEXT_EXPORT}")
        print(f"   Run export_all_customers_batched.py first!")
        return []

    customers = data.get('customers', [])
    print(f"   ✅ Loaded {len(customers)} Floranext customers")

    return customers


def load_web_orders():
    """Load customers from web orders export"""
    print("📂 Loading web orders export...")

    try:
        with open(WEB_ORDERS_EXPORT, 'r') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"   ⚠️  File not found: {WEB_ORDERS_EXPORT}")
        print(f"   Skipping web orders (run export_web_orders.py if needed)")
        return []

    customers = data.get('customers', [])
    print(f"   ✅ Loaded {len(customers)} web order customers")

    return customers


def load_stripe_customers():
    """Load customers from Stripe CSV export"""
    print("📂 Loading Stripe customer export...")

    try:
        with open(STRIPE_EXPORT, 'r') as f:
            reader = csv.DictReader(f)
            customers = list(reader)
    except FileNotFoundError:
        print(f"   ⚠️  File not found: {STRIPE_EXPORT}")
        print(f"   Skipping Stripe customers")
        return []

    # Filter out "Guest" customers
    filtered = [c for c in customers if c.get('Name', '').strip().lower() != 'guest']

    print(f"   ✅ Loaded {len(customers)} Stripe customers")
    print(f"   ℹ️  Filtered out {len(customers) - len(filtered)} 'Guest' customers")
    print(f"   ✅ {len(filtered)} Stripe customers to merge")

    return filtered


def build_customer_record(source, source_type, data):
    """
    Build a standardized customer record from any source

    Returns: {
        'source': 'floranext' | 'web_order' | 'stripe',
        'source_id': '...',
        'firstName': '...',
        'lastName': '...',
        'email': '...',
        'phone': '...',
        'stripe_customer_id': '...',
        'recipients': [...],
        'raw_data': {...}
    }
    """

    if source_type == 'floranext':
        customer = data.get('customer', {})
        return {
            'source': 'floranext',
            'source_id': customer.get('entity_id'),
            'firstName': customer.get('billing_firstname', customer.get('firstname', '')),
            'lastName': customer.get('billing_lastname', customer.get('lastname', '')),
            'email': normalize_email(customer.get('email')),
            'phone': normalize_phone(customer.get('billing_telephone')),
            'stripe_customer_id': data.get('stripe_customer_id'),
            'recipients': data.get('recipients', []),
            'created_at': customer.get('created_at'),
            'raw_data': data
        }

    elif source_type == 'web_order':
        customer = data.get('customer', {})
        return {
            'source': 'web_order',
            'source_id': customer.get('entity_id'),
            'firstName': customer.get('billing_firstname', ''),
            'lastName': customer.get('billing_lastname', ''),
            'email': normalize_email(customer.get('email')),
            'phone': normalize_phone(customer.get('billing_telephone')),
            'stripe_customer_id': None,  # Web orders don't have Stripe IDs
            'recipients': data.get('recipients', []),
            'created_at': customer.get('created_at'),
            'raw_data': data
        }

    elif source_type == 'stripe':
        # Stripe CSV has: id, Email, Name
        # Name could be "John Doe" or just "John" or empty
        name = data.get('Name', '').strip()
        name_parts = name.split() if name else []

        return {
            'source': 'stripe',
            'source_id': data.get('id'),
            'firstName': name_parts[0] if name_parts else '',
            'lastName': ' '.join(name_parts[1:]) if len(name_parts) > 1 else '',
            'email': normalize_email(data.get('Email')),
            'phone': None,  # Stripe export doesn't include phone
            'stripe_customer_id': data.get('id'),
            'recipients': [],
            'created_at': data.get('Created (UTC)'),
            'raw_data': data
        }

    return None


def find_matching_key(record):
    """
    Generate a matching key for duplicate detection

    Priority:
    1. Stripe customer ID (most reliable - unique identifier)
    2. Phone (very reliable)
    3. Email + Name
    4. Email only
    """
    keys = []

    # Primary: Stripe customer ID (if available)
    if record['stripe_customer_id']:
        keys.append(('stripe_id', record['stripe_customer_id']))

    # Secondary: Phone
    if record['phone']:
        keys.append(('phone', record['phone']))

    # Tertiary: Email + Name
    if record['email']:
        full_name = f"{record['firstName']} {record['lastName']}".strip()
        if full_name:
            keys.append(('email_name', f"{record['email']}:{normalize_name(full_name)}"))
        else:
            keys.append(('email', record['email']))

    return keys


def group_duplicates(records):
    """
    Group records by matching criteria

    Returns: {
        'phone:6045551234': [record1, record2, ...],
        'email:john@example.com': [record3],
        ...
    }
    """
    groups = defaultdict(list)

    for record in records:
        keys = find_matching_key(record)
        for key_type, key_value in keys:
            groups[f"{key_type}:{key_value}"].append(record)

    # Filter out single-record groups (no duplicates)
    duplicate_groups = {k: v for k, v in groups.items() if len(v) > 1}

    # Also create single groups for records with no duplicates
    single_groups = {}
    seen_ids = set()
    for records_list in duplicate_groups.values():
        for record in records_list:
            seen_ids.add((record['source'], record['source_id']))

    for record in records:
        record_id = (record['source'], record['source_id'])
        if record_id not in seen_ids:
            # This record has no duplicates
            key = f"unique:{record['source']}:{record['source_id']}"
            single_groups[key] = [record]

    return duplicate_groups, single_groups


def merge_group(records):
    """
    Merge a group of duplicate records into one final customer

    Returns: {
        'firstName': '...',
        'lastName': '...',
        'email': '...',
        'phone': '...',
        'stripeCustomerIds': ['cus_xxx', 'cus_yyy'],
        'recipients': [...],
        'sources': ['floranext', 'stripe', ...]
    }
    """
    # Prioritize data from Floranext, then web orders, then Stripe
    priority_order = ['floranext', 'web_order', 'stripe']

    sorted_records = sorted(records, key=lambda r: priority_order.index(r['source']))

    # Start with first record (highest priority)
    primary = sorted_records[0]

    merged = {
        'firstName': primary['firstName'],
        'lastName': primary['lastName'],
        'email': primary['email'],
        'phone': primary['phone'],
        'stripeCustomerIds': [],
        'recipients': primary['recipients'][:],  # Copy recipients
        'sources': [primary['source']],
        'created_at': primary['created_at']
    }

    # Collect all Stripe customer IDs (deduplicate)
    for record in sorted_records:
        if record['stripe_customer_id']:
            if record['stripe_customer_id'] not in merged['stripeCustomerIds']:
                merged['stripeCustomerIds'].append(record['stripe_customer_id'])
        if record['source'] not in merged['sources']:
            merged['sources'].append(record['source'])

        # Merge recipients (avoid duplicates)
        for recipient in record['recipients']:
            # Simple duplicate check by name + address
            recipient_key = f"{recipient.get('firstname')}:{recipient.get('street')}"
            existing_keys = [f"{r.get('firstname')}:{r.get('street')}" for r in merged['recipients']]
            if recipient_key not in existing_keys:
                merged['recipients'].append(recipient)

        # Fill in missing data from lower priority sources
        if not merged['firstName'] and record['firstName']:
            merged['firstName'] = record['firstName']
        if not merged['lastName'] and record['lastName']:
            merged['lastName'] = record['lastName']
        if not merged['email'] and record['email']:
            merged['email'] = record['email']
        if not merged['phone'] and record['phone']:
            merged['phone'] = record['phone']

    return merged


def generate_report(duplicate_groups, single_groups, merged_customers):
    """Generate human-readable merge report"""
    report = []

    report.append("=" * 70)
    report.append("CUSTOMER DATA MERGE REPORT")
    report.append("=" * 70)
    report.append(f"Generated: {datetime.now().isoformat()}")
    report.append("")

    # Summary
    report.append("SUMMARY")
    report.append("-" * 70)
    report.append(f"Total duplicate groups found: {len(duplicate_groups)}")
    report.append(f"Total unique customers: {len(single_groups)}")
    report.append(f"Final merged customers: {len(merged_customers)}")
    report.append("")

    # Stripe ID statistics
    with_stripe = sum(1 for c in merged_customers if c['stripeCustomerIds'])
    multi_stripe = sum(1 for c in merged_customers if len(c['stripeCustomerIds']) > 1)
    report.append(f"Customers with Stripe IDs: {with_stripe}")
    report.append(f"Customers with multiple Stripe IDs: {multi_stripe}")
    report.append("")

    # Detailed duplicate groups
    if duplicate_groups:
        report.append("=" * 70)
        report.append("MERGED DUPLICATE GROUPS")
        report.append("=" * 70)
        report.append("")

        for idx, (key, records) in enumerate(duplicate_groups.items(), 1):
            report.append(f"GROUP {idx}: {key}")
            report.append("-" * 50)

            for record in records:
                report.append(f"  Source: {record['source']}")
                report.append(f"  Name: {record['firstName']} {record['lastName']}")
                report.append(f"  Email: {record['email'] or '(none)'}")
                report.append(f"  Phone: {record['phone'] or '(none)'}")
                report.append(f"  Stripe ID: {record['stripe_customer_id'] or '(none)'}")
                report.append("")

            # Show merged result
            merged = [c for c in merged_customers if set(c['sources']) == set(r['source'] for r in records)]
            if merged:
                m = merged[0]
                report.append(f"  MERGED RESULT:")
                report.append(f"    Name: {m['firstName']} {m['lastName']}")
                report.append(f"    Email: {m['email'] or '(none)'}")
                report.append(f"    Phone: {m['phone'] or '(none)'}")
                report.append(f"    Stripe IDs: {', '.join(m['stripeCustomerIds']) if m['stripeCustomerIds'] else '(none)'}")
                report.append(f"    Recipients: {len(m['recipients'])}")

            report.append("")

    return "\n".join(report)


def main():
    print("=" * 70)
    print("Customer Data Merge Tool")
    print("=" * 70)
    print()

    # Load all data sources
    floranext_customers = load_floranext_customers()
    web_orders = load_web_orders()
    stripe_customers = load_stripe_customers()

    print()
    print("📊 Data Summary:")
    print(f"   Floranext customers: {len(floranext_customers)}")
    print(f"   Web order customers: {len(web_orders)}")
    print(f"   Stripe customers: {len(stripe_customers)}")
    print()

    if not floranext_customers and not web_orders and not stripe_customers:
        print("❌ No data to merge! Run export scripts first.")
        return

    # Build standardized records
    print("🔨 Building standardized records...")
    all_records = []

    for customer in floranext_customers:
        record = build_customer_record(customer, 'floranext', customer)
        if record:
            all_records.append(record)

    for customer in web_orders:
        record = build_customer_record(customer, 'web_order', customer)
        if record:
            all_records.append(record)

    for customer in stripe_customers:
        record = build_customer_record(customer, 'stripe', customer)
        if record:
            all_records.append(record)

    print(f"   ✅ Built {len(all_records)} standardized records")
    print()

    # Find duplicates
    print("🔍 Detecting duplicates...")
    duplicate_groups, single_groups = group_duplicates(all_records)

    print(f"   ✅ Found {len(duplicate_groups)} duplicate groups")
    print(f"   ✅ Found {len(single_groups)} unique customers")
    print()

    # Merge duplicates
    print("🔀 Merging duplicates...")
    merged_customers = []

    # Merge duplicate groups
    for records in duplicate_groups.values():
        merged = merge_group(records)
        merged_customers.append(merged)

    # Add singles
    for records in single_groups.values():
        merged = merge_group(records)
        merged_customers.append(merged)

    print(f"   ✅ Created {len(merged_customers)} final customer records")
    print()

    # Generate report
    print("📄 Generating merge report...")
    report = generate_report(duplicate_groups, single_groups, merged_customers)

    with open(REPORT_FILE, 'w') as f:
        f.write(report)

    print(f"   ✅ Report saved to: {REPORT_FILE}")
    print()

    # Save final merged data
    print("💾 Saving final import file...")

    output_data = {
        'customers': merged_customers,
        'metadata': {
            'merged_at': datetime.now().isoformat(),
            'total_customers': len(merged_customers),
            'customers_with_stripe': sum(1 for c in merged_customers if c['stripeCustomerIds']),
            'customers_without_stripe': sum(1 for c in merged_customers if not c['stripeCustomerIds']),
            'total_stripe_ids': sum(len(c['stripeCustomerIds']) for c in merged_customers),
            'sources': {
                'floranext': len(floranext_customers),
                'web_orders': len(web_orders),
                'stripe': len(stripe_customers)
            }
        }
    }

    with open(OUTPUT_FILE, 'w') as f:
        json.dump(output_data, f, indent=2)

    print(f"   ✅ Saved to: {OUTPUT_FILE}")
    print()

    # Final summary
    print("=" * 70)
    print("✅ MERGE COMPLETE!")
    print("=" * 70)
    print(f"Final customers: {len(merged_customers)}")
    print(f"With Stripe IDs: {output_data['metadata']['customers_with_stripe']}")
    print(f"Without Stripe IDs: {output_data['metadata']['customers_without_stripe']}")
    print(f"Total Stripe IDs linked: {output_data['metadata']['total_stripe_ids']}")
    print()
    print(f"📄 Review the merge report: {REPORT_FILE}")
    print(f"📦 Import file ready: {OUTPUT_FILE}")
    print()
    print("Next step: Import bloom_import.json into Bloom POS!")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
