namespace ReceiptPrintAgent.Logging;

public class Logger
{
    private readonly object _lock = new();
    private readonly Func<bool> _loggingEnabled;
    private readonly Func<string> _logDirectoryProvider;

    public Logger(Func<bool> loggingEnabled, Func<string> logDirectoryProvider)
    {
        _loggingEnabled = loggingEnabled;
        _logDirectoryProvider = logDirectoryProvider;
    }

    public void Info(string message)
    {
        Write("INFO", message);
    }

    public void Warn(string message)
    {
        Write("WARN", message);
    }

    public void Error(string message)
    {
        Write("ERROR", message);
    }

    public string GetCurrentLogPath()
    {
        var directory = _logDirectoryProvider();
        var fileName = $"agent-{DateTime.Now:yyyy-MM-dd}.log";
        return Path.Combine(directory, fileName);
    }

    public void ClearCurrentLog()
    {
        var path = GetCurrentLogPath();
        try
        {
            if (File.Exists(path))
            {
                File.Delete(path);
            }
        }
        catch
        {
            // Ignore log deletion errors
        }
    }

    private void Write(string level, string message)
    {
        if (!_loggingEnabled())
        {
            return;
        }

        var directory = _logDirectoryProvider();
        Directory.CreateDirectory(directory);

        var logPath = GetCurrentLogPath();
        RotateIfNeeded(logPath);

        var line = $"{DateTime.Now:yyyy-MM-dd HH:mm:ss} [{level}] {message}";

        lock (_lock)
        {
            try
            {
                File.AppendAllText(logPath, line + Environment.NewLine);
            }
            catch
            {
                // Ignore logging errors
            }
        }
    }

    private void RotateIfNeeded(string logPath)
    {
        try
        {
            if (!File.Exists(logPath))
            {
                return;
            }

            var info = new FileInfo(logPath);
            const long maxSize = 10 * 1024 * 1024; // 10 MB
            if (info.Length <= maxSize)
            {
                return;
            }

            var backupPath = logPath + ".1";
            if (File.Exists(backupPath))
            {
                File.Delete(backupPath);
            }

            File.Move(logPath, backupPath);
        }
        catch
        {
            // Ignore rotation errors
        }
    }
}
