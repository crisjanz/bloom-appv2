# Windows Receipt Print Agent (.NET)

**Status:** 🔜 Ready for Implementation
**Created:** 2026-01-18
**Priority:** High

---

## Overview

Create a native .NET 8 Windows system tray application for receipt printing on Windows POS machines. The Electron bloom-print-agent works well on Mac but has reliability issues on Windows for thermal printing. This dedicated Windows agent will use native Windows printing APIs for more reliable receipt printing to Star TSP143IIIU thermal printers.

**Problem:** Electron app doesn't work reliably on Windows for receipt printing
**Solution:** Native .NET 8 WinForms tray app with native Windows printing APIs

---

## 🤖 Implementation Constraints for AI

**CRITICAL - Read Before Implementing:**

> **⚠️ FOR AI ASSISTANTS: You MUST read the required documentation before writing code. Follow existing patterns exactly.**

### Required Reading (IN ORDER)
1. `/docs/AI_IMPLEMENTATION_GUIDE.md` ← **READ THIS FIRST** (WebSocket patterns, print job types)
2. `/docs/System_Reference.md` (print architecture context)
3. `/bloom-print-agent/README.md` (existing Electron agent patterns to mirror)
4. `/CLAUDE.md` (project conventions)

### Pattern Reference Files
**Study these files for implementation patterns:**
- **WebSocket protocol:** `/back/src/services/printService.ts` (backend WebSocket broadcast)
- **Print job structure:** `/bloom-print-agent/src/connection/websocket.ts` (message format)
- **Job filtering:** `/bloom-print-agent/src/job-processor.ts` (how agents filter jobs)

**DO NOT write from scratch. COPY WebSocket protocol and job structure from existing code.**

### Pre-Implementation Quiz (Answer Before Coding)

**Question 1: Print Job Filtering**
- How does the agent know which jobs to process?
- Answer: Filter by `agentType === 'receipt-agent' && type === 'RECEIPT'`

**Question 2: WebSocket Protocol**
- What message types does the agent handle?
- Answer: `PRINT_JOB`, `HEARTBEAT_ACK` (sends `ACK`, `JOB_STATUS`)

**Question 3: Configuration Storage**
- Where does the agent store its config on Windows?
- Answer: `%APPDATA%/ReceiptPrintAgent/config.json`

### Critical Don'ts
❌ Create custom WebSocket protocol → Copy existing protocol from Electron agent
❌ Use Electron/Node.js → Use .NET 8 native Windows APIs
❌ Implement HTML-to-PDF conversion → Backend sends ready-to-print template
❌ Skip reconnect logic → Implement WebSocket reconnection with exponential backoff
❌ Hardcode backend URL → Make configurable in settings

---

## Goals

1. **Reliable Windows thermal printing**: Native Windows printing APIs for Star TSP143IIIU reliability
2. **Seamless integration**: Uses existing backend WebSocket infrastructure with no backend changes needed
3. **User-friendly operation**: System tray app with settings UI, status indicators, and test printing
4. **Multiple copy support**: Print 1-3 receipt copies configurable via print settings

---

## Architecture & Integration

### System Architecture

```
Backend (PrintService)
    ↓ WebSocket wss://api.hellobloom.ca/print-agent
    ├─→ bloom-print-agent (Electron/Mac)
    │   └─→ Laser printer (ORDER_TICKET jobs only)
    │
    └─→ receipt-print-agent (.NET/Windows)  ← NEW
        └─→ Star TSP143IIIU (RECEIPT jobs only)
```

### WebSocket Message Format (existing protocol)

**From Backend to Agent:**
```json
{
  "type": "PRINT_JOB",
  "job": {
    "id": "uuid",
    "type": "RECEIPT",
    "agentType": "receipt-agent",
    "printerName": "Star TSP143IIIU",
    "printerTray": null,
    "copies": 2,
    "orderId": "uuid",
    "data": { /* order data */ },
    "template": "<html>...</html>",
    "priority": 0,
    "createdAt": "2026-01-18T..."
  }
}
```

**From Agent to Backend:**
```json
// Acknowledge receipt of job
{
  "type": "ACK",
  "jobId": "uuid"
}

// Report job status
{
  "type": "JOB_STATUS",
  "jobId": "uuid",
  "status": "COMPLETED", // or "FAILED"
  "agentId": "receipt-agent-windows-001",
  "errorMessage": null
}

// Heartbeat (every 30 seconds)
{
  "type": "HEARTBEAT",
  "agentId": "receipt-agent-windows-001",
  "timestamp": "2026-01-18T..."
}
```

