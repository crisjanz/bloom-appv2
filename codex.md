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
