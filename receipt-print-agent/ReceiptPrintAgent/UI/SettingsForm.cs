using System.Drawing;
using ReceiptPrintAgent.Config;

namespace ReceiptPrintAgent.UI;

public class SettingsForm : Form
{
    private readonly TextBox _backendUrlInput;
    private readonly TextBox _agentIdInput;
    private readonly ComboBox _printerSelect;
    private readonly CheckBox _loggingCheckbox;
    private readonly CheckBox _autoStartCheckbox;
    private readonly Button _saveButton;
    private readonly Button _cancelButton;
    private readonly Button _testButton;

    private readonly AppConfig _config;
    private readonly Func<AppConfig, Task> _onSave;
    private readonly Func<string, Task> _onTestPrint;

    public SettingsForm(
        AppConfig config,
        List<string> printers,
        Func<AppConfig, Task> onSave,
        Func<string, Task> onTestPrint)
    {
        _config = config;
        _onSave = onSave;
        _onTestPrint = onTestPrint;

        Text = "Receipt Print Agent Settings";
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false;
        MinimizeBox = false;
        StartPosition = FormStartPosition.CenterScreen;
        Width = 520;
        Height = 320;

        var layout = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            ColumnCount = 2,
            RowCount = 6,
            Padding = new Padding(12),
            AutoSize = true
        };

        layout.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 35));
        layout.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 65));

        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 32));
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 32));
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 32));
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 32));
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 32));
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 48));

        _backendUrlInput = new TextBox { Text = _config.BackendUrl, Dock = DockStyle.Fill };
        _agentIdInput = new TextBox { Text = _config.AgentId, Dock = DockStyle.Fill, ReadOnly = true };
        _printerSelect = new ComboBox { Dock = DockStyle.Fill, DropDownStyle = ComboBoxStyle.DropDownList };
        _loggingCheckbox = new CheckBox { Text = "Enable Logging", Checked = _config.EnableLogging, Dock = DockStyle.Fill };
        _autoStartCheckbox = new CheckBox { Text = "Start with Windows", Checked = _config.AutoStart, Dock = DockStyle.Fill };

        foreach (var printer in printers)
        {
            _printerSelect.Items.Add(printer);
        }

        if (printers.Count == 0)
        {
            _printerSelect.Items.Add("(No printers found)");
        }

        _printerSelect.SelectedItem = printers.FirstOrDefault(p => p == _config.PrinterName)
            ?? printers.FirstOrDefault()
            ?? "(No printers found)";

        layout.Controls.Add(new Label { Text = "Backend URL", TextAlign = ContentAlignment.MiddleLeft }, 0, 0);
        layout.Controls.Add(_backendUrlInput, 1, 0);

        layout.Controls.Add(new Label { Text = "Agent ID", TextAlign = ContentAlignment.MiddleLeft }, 0, 1);
        layout.Controls.Add(_agentIdInput, 1, 1);

        layout.Controls.Add(new Label { Text = "Printer", TextAlign = ContentAlignment.MiddleLeft }, 0, 2);
        layout.Controls.Add(_printerSelect, 1, 2);

        layout.Controls.Add(new Label { Text = "Logging", TextAlign = ContentAlignment.MiddleLeft }, 0, 3);
        layout.Controls.Add(_loggingCheckbox, 1, 3);

        layout.Controls.Add(new Label { Text = "Auto Start", TextAlign = ContentAlignment.MiddleLeft }, 0, 4);
        layout.Controls.Add(_autoStartCheckbox, 1, 4);

        var buttonPanel = new FlowLayoutPanel
        {
            Dock = DockStyle.Fill,
            FlowDirection = FlowDirection.RightToLeft
        };

        _saveButton = new Button { Text = "Save", Width = 90 };
        _cancelButton = new Button { Text = "Cancel", Width = 90 };
        _testButton = new Button { Text = "Test Print", Width = 100 };

        _saveButton.Click += async (_, _) => await SaveAsync();
        _cancelButton.Click += (_, _) => Close();
        _testButton.Click += async (_, _) => await TestPrintAsync();

        buttonPanel.Controls.Add(_saveButton);
        buttonPanel.Controls.Add(_cancelButton);
        buttonPanel.Controls.Add(_testButton);

        layout.Controls.Add(buttonPanel, 0, 5);
        layout.SetColumnSpan(buttonPanel, 2);

        Controls.Add(layout);
    }

    private async Task SaveAsync()
    {
        if (!Uri.TryCreate(_backendUrlInput.Text.Trim(), UriKind.Absolute, out _))
        {
            MessageBox.Show("Backend URL is invalid.", "Settings", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            return;
        }

        var printerName = _printerSelect.SelectedItem?.ToString() ?? string.Empty;
        if (printerName == "(No printers found)")
        {
            printerName = string.Empty;
        }

        var updated = new AppConfig
        {
            BackendUrl = _backendUrlInput.Text.Trim(),
            AgentId = _config.AgentId,
            PrinterName = printerName,
            EnableLogging = _loggingCheckbox.Checked,
            AutoStart = _autoStartCheckbox.Checked
        };

        await _onSave(updated);
        Close();
    }

    private async Task TestPrintAsync()
    {
        try
        {
            var printerName = _printerSelect.SelectedItem?.ToString() ?? string.Empty;
            if (printerName == "(No printers found)")
            {
                MessageBox.Show("No printer configured.", "Test Print", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            await _onTestPrint(printerName);
            MessageBox.Show("Test print sent.", "Test Print", MessageBoxButtons.OK, MessageBoxIcon.Information);
        }
        catch (Exception ex)
        {
            MessageBox.Show($"Test print failed: {ex.Message}", "Test Print", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }
}