### No Backend Changes Required

Existing `PrintService` already broadcasts to all connected WebSocket clients. The agent filters client-side:

```csharp
// Agent filtering logic
if (job.AgentType == "receipt-agent" && job.Type == "RECEIPT") {
    await ProcessReceiptJob(job);
}
// Ignore all other jobs
```

---

## Technology Stack

### Core Technologies
- **.NET 8** - Desktop framework
- **WinForms** - System tray and settings UI
- **ClientWebSocket** - WebSocket client (built-in to .NET)
- **System.Drawing.Printing** - Native Windows printing APIs
- **Newtonsoft.Json** or **System.Text.Json** - JSON serialization

### Project Structure
```
receipt-print-agent/
  ├── ReceiptPrintAgent.sln           // Visual Studio solution
  ├── ReceiptPrintAgent/
  │   ├── ReceiptPrintAgent.csproj    // Project file
  │   ├── Program.cs                  // Entry point
  │   ├── TrayApp.cs                  // System tray application
  │   ├── Connection/
  │   │   ├── WebSocketClient.cs      // WebSocket management
  │   │   └── MessageHandler.cs       // Handle incoming messages
  │   ├── Printing/
  │   │   ├── PrintManager.cs         // Print job processor
  │   │   └── ThermalPrinter.cs       // Thermal printer integration
  │   ├── Config/
  │   │   ├── ConfigManager.cs        // Load/save config
  │   │   └── AppConfig.cs            // Config model
  │   ├── Logging/
  │   │   └── Logger.cs               // File logging
  │   └── UI/
  │       ├── SettingsForm.cs         // Settings window
  │       └── LogViewerForm.cs        // Log viewer
  ├── README.md
  └── .gitignore
```

---

## Implementation Checklist

### Phase 1: Project Setup & Configuration
- [ ] Create .NET 8 WinForms solution at `/receipt-print-agent/`
- [ ] Add NuGet packages:
  - [ ] `Newtonsoft.Json` or `System.Text.Json`
  - [ ] `Microsoft.Extensions.Configuration`
  - [ ] `Microsoft.Extensions.Logging`
- [ ] Create `AppConfig.cs` model:
  - [ ] `BackendUrl` (default: `wss://api.hellobloom.ca/print-agent`)
  - [ ] `AgentId` (auto-generate on first run)
  - [ ] `PrinterName` (default: `Star TSP143IIIU`)
  - [ ] `EnableLogging`
- [ ] Create `ConfigManager.cs`:
  - [ ] Load from `%APPDATA%/ReceiptPrintAgent/config.json`
  - [ ] Save config changes
  - [ ] Auto-create default config on first run
- [ ] Create `Logger.cs`:
  - [ ] Write to `%APPDATA%/ReceiptPrintAgent/logs/agent.log`
  - [ ] Rotate logs daily
  - [ ] Max log file size: 10MB
- [ ] Create `.gitignore`:
  - [ ] `bin/`, `obj/`, `*.user`, `*.suo`, `.vs/`

### Phase 2: WebSocket Client
- [ ] Create `WebSocketClient.cs`:
  - [ ] Connect to `wss://api.hellobloom.ca/print-agent`
  - [ ] Implement reconnection logic with exponential backoff (1s, 2s, 4s, 8s, max 30s)
  - [ ] Send heartbeat every 30 seconds
  - [ ] Handle WebSocket close/error events
  - [ ] Expose `ConnectionStatus` event for UI updates
