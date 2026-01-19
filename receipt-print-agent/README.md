# Receipt Print Agent (Windows)

Native Windows tray app for printing receipt jobs to Star thermal printers.

## Requirements
- Windows 10/11
- .NET 8 Desktop Runtime
- Star TSP143IIIU driver installed (or any supported thermal printer)

## Build
```
cd receipt-print-agent

dotnet build ReceiptPrintAgent.sln
```

## Run
```
cd receipt-print-agent/ReceiptPrintAgent/bin/Debug/net8.0-windows
ReceiptPrintAgent.exe
```

## Configuration
Config file is stored at:
`%APPDATA%\ReceiptPrintAgent\config.json`

Default values:
- BackendUrl: `wss://api.hellobloom.ca/print-agent`
- AgentId: auto-generated
- PrinterName: `Star TSP143IIIU`
- EnableLogging: `true`
- AutoStart: `true`

## Logs
Logs are stored at:
`%APPDATA%\ReceiptPrintAgent\logs\agent-YYYY-MM-DD.log`

## Usage
- Tray icon shows connection status.
- Open Settings to change backend URL or printer.
- Test Print sends a sample receipt to the selected printer.
- View Logs opens the current log file.

## Troubleshooting
- If status is Disconnected, verify backend URL and network access.
- If prints fail, confirm the printer is installed and online.
- Check logs for printer errors or WebSocket failures.
