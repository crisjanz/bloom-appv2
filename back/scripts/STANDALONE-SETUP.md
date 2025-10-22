# Standalone FTD Token Refresh - Setup for Office Mac

This is a **standalone script** that works WITHOUT cloning the entire bloom-app repo.

Perfect for your office Mac!

---

## 📦 What to Copy

You only need **2 files** from this repo:

1. `standalone-ftd-refresh.js` - The script
2. `standalone-package.json` - Dependencies list

---

## 🚀 Setup on Office Mac (5 Minutes)

### **Step 1: Create a folder**

```bash
mkdir ~/ftd-refresh
cd ~/ftd-refresh
```

### **Step 2: Copy the files**

**Option A - Copy via AirDrop/USB:**
- Copy `standalone-ftd-refresh.js` and `standalone-package.json` to the folder

**Option B - Download from GitHub:**
```bash
# Download the script
curl -o standalone-ftd-refresh.js https://raw.githubusercontent.com/crisjanz/bloom-appv2/main/back/scripts/standalone-ftd-refresh.js

# Download package.json
curl -o package.json https://raw.githubusercontent.com/crisjanz/bloom-appv2/main/back/scripts/standalone-package.json
```

**Option C - Copy/paste:**
- Open the files in VS Code on your current Mac
- Copy the contents
- Paste into new files on office Mac

### **Step 3: Install dependencies**

```bash
npm install
```

This installs only 2 packages:
- `puppeteer` (~300MB - includes Chrome)
- `pg` (~1MB - PostgreSQL client)

### **Step 4: Set environment variable**

```bash
# Open shell config
nano ~/.zshrc

# Add this line (get URL from Render dashboard):
export PROD_DATABASE_URL="postgresql://bloom_user:PASSWORD@dpg-xxxxx.oregon-postgres.render.com/bloom_db_imh1"

# Save and reload
source ~/.zshrc
```

### **Step 5: Make it easy to run**

```bash
# Make executable
chmod +x standalone-ftd-refresh.js

# Create alias (optional)
echo 'alias refresh-ftd="cd ~/ftd-refresh && node standalone-ftd-refresh.js"' >> ~/.zshrc
source ~/.zshrc
```

---

## 🎯 How to Use

### **Option 1: From folder**
```bash
cd ~/ftd-refresh
node standalone-ftd-refresh.js
```

### **Option 2: With alias** (if you set it up)
```bash
refresh-ftd
```

### **Option 3: Double-click launcher**

Create a `.command` file:

```bash
# In ~/ftd-refresh folder:
cat > "Refresh FTD Token.command" << 'EOF'
#!/bin/bash
cd ~/ftd-refresh
node standalone-ftd-refresh.js
echo ""
echo "Press any key to close..."
read -n 1
EOF

chmod +x "Refresh FTD Token.command"
```

Now you can double-click `Refresh FTD Token.command` in Finder!

---

## 📁 Folder Structure

Your office Mac will have:
```
~/ftd-refresh/
├── standalone-ftd-refresh.js    (the script)
├── package.json                 (dependencies)
├── node_modules/                (installed automatically)
└── Refresh FTD Token.command    (optional - double-click launcher)
```

**Total size:** ~320MB (mostly Puppeteer's bundled Chrome)

---

## 🔄 Updating the Script

If I update the script, just replace `standalone-ftd-refresh.js`:

```bash
cd ~/ftd-refresh
# Copy the new version or re-download
curl -o standalone-ftd-refresh.js https://raw.githubusercontent.com/crisjanz/bloom-appv2/main/back/scripts/standalone-ftd-refresh.js
```

Dependencies stay the same, no need to reinstall.

---

## ✅ Benefits

- ✅ No full repo needed (~50MB vs ~500MB)
- ✅ Doesn't interfere with local development
- ✅ Can update script independently
- ✅ Same on all your Macs (home, office, laptop)
- ✅ Easy to share with employees

---

## 🔐 Security

Each Mac needs its own `PROD_DATABASE_URL` environment variable.
The script itself is safe to share - no credentials inside.

---

## 💡 Pro Tip

Keep the folder in your home directory (`~/ftd-refresh`) so it's easy to find.
Bookmark it in Finder for quick access.

---

**Questions?** Just run the script - it has helpful error messages!
