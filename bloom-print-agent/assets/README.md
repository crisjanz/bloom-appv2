# Assets Directory

This directory contains icons and images for the Bloom Print Agent app.

## Required Icons

### Tray Icon
- **File:** `tray-icon.png`
- **Size:** 16x16 or 32x32 pixels
- **Format:** PNG with transparency
- **Usage:** System tray icon (will be visible in menu bar/taskbar)

### App Icon
- **File:** `icon.png` (development)
- **File:** `icon.ico` (Windows build)
- **File:** `icon.icns` (Mac build)
- **Size:** Multiple sizes (16, 32, 64, 128, 256, 512, 1024)
- **Usage:** Application icon

## Placeholder Icons

Until proper icons are created, the app will use default system icons or fail gracefully.

## Creating Icons

You can create icons using:
- **Mac:** `iconutil` or Preview.app
- **Windows:** Any ICO converter tool
- **Cross-platform:** `electron-icon-builder` package

### Quick Icon Generation

```bash
# Install icon builder
npm install --save-dev electron-icon-builder

# Generate from a single PNG (512x512 or larger)
npx electron-icon-builder --input=icon-source.png --output=assets/
```

This will generate all required icon formats automatically.
