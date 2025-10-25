# Bloom App - Claude Code Instructions

## ⚡ Response Style (IMPORTANT)
**Be concise and token-efficient:**
- Respond directly without lengthy explanations
- **Never show code examples in discussions** - only show code when making actual changes
- Skip summaries, emojis, and verbose formatting unless explicitly requested
- Get straight to the solution

## 📚 Documentation
**All project tracking in `/docs` folder:**
- `/docs/Progress_Tracker.markdown` - Feature implementation status
- `/docs/Project_Summary.markdown` - Business context & architecture
- `/docs/Future_Roadmap.markdown`
 

## 🔧 Environment & Deployment
- **Server Timezone:** Must be `America/Vancouver` OR set `TZ=America/Vancouver`
- **Database:** PostgreSQL with Prisma ORM
- **Backend:** Express.js (Port 4000) - `cd back && npm run dev:back`
- **Frontend:** React 19 + Vite (Port 5174) - `cd admin && npm run dev`
- **Payments:** Stripe + Square integration
- **Notifications:** Twilio SMS + SendGrid email

## 🎯 Tech Stack
- **Architecture:** Domain-Driven Design (DDD)
- **Backend:** Node.js, TypeScript, Express, Prisma
- **Frontend:** React 19, TypeScript, Vite, TailwindCSS
- **UI Framework:** TailAdmin (brand color: #597485)

## 📋 Current Status
✅ Production-ready for Vancouver-based stores (single timezone)
✅ Core systems operational: POS, Orders, Payments, Notifications
⚠️ Multi-timezone expansion requires full timezone implementation (see docs)

## 🧪 Testing
```bash
# Start servers
cd back && npm run dev:back   # Backend on :4000
cd admin && npm run dev        # Frontend on :5174
```

---

**Important:** Follow user instructions exactly. Prefer editing over creating files. Never create documentation unless explicitly requested. Respond concisely and short. When planning, do not preview code examples, just describe the proposed changes.
