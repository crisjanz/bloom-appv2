using System.Text.Json;
using Microsoft.Win32;
using System.Windows.Forms;

namespace ReceiptPrintAgent.Config;

public class ConfigManager
{
    private const string AppFolderName = "ReceiptPrintAgent";
    private const string ConfigFileName = "config.json";
    private const string LogFolderName = "logs";
    private const string AutoStartKey = "ReceiptPrintAgent";

    public AppConfig Current { get; private set; } = new();

    public event EventHandler<AppConfig>? ConfigChanged;

    public string AppDataDirectory => Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
        AppFolderName
    );

    public string ConfigFilePath => Path.Combine(AppDataDirectory, ConfigFileName);

    public string LogDirectory => Path.Combine(AppDataDirectory, LogFolderName);

    public AppConfig Load()
    {
        Directory.CreateDirectory(AppDataDirectory);

        if (!File.Exists(ConfigFilePath))
        {
            Current = CreateDefault();
            Save(Current);
            return Current;
        }

        try
        {
            var json = File.ReadAllText(ConfigFilePath);
            var config = JsonSerializer.Deserialize<AppConfig>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (config == null)
            {
                Current = CreateDefault();
                Save(Current);
                return Current;
            }

            if (string.IsNullOrWhiteSpace(config.AgentId))
            {
                config.AgentId = GenerateAgentId();
            }

            Current = config;
            return Current;
        }
        catch
        {
            var backupPath = ConfigFilePath + ".bak";
            try
            {
                File.Copy(ConfigFilePath, backupPath, true);
            }
            catch
            {
                // Ignore backup errors
            }

            Current = CreateDefault();
            Save(Current);
            return Current;
        }
    }

    public void Save(AppConfig config)
    {
        Directory.CreateDirectory(AppDataDirectory);

        if (string.IsNullOrWhiteSpace(config.AgentId))
        {
            config.AgentId = GenerateAgentId();
        }

        var json = JsonSerializer.Serialize(config, new JsonSerializerOptions
        {
            WriteIndented = true
        });

        File.WriteAllText(ConfigFilePath, json);
        Current = config;
        ApplyAutoStart(config.AutoStart);
        ConfigChanged?.Invoke(this, config);
    }

    public void ApplyAutoStart(bool enable)
    {
        try
        {
            using var key = Registry.CurrentUser.OpenSubKey(
                "Software\\Microsoft\\Windows\\CurrentVersion\\Run",
                true
            );
            if (key == null)
            {
                return;
            }

            if (enable)
            {
                key.SetValue(AutoStartKey, Application.ExecutablePath);
            }
            else
            {
                key.DeleteValue(AutoStartKey, false);
            }
        }
        catch
        {
            // Ignore registry errors
        }
    }

    private AppConfig CreateDefault()
    {
        return new AppConfig
        {
            AgentId = GenerateAgentId()
        };
    }

    private string GenerateAgentId()
    {
        return $"receipt-agent-windows-{Guid.NewGuid():N}";
    }
}
