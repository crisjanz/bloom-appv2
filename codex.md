# Codex Instructions

- On session start, read `codex.md` (this file) and `CLAUDE.md` in the repo root.
- Follow all instructions in `CLAUDE.md` EXCEPT any guidance about token/cost saving or minimizing context.
- Concretely, ignore the entire "Cost Optimization - CRITICAL" section and any directives that exist only to reduce token usage.
- If there is a conflict, `CLAUDE.md` wins for everything except token/cost-saving guidance.
- If `CLAUDE.md` is missing or unreadable, tell the user and proceed with best effort.

## Feature Plan Workflow

When implementing a feature plan under `/docs/FEATURE_PLANS/`:
- Read the specific feature plan file first.
- Use `/docs/FEATURE_PLANS/_TEMPLATE.md` as the required structure and checklist.
- Follow the feature plan as a contract. If something is ambiguous or conflicts with existing patterns, ask before coding.

## Consistency / Pattern-First Rules (Do This Before Writing New Code)

Before creating or changing any substantial behavior, locate and mirror existing patterns in the repo.

### Mandatory Pattern Lookup
- **Backend routes:** Find a similar route in `/back/src/routes/` and copy the structure (Zod `.parse()`, error handling, Prisma usage, route registration).
- **Frontend API calls:** Use `useApiClient` only. Find an existing hook in `/admin/src/shared/hooks/` and mirror it.
- **UI lists/tables:** Use `StandardTable` and follow the standard list page layout from `CLAUDE.md`. Find an existing list page and copy the layout.
- **Forms/modals:** Use shared components (`InputField`, `Select`, `PhoneInput`, `Modal`, `FormFooter`, `FormError`, `LoadingButton`). Never raw inputs.
- **Email templates / email sending:** Before adding a new template or send flow, find existing email templates + send logic (e.g., order confirmations/receipts) and reuse the same layout/helpers.
- **Currency / money:** Everything in cents. Reuse `@shared/utils/currency` helpers (no manual `/ 100`).

### If No Pattern Exists
- Propose 2 options briefly (compatible with current architecture), ask Cris to pick, then implement.
