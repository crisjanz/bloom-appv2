# Windows Receipt Print Agent Setup

This guide covers building and running the Receipt Print Agent on a Windows POS machine.

## Option A: Build on Windows (recommended)

### 1) Install .NET 8 Desktop Runtime (or SDK)
- Install .NET 8 Desktop Runtime (for running) or .NET 8 SDK (for building).
- Download from: https://dotnet.microsoft.com/en-us/download/dotnet/8.0

### 2) Copy source to Windows
- Copy the `receipt-print-agent/` folder to the Windows machine.
  - Example: `C:\Users\YourUser\Desktop\receipt-print-agent\`

### 3) Build (framework-dependent)
```bash
cd C:\Users\YourUser\Desktop\receipt-print-agent

dotnet build ReceiptPrintAgent.sln -c Release
```

### 4) Run
```bash
cd ReceiptPrintAgent\bin\Release\net8.0-windows
ReceiptPrintAgent.exe
```

The app runs in the system tray.

## Option B: Publish a self-contained build (no runtime dependency)

This creates a larger folder but does not require installing .NET runtime on Windows.

```bash
cd C:\Users\YourUser\Desktop\receipt-print-agent

dotnet publish ReceiptPrintAgent\ReceiptPrintAgent.csproj -c Release -r win-x64 --self-contained true
```

Run from:
`ReceiptPrintAgent\bin\Release\net8.0-windows\win-x64\publish\ReceiptPrintAgent.exe`

## Configuration

The agent stores config here:
`%APPDATA%\ReceiptPrintAgent\config.json`

Default values:
- `BackendUrl`: `wss://api.hellobloom.ca/print-agent`
- `AgentId`: auto-generated
- `PrinterName`: `Star TSP143IIIU`
- `EnableLogging`: `true`
- `AutoStart`: `true`

Use the tray menu:
- Open Settings
- Select your printer
- Update backend URL if needed
- Save

## Required Backend Settings

In Admin → Settings → Print:
- Receipts destination must be `receipt-agent`
- Printer name should match the Windows printer name (optional override)

## Logs

Logs are saved at:
`%APPDATA%\ReceiptPrintAgent\logs\agent-YYYY-MM-DD.log`

## Troubleshooting

- Not connecting:
  - Check backend URL and firewall.
  - Verify the backend is reachable and `wss://` is allowed.

- Printer not found:
  - Install the Star driver and verify Windows sees the printer.
  - Restart the agent after installing drivers.

- Print fails:
  - Confirm print settings destination = `receipt-agent`.
  - Check logs for errors.

- Auto-start not working:
  - Open Settings and toggle “Start with Windows”.
  - Ensure you have permissions to write HKCU Run key.
