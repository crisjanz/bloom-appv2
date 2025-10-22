# Recipient Migration Backup - October 19, 2025

## Context
Full migration from OLD recipient system to NEW recipient system.

**OLD System:**
- `recipientId` → Single Address record
- No customer relationship tracking

**NEW System:**
- `recipientCustomerId` → Customer record (recipient as Customer)
- `deliveryAddressId` → Address from recipient's addresses
- Enables recipient history tracking and sender→recipient relationships

## What Changed
- Removed `recipientId` field from Order model
- Updated 23 files (18 frontend, 5 backend)
- Updated search queries to use NEW fields
- Database migration to drop column

## Backed Up Files
- `schema.prisma.backup` - Original schema before migration

## Date
October 19, 2025 (11:58 PM PST)
