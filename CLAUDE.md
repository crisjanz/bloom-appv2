# Bloom App - Claude Code Instructions


## 🔧 Behavior Rules
- Be concise and technical. Avoid filler text or long explanations.  
- When asked to **edit**, directly modify code or Markdown.  
- When asked to **analyze**, summarize findings in ≤150 words.  
- Never repeat entire files unless explicitly requested.  
- Treat all `/docs/*.md` paths as live documentation — fetch them only when relevant.  
- Assume the working timezone is `America/Vancouver`.  
- Default stack: **React 19 + Vite 6 (admin)**, **Express + Prisma + PostgreSQL (back)**.  
- Language: TypeScript for both front- and backend.

---

## 🏗️ Repository Overview
| Area | Path | Description |
|------|------|-------------|
| **Admin (frontend)** | `admin/src/` | TailAdmin-based React SPA for POS & operations. |
| **Backend (API)** | `back/src/` | Express + Prisma API under `/api/*`. |
| **Customer website** | `www/` | TailGrids prototype for future e-commerce. |
| **Docs** | `/docs/` | All technical + planning documentation. |

---

## 📚 Documentation Map
| Topic | File | Summary |
|-------|------|----------|
| **System architecture & stack** | `docs/System_Reference.md` | Full architecture, data models, services, and dev workflow. |
| **API reference** | `docs/API_Endpoints.md` | Complete Express route list. |
| **Auth & security** | `docs/Auth_Security_Critical_Fixes.md` | Hardening status and test checklist. |
| **Current progress** | `docs/Progress_Tracker.markdown` | Implemented vs active work. |
| **Future roadmap** | `docs/Future_Roadmap.md` | Next 3 / 6 / 12-month objectives. |

---

## ⚙️ Recommended Workflow for Claude
1. **At startup**, use this file for context.  
2. When asked to change or design a feature:  
   - Read `System_Reference.md` for technical background.  
   - Read `Progress_Tracker.markdown` for current implementation state.  
   - Read `API_Endpoints.md` for endpoint details.  
3. When writing documentation or plans, follow existing Markdown formatting and emoji status keys (✅, 🛠️, 🔜, 💡).

---

## 🧠 Optional Knowledge Preload
If deeper reasoning is needed (architecture, planning, multi-file analysis), also read:
> `docs/PROJECT_RECAP_FOR_CLAUDE.md`

---

## Feature Proposal Workflow
New feature plans are stored under `/docs/FEATURE_PLANS/` as Markdown files.

Each plan includes:
- Overview
- Goals
- Architecture & endpoints
- UI requirements
- Implementation readiness flag

Claude may create or edit these plans.
Codex implements them once marked ready, then updates `Progress_Tracker.markdown` and archives or deletes the plan file.

---

## 🧪 Testing
```bash
# Start servers
cd back && npm run dev:back   # Backend on :4000
cd admin && npm run dev        # Admin Frontend on :5173
cd www && npm run dev		# Customer frontend on :5175
```


