using System.Diagnostics;
using System.Drawing;
using ReceiptPrintAgent.Logging;

namespace ReceiptPrintAgent.UI;

public class LogViewerForm : Form
{
    private readonly Logger _logger;
    private readonly string _logDirectory;
    private readonly TextBox _logBox;

    public LogViewerForm(Logger logger, string logDirectory)
    {
        _logger = logger;
        _logDirectory = logDirectory;

        Text = "Receipt Print Agent Logs";
        Width = 700;
        Height = 500;
        StartPosition = FormStartPosition.CenterScreen;

        var layout = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            ColumnCount = 1,
            RowCount = 2
        };

        layout.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 48));

        _logBox = new TextBox
        {
            Multiline = true,
            ReadOnly = true,
            Dock = DockStyle.Fill,
            ScrollBars = ScrollBars.Vertical,
            Font = new Font("Consolas", 9)
        };

        var buttonPanel = new FlowLayoutPanel
        {
            Dock = DockStyle.Fill,
            FlowDirection = FlowDirection.RightToLeft
        };

        var refreshButton = new Button { Text = "Refresh", Width = 90 };
        var clearButton = new Button { Text = "Clear Logs", Width = 90 };
        var openButton = new Button { Text = "Open Folder", Width = 100 };

        refreshButton.Click += (_, _) => LoadLogs();
        clearButton.Click += (_, _) => ClearLogs();
        openButton.Click += (_, _) => OpenFolder();

        buttonPanel.Controls.Add(refreshButton);
        buttonPanel.Controls.Add(clearButton);
        buttonPanel.Controls.Add(openButton);

        layout.Controls.Add(_logBox, 0, 0);
        layout.Controls.Add(buttonPanel, 0, 1);

        Controls.Add(layout);

        LoadLogs();
    }

    private void LoadLogs()
    {
        try
        {
            var path = _logger.GetCurrentLogPath();
            if (!File.Exists(path))
            {
                _logBox.Text = "No logs yet.";
                return;
            }

            _logBox.Text = File.ReadAllText(path);
        }
        catch (Exception ex)
        {
            _logBox.Text = $"Failed to load logs: {ex.Message}";
        }
    }

    private void ClearLogs()
    {
        _logger.ClearCurrentLog();
        LoadLogs();
    }

    private void OpenFolder()
    {
        try
        {
            Directory.CreateDirectory(_logDirectory);
            Process.Start(new ProcessStartInfo
            {
                FileName = _logDirectory,
                UseShellExecute = true
            });
        }
        catch
        {
            // Ignore open folder errors
        }
    }
}
