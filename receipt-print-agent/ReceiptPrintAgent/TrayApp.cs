using System.Drawing;
using ReceiptPrintAgent.Config;
using ReceiptPrintAgent.Connection;
using ReceiptPrintAgent.Logging;
using ReceiptPrintAgent.Printing;
using ReceiptPrintAgent.UI;

namespace ReceiptPrintAgent;

public class TrayApp : ApplicationContext
{
    private readonly ConfigManager _configManager;
    private readonly WebSocketClient _webSocketClient;
    private readonly PrintManager _printManager;
    private readonly Logger _logger;
    private readonly NotifyIcon _notifyIcon;
    private readonly ToolStripMenuItem _statusItem;
    private SettingsForm? _settingsForm;
    private LogViewerForm? _logViewerForm;

    public TrayApp(
        ConfigManager configManager,
        WebSocketClient webSocketClient,
        PrintManager printManager,
        Logger logger)
    {
        _configManager = configManager;
        _webSocketClient = webSocketClient;
        _printManager = printManager;
        _logger = logger;

        _statusItem = new ToolStripMenuItem("Status: Disconnected") { Enabled = false };

        var contextMenu = new ContextMenuStrip();
        contextMenu.Items.Add(_statusItem);
        contextMenu.Items.Add(new ToolStripSeparator());
        contextMenu.Items.Add(new ToolStripMenuItem("Open Settings", null, (_, _) => OpenSettings()));
        contextMenu.Items.Add(new ToolStripMenuItem("Test Print", null, async (_, _) => await TestPrintAsync()));
        contextMenu.Items.Add(new ToolStripMenuItem("View Logs", null, (_, _) => OpenLogs()));
        contextMenu.Items.Add(new ToolStripSeparator());
        contextMenu.Items.Add(new ToolStripMenuItem("Quit", null, (_, _) => ExitApplication()));

        _notifyIcon = new NotifyIcon
        {
            Icon = SystemIcons.Application,
            ContextMenuStrip = contextMenu,
            Text = "Receipt Print Agent",
            Visible = true
        };

        _webSocketClient.ConnectionStatusChanged += (_, status) => UpdateStatus(status);
        _printManager.JobStatusReported += OnJobStatus;
    }

    private void UpdateStatus(ConnectionStatus status)
    {
        var text = status switch
        {
            ConnectionStatus.Connected => "Status: Connected",
            ConnectionStatus.Connecting => "Status: Connecting",
            _ => "Status: Disconnected"
        };

        _statusItem.Text = text;

        if (status == ConnectionStatus.Connected)
        {
            ShowBalloon("Receipt Print Agent", "Connected to backend.");
        }
        else if (status == ConnectionStatus.Disconnected)
        {
            ShowBalloon("Receipt Print Agent", "Disconnected from backend.");
        }
    }

    private void OnJobStatus(string jobId, string status, string? error)
    {
        if (status == "COMPLETED")
        {
            ShowBalloon("Receipt Print Agent", $"Print job {jobId} completed.");
        }
        else
        {
            ShowBalloon("Receipt Print Agent", $"Print job {jobId} failed: {error}");
        }
    }

    private void OpenSettings()
    {
        if (_settingsForm != null && !_settingsForm.IsDisposed)
        {
            _settingsForm.Focus();
            return;
        }

        var printers = _printManager.GetInstalledPrinters();
        _settingsForm = new SettingsForm(_configManager.Current, printers, async (updated) =>
        {
            _configManager.Save(updated);
            await Task.CompletedTask;
        }, async (printerName) =>
        {
            await _printManager.PrintTestAsync(printerName);
        });

        _settingsForm.Show();
    }

    private void OpenLogs()
    {
        if (_logViewerForm != null && !_logViewerForm.IsDisposed)
        {
            _logViewerForm.Focus();
            return;
        }

        _logViewerForm = new LogViewerForm(_logger, _configManager.LogDirectory);
        _logViewerForm.Show();
    }

    private async Task TestPrintAsync()
    {
        try
        {
            await _printManager.PrintTestAsync(_configManager.Current.PrinterName);
            ShowBalloon("Receipt Print Agent", "Test print sent.");
        }
        catch (Exception ex)
        {
            _logger.Error($"Test print failed: {ex.Message}");
            ShowBalloon("Receipt Print Agent", "Test print failed. Check logs for details.");
        }
    }

    private void ExitApplication()
    {
        _notifyIcon.Visible = false;
        _notifyIcon.Dispose();
        Application.Exit();
    }

    private void ShowBalloon(string title, string message)
    {
        _notifyIcon.ShowBalloonTip(3000, title, message, ToolTipIcon.Info);
    }
}
