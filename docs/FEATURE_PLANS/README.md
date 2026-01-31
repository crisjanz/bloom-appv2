### Feature Proposal Workflow
New feature plans are stored under `/docs/FEATURE_PLANS/` as Markdown files.

Each plan includes:
- Overview
- Goals
- Architecture & endpoints
- UI requirements
- Implementation readiness flag

Claude may create or edit these plans.
Codex implements them once marked ready, then updates `Progress_Tracker.markdown` and archives or deletes the plan file.