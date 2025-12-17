# Bloom Print Agent

Electron desktop application for remote auto-printing from Bloom POS. Runs on Windows 11 Pro and connects to cloud-hosted backend to receive and print orders automatically.

## Features

- ✅ **System Tray App** - Runs in background with status indicator
- ✅ **Settings UI** - Easy printer selection and configuration
- ✅ **WebSocket Connection** - Real-time print job delivery
- ✅ **HTTP Polling Fallback** - Automatic fallback when WebSocket unavailable
- ✅ **Printer Detection** - Automatically finds all system printers
- ✅ **Dual Printer Support** - Thermal (receipts) + Laser (tickets)
- ✅ **Job History** - View recent print jobs
- ✅ **Test Print** - Verify printer connectivity
- ⏳ **Order Ticket Template** - Custom PDF layout (coming soon)

## Development

### Run on Mac (Development)

```bash
npm install
npm start
```

The app will:
- Show settings window immediately
- List all Mac printers
- Try to connect to backend (will show "Disconnected" until backend ready)
- Allow test prints

### Build Windows Installer

```bash
npm run build:win
```

Output: `release/Bloom Print Agent Setup 1.0.0.exe`

Transfer this file to Windows PC and run to install.

### Build Mac Installer (for testing)

```bash
npm run build:mac
```

Output: `release/Bloom Print Agent-1.0.0.dmg`

## Usage

### First-Time Setup

1. **Install on Windows PC** - Run the installer
2. **App starts automatically** - Check system tray for icon
3. **Open Settings** - Right-click tray icon → "Open Settings"
4. **Select Printers:**
   - **Thermal Printer**: Star TSP143IIIU (for receipts)
   - **Laser Printer**: HP LaserJet M402N (for order tickets)
5. **Test Print** - Click "Test Print" buttons to verify
6. **Save Settings**

### Normal Operation

- App runs in system tray
- Connection status shown in tray menu
- Automatically prints when orders placed (from any device)
- View recent jobs in settings window

### Connection Status

- **● Connected** (Green) - WebSocket connected to backend
- **⟳ Reconnecting** (Orange) - Attempting to reconnect
- **● Disconnected** (Red) - Not connected (using polling fallback)

## Configuration

Settings stored in: `%APPDATA%\bloom-print-agent\config.json`

Default backend: `https://api.hellobloom.ca`

## Print Job Types

### 1. Receipt (Thermal)
- **Trigger**: In-person POS sales
- **Printer**: Star TSP143IIIU
- **Format**: 58mm thermal receipt
- **Content**: Order items, prices, total

### 2. Order Ticket (Laser)
- **Trigger**: Delivery orders
- **Printer**: HP LaserJet M402N (Tray 1 - ticket paper)
- **Format**: 4x6" ticket with tear-off sections
- **Content**:
  - Left: Shop records + driver slip
  - Right: Card message + logo + recipient address (folds into gift tag)
  - Driver slip: includes QR code linking to the driver route view (scan to open route/order page)

### 3. Report (Laser)
- **Trigger**: Manual (future)
- **Printer**: HP LaserJet M402N (Tray 2 - regular paper)
- **Format**: 8.5x11" report

## Architecture

```
Cloud Backend (Render)
    ↓ WebSocket/HTTP
Windows Print Agent
    ↓ USB
Star TSP143IIIU (Thermal)

Windows Print Agent
    ↓ Network
HP LaserJet M402N (Laser)
```

### Connection Flow

1. Agent connects to `wss://api.hellobloom.ca/print-agent`
2. Sends heartbeat every 30 seconds
3. Receives print jobs via WebSocket
4. Falls back to HTTP polling if WebSocket fails
5. Processes job and prints to correct printer
6. Reports status back to backend (COMPLETED/FAILED)

## Logging

Logs written to: `bloom-print-agent.log`

View logs:
- Settings window → "View Logs" button
- Or open log file directly in install directory

## Troubleshooting

### App not starting
- Check Task Manager for "Bloom Print Agent"
- Check log file for errors
- Reinstall if needed

### Printer not listed
- Ensure printer is installed in Windows
- Restart app
- Check printer is online

### Connection issues
- Check internet connection
- Verify backend URL in settings
- Check firewall settings (allow WSS connections)
- HTTP polling will continue even if WebSocket fails

### Print job not printing
- Check printer selected in settings
- Try "Test Print" to verify connectivity
- Check printer has paper/toner
- View "Recent Jobs" for error messages
- Check log file for details

## Development Notes

### Technology Stack
- **Electron** - Desktop app framework
- **TypeScript** - Type-safe JavaScript
- **WebSocket** (`ws`) - Real-time communication
- **Axios** - HTTP polling fallback
- **electron-store** - Persistent settings
- **Winston** - Logging

### Project Structure
```
src/
  ├── main.ts                 // Main process
  ├── preload.ts              // IPC bridge
  ├── tray.ts                 // System tray
  ├── job-processor.ts        // Print job handling
  └── connection/
      ├── websocket.ts        // WebSocket manager
      ├── polling.ts          // HTTP polling
      └── manager.ts          // Hybrid coordinator

renderer/
  ├── index.html              // Settings UI
  ├── styles.css              // UI styling
  └── app.js                  // UI logic
```

### Adding Features

To add new print job types or templates:

1. Update `PrintJobType` enum in `src/connection/websocket.ts`
2. Add handler in `src/job-processor.ts`
3. Create template generator function
4. Update backend to send new job type

## License

MIT - Copyright (c) 2025 Bloom Flowers
