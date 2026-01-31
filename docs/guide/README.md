# Bloom POS User Guides

This directory contains operational guides for using and maintaining the Bloom flower shop POS system.

---

## Guide Structure

Each task has **two versions** of documentation:

### 🟢 Quick Guides (For Operators)
- **Audience:** Store managers, florists, non-technical staff
- **Style:** Simple language, numbered steps, screenshots
- **Length:** 1 page maximum
- **Focus:** Just enough to get the job done
- **File naming:** `task-name-quick.md`

### 🔵 Technical References (For Admins)
- **Audience:** System admins, developers, troubleshooters
- **Style:** Detailed, technical terminology, code examples
- **Length:** Comprehensive (multiple pages)
- **Focus:** Deep understanding, troubleshooting, alternatives
- **File naming:** `task-name-technical.md`

---

## Available Guides

### FTD Integration
| Task | Quick Guide | Technical Reference |
|------|-------------|---------------------|
| Refresh FTD Token | [Quick](./ftd-token-refresh-quick.md) | [Technical](./ftd-token-refresh-technical.md) |

### Data Migration
| Task | Quick Guide | Technical Reference |
|------|-------------|---------------------|
| Import FloraNext Customers | [Quick](./floranext-import-quick.md) | [Technical](./floranext-import-technical.md) |

### Product Management
*Coming soon*

### Order Processing
*Coming soon*

### Customer Management
*Coming soon*

### Reporting
*Coming soon*

### System Administration
*Coming soon*

---

## Creating New Guides

### 1. Choose Your Audience

**Creating a guide for staff?** Use the [Quick Guide Template](./TEMPLATE-quick.md)
- Copy template: `cp TEMPLATE-quick.md your-task-quick.md`
- Keep it simple and visual
- Test with a non-technical person

**Creating a guide for admins?** Use the [Technical Reference Template](./TEMPLATE-technical.md)
- Copy template: `cp TEMPLATE-technical.md your-task-technical.md`
- Include troubleshooting and technical details
- Link related code files

### 2. Writing Guidelines

**Quick Guides:**
- Use plain language (avoid jargon)
- Include copy-paste commands
- Add screenshot placeholders
- Max 1 page of steps
- Link to technical guide for complex issues

**Technical References:**
- Start with TL;DR (30 words max)
- Include Quick Reference code block
- Document all error scenarios
- Explain "why" not just "how"
- Link to related files and docs

### 3. Checklist Before Publishing

- [ ] Tested instructions on a clean system
- [ ] All commands work as written
- [ ] Screenshots added (or placeholders noted)
- [ ] Links between quick/technical versions work
- [ ] Troubleshooting section covers common issues
- [ ] Contact information is current
- [ ] Added to the "Available Guides" table above

---

## Style Guide

### Language

**✅ Good (Active, Simple)**
- "Click the **Save** button"
- "Run this command"
- "Open Terminal"

**❌ Bad (Passive, Complex)**
- "The Save button should be clicked"
- "Execute the following command"
- "Launch a terminal emulator"

### Code Blocks

Always specify the language:

````markdown
```bash
npm install
```
````

Include expected output:
````markdown
```bash
npm run dev

# Expected output:
# Server running on http://localhost:4000
```
````

### File Paths

Use full absolute paths in technical guides:
```bash
cd /Users/yourname/bloom-app/back
```

Use generic paths in quick guides:
```bash
cd /path/to/bloom-app/back
```

### Screenshots

Placeholder format:
```markdown
*(Screenshot: Description of what should be shown)*
```

When adding real screenshots:
1. Save as PNG
2. Name descriptively: `ftd-login-screen.png`
3. Store in `docs/guide/images/`
4. Replace placeholder with: `![Alt text](./images/filename.png)`

---

## Directory Structure

```
docs/guide/
├── README.md                           ← You are here
├── TEMPLATE-quick.md                   ← Template for quick guides
├── TEMPLATE-technical.md               ← Template for technical references
│
├── ftd-token-refresh-quick.md          ← Example quick guide
├── ftd-token-refresh-technical.md      ← Example technical guide
│
├── images/                             ← Screenshots go here
│   └── [task-name]/
│       ├── step1.png
│       └── step2.png
│
└── [future guides]
```

---

## Maintenance

### Updating Existing Guides

1. Make changes to the appropriate file
2. Update the Changelog section (technical guides only)
3. Test changed commands/steps
4. Bump date in Changelog

### Deprecating Guides

1. Add "⚠️ DEPRECATED" to title
2. Link to replacement guide
3. Keep file for historical reference (don't delete)

### Requesting New Guides

1. Open an issue in the repo
2. Title: "Guide Request: [Task Name]"
3. Include:
   - What task needs documentation
   - Who will use it (technical level)
   - Current pain points/confusion

---

## Templates

### Quick Guide Template
**File:** [TEMPLATE-quick.md](./TEMPLATE-quick.md)

**Includes:**
- When to use section
- Prerequisites
- Numbered steps
- Troubleshooting
- Visual reference section

### Technical Reference Template
**File:** [TEMPLATE-technical.md](./TEMPLATE-technical.md)

**Includes:**
- TL;DR summary
- Quick reference commands
- When to use (symptoms)
- Prerequisites with setup
- Detailed steps
- Extensive troubleshooting
- Manual fallback methods
- Technical deep-dive sections
- Related files
- Security notes

---

## Contributing

### Adding Your First Guide

1. **Copy the template:**
   ```bash
   cd docs/guide
   cp TEMPLATE-quick.md my-task-quick.md
   cp TEMPLATE-technical.md my-task-technical.md
   ```

2. **Fill in the sections:**
   - Replace all `[placeholders]`
   - Add your specific commands/steps
   - Delete the "Notes for Template Users" section

3. **Test the guide:**
   - Follow it step-by-step on a clean system
   - Fix any unclear or incorrect steps
   - Add troubleshooting for issues you encounter

4. **Add to index:**
   - Update the "Available Guides" table in this README
   - Add appropriate category if needed

5. **Commit:**
   ```bash
   git add docs/guide/my-task-*.md docs/guide/README.md
   git commit -m "docs: add guide for [task name]"
   ```

### Review Checklist

Before submitting a guide for review:

**Content:**
- [ ] All commands tested and working
- [ ] Prerequisites clearly listed
- [ ] Common errors documented
- [ ] Links work (quick ↔ technical)
- [ ] Contact info is current

**Format:**
- [ ] Follows template structure
- [ ] Code blocks have language specified
- [ ] Consistent heading levels
- [ ] No spelling/grammar errors

**Completeness:**
- [ ] Quick guide is under 2 pages
- [ ] Technical guide has TL;DR
- [ ] Troubleshooting covers 3+ issues
- [ ] Manual fallback provided (if applicable)

---

## Questions?

- **About guide content:** Contact the original author (check Changelog)
- **About guide structure:** Contact Cristian
- **Can't find a guide:** Check if there's a related technical doc in `/docs/`

---

## Future Plans

**Upcoming guides:**
- Product Management (add/edit products and variants)
- Order Processing (POS workflow, FTD orders, delivery scheduling)
- Customer Management (creating customers, merging duplicates)
- Inventory Management (stock levels, low stock alerts)
- Gift Card System (issuing, redeeming, balance checks)
- Reporting (daily sales, tax reports, product performance)
- Database Backup & Recovery
- Deployment to Production

**Enhancements:**
- Video walkthroughs for complex tasks
- Interactive in-dashboard help
- PDF compilation of all guides
- Searchable knowledge base

---

**Last updated:** December 11, 2024
