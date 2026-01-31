# [Task Name] - Technical Reference

> **TL;DR:** [One sentence summary: what command to run, what it does, how long it takes]

> **🎯 Target Environment: [PRODUCTION / LOCAL / BOTH]**
>
> [Clearly state which environment this guide applies to and provide technical context:]
> - **Production only**: Explain why (e.g., missing dependencies, security requirements)
> - **Local only**: Explain limitations for production use
> - **Both**: Note any differences in behavior between environments
>
> [Example: "This guide is for production (Render) only. Local development handles this automatically via [service name] because [technical reason]."]

---

## Quick Reference

```bash
# [One-time setup commands, if any]
export SOME_ENV_VAR="value"

# [Main command(s) to execute]
cd /path/to/directory
npm run some-command

# [Verification command]
command-to-verify-success
```

**Alternative:** [Link to Quick Guide](./<task-name>-quick.md) for non-technical users

---

## When to Use This

**Symptoms indicating this task is needed:**
- [Symptom 1: e.g., "Error messages in logs"]
- [Symptom 2: e.g., "Feature stops working"]
- [Symptom 3: e.g., "Data not updating"]
- [Symptom 4: e.g., "Threshold crossed (time/count)"]

**Why this is needed:**
- [Technical explanation: root cause, system limitation, or design choice]
- [Context: why automation isn't possible or why manual intervention is required]

---

## Overview

**Script/File location:** `path/to/script.ts` or `path/to/file.tsx`

**What it does:**
1. [Step 1: high-level action]
2. [Step 2: high-level action]
3. [Step 3: high-level action]
4. [Step 4: high-level action]

**Estimated runtime:** [X-Y minutes/hours]

**Frequency:** [How often this is typically needed]

---

## Prerequisites

### System Requirements
1. **[Requirement 1]** - [Description]
   - [Specific version or setup details]
   - [Where to get/install it]

2. **[Requirement 2]** - [Description]
   ```bash
   # Example command to verify
   command --version
   ```

3. **[Requirement 3]** - [Description]
   ```bash
   # Setup command
   export VARIABLE="value"
   # Add to ~/.zshrc for persistence
   ```

4. **Access/Permissions:**
   - [What access is needed]
   - [Where to get credentials]
   - [How to verify access]

### Environment Variables

```bash
# Required
export VARIABLE_NAME="value"  # Description of what this controls

# Optional
export OPTIONAL_VAR="value"   # Description and default value
```

**Where to find values:**
- [Source 1]: Description or link
- [Source 2]: Description or link

---

## Step-by-Step Instructions

### 1. [Preparation Step]
```bash
cd /path/to/directory
```

**Purpose:** [Why this step is necessary]

### 2. [Main Command/Action]
```bash
command with arguments
```

**Expected output:**
```
[Example of normal/success output]
```

**What this does internally:**
- [Technical detail 1]
- [Technical detail 2]

### 3. [Conditional Step or Branch]

**Scenario A: [Common case]**
```
[Output you'll see]
```
→ [What to do]

**Scenario B: [Alternative case]**
```
[Different output]
```
→ [Different action]

### 4. [Verification Step]
```bash
# Verify via command
command-to-check-status

# Or via UI
# Navigate to [location] and check [indicator]
```

**Success indicators:**
- [Indicator 1: log message, status code, etc.]
- [Indicator 2: visual confirmation]
- [Indicator 3: data change]

---

## Troubleshooting

### Error: [Error Message or Type]
```
[Full error text as it appears]
```

**Cause:** [Why this error occurs]

**Solution:**
```bash
# Fix command
solution-command
```

**Explanation:** [Why this solution works]

---

### Error: [Another Common Error]
```
[Error text]
```

**Solutions (try in order):**
1. [Quick fix 1]
   ```bash
   command
   ```
2. [Alternative fix 2]
3. [Nuclear option / escalation]

---

### Error: [Third Error Type]

**Symptoms:**
- [How to recognize this error]
- [Related failures]

**Root cause:** [Technical explanation]

**Resolution:**
```bash
# Step 1
command-one

# Step 2
command-two

# Verify
verification-command
```

---

### Performance Issues

**Symptom:** [Task is slow/hanging]

**Diagnostic steps:**
```bash
# Check resource 1
diagnostic-command-1

# Check resource 2
diagnostic-command-2
```

**Optimization:**
- [Technique 1]
- [Technique 2]

---

## Manual Fallback (Alternative Method)

If the automated approach fails, use this manual process:

### Method 1: [Alternative Approach Name]

**Steps:**
1. [Manual step 1]
2. [Manual step 2]
3. [Manual step 3]

**Pros/Cons:**
- ✅ [Advantage]
- ❌ [Disadvantage]

### Method 2: [Another Alternative]

**When to use:** [Specific scenario where this is better]

**Process:**
```bash
# Commands for alternative method
```

---

## Technical Details

### [Technical Topic 1: e.g., "How Authentication Works"]

[Detailed explanation of the underlying mechanism]

**Code reference:** `path/to/file.ts:lineNumber`

```typescript
// Relevant code snippet
function example() {
  // ...
}
```

**Key points:**
- [Technical detail 1]
- [Technical detail 2]

---

### [Technical Topic 2: e.g., "Database Schema"]

**Schema:** `path/to/schema.prisma`

```prisma
// Relevant schema definition
model Example {
  id String @id
  // ...
}
```

**Fields explained:**
- `fieldName`: [Purpose and format]
- `anotherField`: [Purpose and constraints]

---

### [Technical Topic 3: e.g., "System Architecture"]

```
[ASCII diagram or description of data flow]

Component A
  ├─ Step 1
  ├─ Step 2
  └─ Component B
      ├─ Step 3
      └─ Step 4
```

**Components:**
- **[Component 1]**: [Role and responsibility]
- **[Component 2]**: [Role and responsibility]

---

## Related Files

- **Main file:** `path/to/main-file.ts` ([Purpose])
- **Config:** `path/to/config.ts` ([What it configures])
- **Schema:** `path/to/schema.prisma` ([Data models])
- **Tests:** `path/to/test.spec.ts` ([Test coverage])
- **Docs:** `path/to/other-doc.md` ([Related documentation])

---

## Monitoring & Maintenance

### Health Checks

**Manual check:**
```bash
# Command to verify system health
health-check-command
```

**Automated monitoring:**
- [Dashboard link or log location]
- [Metrics to watch]
- [Alert thresholds]

### Maintenance Schedule

**Regular tasks:**
- **Daily**: [Task and why]
- **Weekly**: [Task and why]
- **Monthly**: [Task and why]

**Signs maintenance is needed:**
- [Indicator 1]
- [Indicator 2]

---

## Security Notes

- [Security consideration 1: e.g., "Token grants full access to..."]
- [Security consideration 2: e.g., "Store credentials in..."]
- [Security consideration 3: e.g., "Rotate keys if..."]

**Sensitive data:**
- ⚠️  Never commit [data type] to git
- ✅  Store in [secure location]
- 🔄  Rotate every [timeframe]

---

## Performance Considerations

**Resource usage:**
- Memory: [Typical usage]
- CPU: [Impact description]
- Network: [Bandwidth/latency requirements]

**Optimization tips:**
- [Tip 1: how to speed up]
- [Tip 2: how to reduce resource usage]

**Limitations:**
- [Known limitation 1]
- [Known limitation 2]

---

## Support

**Questions or issues?** Contact:
- [Primary contact] (for [specific issue type])
- [Secondary contact] (for [other issue type])
- [Escalation path] (if urgent/blocked)

**Additional resources:**
- [Link to Quick Guide](./<task-name>-quick.md) - Simplified instructions
- [Link to related doc] - [What it covers]
- [External documentation] - [Vendor/library docs]

---

## Changelog

**[Date]** - [Version/Author]
- [Change 1: e.g., "Added troubleshooting section for X error"]
- [Change 2: e.g., "Updated command syntax for v2.0"]

---

## Notes for Template Users

**When creating a new technical guide:**

1. **TL;DR is mandatory:**
   - Single sentence under 30 words
   - Include: command, purpose, time estimate

2. **Quick Reference box:**
   - Copy-paste ready commands
   - No prose, just code
   - Include verification command

3. **Structure matters:**
   - "When to Use" = symptoms + why (not just "what")
   - Prerequisites = everything needed before starting
   - Steps = numbered, detailed, with outputs
   - Troubleshooting = actual error messages users will see

4. **Code blocks:**
   - Always include language identifier: \`\`\`bash
   - Add comments for clarity
   - Show expected output after commands

5. **Depth guidelines:**
   - Overview = high-level (what & why)
   - Steps = medium-level (how, with examples)
   - Technical Details = deep-dive (internals, schemas, architecture)

6. **Troubleshooting format:**
   - Start with error message (verbatim)
   - Explain cause
   - Provide solution with commands
   - Multiple solutions = numbered list, try in order

7. **Cross-references:**
   - Link to Quick Guide at top
   - Link to related files in codebase
   - Link to external docs if relevant

8. **Maintenance:**
   - Add Changelog section
   - Date significant updates
   - Note breaking changes

**Delete this "Notes" section before publishing the guide!**