- [ ] Create `MessageHandler.cs`:
  - [ ] Parse incoming JSON messages
  - [ ] Handle `PRINT_JOB` message type
  - [ ] Handle `HEARTBEAT_ACK` (optional, backend doesn't send yet)
  - [ ] Validate message structure
  - [ ] Send `ACK` immediately upon receiving print job
- [ ] Test WebSocket connection:
  - [ ] Connect to backend successfully
  - [ ] Send/receive heartbeats
  - [ ] Handle disconnection and auto-reconnect

### Phase 3: Print Job Processing
- [ ] Create `PrintJob.cs` model:
  - [ ] Match backend structure (id, type, agentType, template, copies, etc.)
  - [ ] Deserialize from JSON
- [ ] Create `PrintManager.cs`:
  - [ ] Filter jobs: Only process if `agentType === "receipt-agent" && type === "RECEIPT"`
  - [ ] Queue jobs for processing (simple queue)
  - [ ] Process one job at a time
  - [ ] Send `JOB_STATUS` with `COMPLETED` or `FAILED`
- [ ] Create `ThermalPrinter.cs`:
  - [ ] List available printers using `PrinterSettings.InstalledPrinters`
  - [ ] Print HTML template to thermal printer
  - [ ] Use `System.Drawing.Printing.PrintDocument`
  - [ ] Render HTML (basic - use `WebBrowser` control for rendering)
  - [ ] Handle multiple copies (print N times)
  - [ ] Handle printer errors (offline, paper jam, etc.)
- [ ] Test receipt printing:
  - [ ] Print test receipt to Star TSP143IIIU
  - [ ] Verify multiple copies work
  - [ ] Handle printer offline gracefully

### Phase 4: System Tray UI
- [ ] Create `TrayApp.cs`:
  - [ ] Create system tray icon (use default icon or custom `.ico`)
  - [ ] Tray menu items:
    - [ ] **Connection Status** (● Connected / ● Disconnected) - disabled menu item showing status
    - [ ] **Open Settings** - opens settings form
    - [ ] **Test Print** - prints test receipt
    - [ ] **View Logs** - opens log viewer
    - [ ] **Quit** - exits application
  - [ ] Update connection status indicator in real-time
  - [ ] Show balloon notifications for important events (connected, print job completed/failed)
  - [ ] Auto-start with Windows (add registry key or startup folder shortcut)
- [ ] Create `SettingsForm.cs`:
  - [ ] Backend URL input (text box)
  - [ ] Agent ID display (read-only, auto-generated)
  - [ ] Printer selection dropdown (list of installed printers)
  - [ ] Enable logging checkbox
  - [ ] Test print button
  - [ ] Save button
  - [ ] Cancel button
- [ ] Create `LogViewerForm.cs`:
  - [ ] Display recent logs in scrollable text box
  - [ ] Refresh button
  - [ ] Clear logs button
  - [ ] Open log file location button
- [ ] Test tray app:
  - [ ] Verify tray icon appears
  - [ ] Test all menu items
  - [ ] Verify settings persist
  - [ ] Test auto-start on Windows boot

### Phase 5: Integration Testing
- [ ] Test full workflow:
  - [ ] Create order in POS with receipt printing enabled
  - [ ] Backend sends print job via WebSocket
  - [ ] Agent receives and processes job
  - [ ] Receipt prints successfully
  - [ ] Agent reports status back to backend
- [ ] Test edge cases:
  - [ ] Printer offline → Agent reports FAILED status
  - [ ] Network disconnection → Agent reconnects automatically
  - [ ] Invalid JSON message → Agent logs error and continues
  - [ ] Multiple concurrent jobs → Agent queues and processes sequentially
- [ ] Test settings:
  - [ ] Change backend URL → Agent reconnects to new URL
  - [ ] Change printer → Subsequent jobs print to new printer
  - [ ] Enable/disable logging → Logs start/stop accordingly
- [ ] Test multiple copies:
  - [ ] Configure 2 copies in print settings
  - [ ] Verify 2 receipts print
  - [ ] Verify 3 copies work

### Phase 6: Packaging & Deployment
- [ ] Create Windows installer:
  - [ ] Use ClickOnce deployment or WiX Toolset
  - [ ] Install to `C:\Program Files\Bloom\ReceiptPrintAgent\`
  - [ ] Create desktop shortcut
  - [ ] Add to startup automatically
  - [ ] Uninstaller included
- [ ] Create README.md:
  - [ ] Installation instructions
  - [ ] Configuration guide
  - [ ] Troubleshooting section
  - [ ] System requirements (.NET 8 Runtime)
- [ ] Test installer:
  - [ ] Install on clean Windows 11 machine
  - [ ] Verify app starts automatically
  - [ ] Verify settings persist across restarts
  - [ ] Verify uninstall works cleanly

### Phase 7: Documentation
- [ ] Update `/docs/API_Endpoints.md` (WebSocket protocol already documented, no changes needed)
- [ ] Update `/docs/Progress_Tracker.markdown` (mark as completed)
- [ ] Archive this feature plan
- [ ] Create user guide for Windows agent

---

## Data Flow

### Receipt Print Flow

```
User completes POS sale
  → Backend creates RECEIPT print job
  → Backend checks PrintSettings (destination = 'receipt-agent', copies = 2)
  → Backend creates PrintJob with agentType='receipt-agent', copies=2
  → Backend broadcasts via WebSocket to all connected agents

Windows Receipt Agent:
  → Receives PRINT_JOB message
  → Filters: agentType=='receipt-agent' && type=='RECEIPT' → MATCH
  → Sends ACK to backend
  → Queues job for printing
  → Renders HTML template
  → Prints to Star TSP143IIIU (2 copies)
  → Sends JOB_STATUS with status='COMPLETED'

Electron Agent:
  → Receives PRINT_JOB message
  → Filters: agentType=='receipt-agent' → NO MATCH
  → Ignores job
```

### Settings Update Flow

```
User opens Settings
  → Load config from %APPDATA%/ReceiptPrintAgent/config.json
  → Display in SettingsForm

User changes printer to "Star TSP143IIIU Copy 2"
  → Save to config.json
  → Restart WebSocket connection (if backend URL changed)

User clicks Test Print
  → Create test PrintJob
  → Render test HTML
  → Print to selected printer
  → Show success/error notification
```

---

## Edge Cases & Validation

### WebSocket Connection
- **Backend offline**: Agent shows "Disconnected", retries every 30s
- **Connection drops mid-job**: Agent buffers job, sends status when reconnected
- **Invalid WebSocket URL**: Settings form validates URL format before saving
- **SSL certificate errors**: Log error, show notification to user

### Print Job Processing
- **Printer offline**: Report JOB_STATUS as FAILED with error message "Printer offline"
- **Printer out of paper**: Report FAILED with "Out of paper"
- **Invalid HTML template**: Log error, report FAILED
- **Multiple jobs at once**: Queue jobs, process one at a time sequentially
- **No printer selected in settings**: Use default printer or show error

### Configuration
- **Missing config file**: Auto-create default config on first run
- **Corrupt config JSON**: Delete and recreate default config
- **Invalid backend URL**: Show validation error in settings form
- **Printer not found**: Show warning, allow user to select different printer

### Logging
- **Log file too large**: Rotate logs when exceeding 10MB
- **Disk full**: Stop logging, show notification
- **No write permission**: Log to temp folder instead

---

## Files to Create

### New Files
```
/receipt-print-agent/ReceiptPrintAgent.sln               (~50 lines)
/receipt-print-agent/ReceiptPrintAgent/ReceiptPrintAgent.csproj (~100 lines)
/receipt-print-agent/ReceiptPrintAgent/Program.cs         (~50 lines)
/receipt-print-agent/ReceiptPrintAgent/TrayApp.cs         (~200 lines)
/receipt-print-agent/ReceiptPrintAgent/Connection/WebSocketClient.cs  (~250 lines)
/receipt-print-agent/ReceiptPrintAgent/Connection/MessageHandler.cs   (~150 lines)
/receipt-print-agent/ReceiptPrintAgent/Printing/PrintManager.cs       (~200 lines)
/receipt-print-agent/ReceiptPrintAgent/Printing/ThermalPrinter.cs     (~150 lines)
/receipt-print-agent/ReceiptPrintAgent/Config/ConfigManager.cs        (~100 lines)
/receipt-print-agent/ReceiptPrintAgent/Config/AppConfig.cs            (~50 lines)
/receipt-print-agent/ReceiptPrintAgent/Logging/Logger.cs              (~100 lines)
/receipt-print-agent/ReceiptPrintAgent/UI/SettingsForm.cs             (~300 lines)
/receipt-print-agent/ReceiptPrintAgent/UI/LogViewerForm.cs            (~150 lines)
/receipt-print-agent/README.md                           (~200 lines)
/receipt-print-agent/.gitignore                          (~20 lines)
```

### Modified Files
```
/docs/Progress_Tracker.markdown    (mark as completed)
```

**Total:** ~1,900 lines of C# code + README + config files

---

## Success Criteria

- [ ] Agent connects to backend WebSocket successfully
- [ ] Agent receives print jobs in real-time
- [ ] Agent filters jobs correctly (only processes receipt-agent jobs)
- [ ] Receipts print reliably to Star TSP143IIIU thermal printer
- [ ] Multiple copies work (1-3 configurable)
- [ ] Agent reports job status back to backend
- [ ] Agent reconnects automatically after network interruption
- [ ] System tray icon shows connection status
- [ ] Settings UI allows configuration of backend URL and printer
- [ ] Test print works from settings UI
- [ ] Logs written to %APPDATA%/ReceiptPrintAgent/logs/agent.log
- [ ] Agent auto-starts with Windows
- [ ] Installer works on Windows 11
- [ ] No errors in logs during normal operation
- [ ] Documentation updated

---

## Implementation Notes

**Estimated Effort:** 2-3 days

**Dependencies:**
- **Backend**: PrintService with WebSocket already exists (no changes needed)
- **Print Settings**: Requires Print Settings System to be implemented first (agentType field in print jobs)
- **.NET 8 Runtime**: Must be installed on Windows POS machine

**Testing Strategy:**
1. **Unit testing**: Test individual components (ConfigManager, WebSocketClient, PrintManager)
2. **Integration testing**: Test full flow from backend to print output
3. **Manual testing**: Install on Windows POS machine with Star TSP143IIIU
4. **Stress testing**: Send 10+ jobs rapidly, verify all print successfully
5. **Network testing**: Disconnect network, verify reconnection works

**Deployment Notes:**
- No backend deployment needed (uses existing WebSocket infrastructure)
- Windows agent installer distributed manually to POS machines
- Requires .NET 8 Desktop Runtime on Windows machines
- Auto-updates not required initially (manual updates)

---

## Post-Implementation

After completing implementation:

1. **Verify:**
   - All success criteria met
   - Agent works reliably on Windows 11
   - Receipts print correctly to Star TSP143IIIU
   - Documentation complete

2. **Update:**
   - Mark feature as ✅ Completed in Progress_Tracker
   - Archive this feature plan

3. **Deploy:**
   - Build installer for Windows
   - Install on POS machine
   - Test with real orders
   - Train staff on settings/troubleshooting

---

## Future Enhancements (Out of Scope)

- Auto-update functionality
- Remote management/monitoring dashboard
- Support for other thermal printer brands
- Receipt template customization UI
- Print job history viewer in agent
- Network printer support (currently USB only)

---

## Technical Reference

### WebSocket Connection Example

```csharp
using System.Net.WebSockets;

public class WebSocketClient
{
    private ClientWebSocket _ws;
    private readonly string _backendUrl;
    private CancellationTokenSource _cts;

    public event EventHandler<ConnectionStatus> ConnectionStatusChanged;

    public async Task ConnectAsync()
    {
        _cts = new CancellationTokenSource();
        _ws = new ClientWebSocket();

        try
        {
            await _ws.ConnectAsync(new Uri(_backendUrl), _cts.Token);
            ConnectionStatusChanged?.Invoke(this, ConnectionStatus.Connected);
            await ListenForMessages();
        }
        catch (Exception ex)
        {
            Logger.Error($"Connection failed: {ex.Message}");
            ConnectionStatusChanged?.Invoke(this, ConnectionStatus.Disconnected);
            await RetryConnection();
        }
    }

    private async Task ListenForMessages()
    {
        var buffer = new byte[1024 * 4];

        while (_ws.State == WebSocketState.Open)
        {
            var result = await _ws.ReceiveAsync(
                new ArraySegment<byte>(buffer),
                _cts.Token
            );

            if (result.MessageType == WebSocketMessageType.Text)
            {
                var json = Encoding.UTF8.GetString(buffer, 0, result.Count);
                await MessageHandler.HandleMessage(json);
            }
        }
    }

    public async Task SendAsync(string message)
    {
        var bytes = Encoding.UTF8.GetBytes(message);
        await _ws.SendAsync(
            new ArraySegment<byte>(bytes),
            WebSocketMessageType.Text,
            true,
            _cts.Token
        );
    }
}
```

### Thermal Printer Integration Example

```csharp
using System.Drawing.Printing;

public class ThermalPrinter
{
    private readonly string _printerName;

    public void Print(string htmlContent, int copies)
    {
        var doc = new PrintDocument();
        doc.PrinterSettings.PrinterName = _printerName;
        doc.PrinterSettings.Copies = (short)copies;

        // Render HTML to image
        var bitmap = RenderHtmlToBitmap(htmlContent);

        doc.PrintPage += (sender, e) =>
        {
            e.Graphics.DrawImage(bitmap, 0, 0);
        };

        doc.Print();
    }

    private Bitmap RenderHtmlToBitmap(string html)
    {
        // Use WebBrowser control to render HTML
        using var browser = new WebBrowser();
        browser.DocumentText = html;
        browser.Document.Window.DOMContentLoaded += (s, e) =>
        {
            var width = browser.Document.Body.ScrollRectangle.Width;
            var height = browser.Document.Body.ScrollRectangle.Height;
            browser.Width = width;
            browser.Height = height;
        };

        // Render to bitmap
        var bitmap = new Bitmap(browser.Width, browser.Height);
        browser.DrawToBitmap(bitmap, new Rectangle(0, 0, browser.Width, browser.Height));
        return bitmap;
    }
}
```

### Config File Example

```json
{
  "backendUrl": "wss://api.hellobloom.ca/print-agent",
  "agentId": "receipt-agent-windows-001",
  "printerName": "Star TSP143IIIU",
  "enableLogging": true,
  "version": "1.0.0"
}
```
