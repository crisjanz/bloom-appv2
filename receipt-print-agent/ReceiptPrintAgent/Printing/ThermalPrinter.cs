using System.Drawing.Printing;
using System.Text;
using System.Text.Json;
using ReceiptPrintAgent.Logging;
using ReceiptPrintAgent.Models;

namespace ReceiptPrintAgent.Printing;

public class ThermalPrinter
{
    private readonly Logger _logger;

    public ThermalPrinter(Logger logger)
    {
        _logger = logger;
    }

    public List<string> GetInstalledPrinters()
    {
        var printers = new List<string>();
        foreach (var printer in PrinterSettings.InstalledPrinters)
        {
            if (printer is string name)
            {
                printers.Add(name);
            }
        }

        return printers;
    }

    public Task PrintReceiptAsync(PrintJob job, string printerName, int copies)
    {
        var resolvedPrinter = ResolvePrinterName(printerName);
        var commandBytes = TryGetThermalCommands(job);

        if (commandBytes != null)
        {
            PrintRawBytes(resolvedPrinter, commandBytes, copies);
            return Task.CompletedTask;
        }

        var fallbackText = BuildFallbackReceipt(job);
        var bytes = Encoding.UTF8.GetBytes(fallbackText);
        PrintRawBytes(resolvedPrinter, bytes, copies);

        return Task.CompletedTask;
    }

    public Task PrintTestAsync(string printerName)
    {
        var resolvedPrinter = ResolvePrinterName(printerName);
        var lines = new List<string>
        {
            "Bloom Receipt Agent",
            "Test Print",
            $"{DateTime.Now:yyyy-MM-dd HH:mm:ss}",
            string.Empty,
            "Printer OK",
            string.Empty,
            string.Empty
        };

        var bytes = Encoding.UTF8.GetBytes(string.Join("\n", lines));
        PrintRawBytes(resolvedPrinter, bytes, 1);
        return Task.CompletedTask;
    }

    private string ResolvePrinterName(string preferred)
    {
        if (!string.IsNullOrWhiteSpace(preferred))
        {
            return preferred;
        }

        var settings = new PrinterSettings();
        if (!settings.IsValid || string.IsNullOrWhiteSpace(settings.PrinterName))
        {
            throw new InvalidOperationException("No default printer configured.");
        }

        return settings.PrinterName;
    }

    private void PrintRawBytes(string printerName, byte[] bytes, int copies)
    {
        var clampedCopies = Math.Min(Math.Max(copies, 1), 3);

        for (var i = 0; i < clampedCopies; i += 1)
        {
            if (!RawPrinterHelper.SendBytesToPrinter(printerName, bytes, out var error))
            {
                _logger.Error($"Raw print failed: {error}");
                throw new InvalidOperationException(error ?? "Unknown printer error");
            }
        }
    }

    private byte[]? TryGetThermalCommands(PrintJob job)
    {
        if (job.Data.ValueKind != JsonValueKind.Object)
        {
            return null;
        }

        if (!job.Data.TryGetProperty("thermalCommands", out var commandsElement))
        {
            return null;
        }

        var encoded = commandsElement.GetString();
        if (string.IsNullOrWhiteSpace(encoded))
        {
            return null;
        }

        try
        {
            return Convert.FromBase64String(encoded);
        }
        catch
        {
            return null;
        }
    }

    private string BuildFallbackReceipt(PrintJob job)
    {
        var orderNumber = TryGetString(job.Data, "orderNumber") ?? job.OrderId ?? "Unknown";
        var totalAmount = TryGetNumber(job.Data, "paymentAmount");
        var totalLine = totalAmount.HasValue ? $"Total: {(totalAmount.Value / 100.0m):0.00}" : "Total: N/A";

        var lines = new List<string>
        {
            "Bloom Flowers",
            "Receipt",
            $"Order: {orderNumber}",
            totalLine,
            string.Empty,
            "Printed by Receipt Agent",
            string.Empty,
            string.Empty
        };

        return string.Join("\n", lines);
    }

    private string? TryGetString(JsonElement data, string property)
    {
        if (data.ValueKind != JsonValueKind.Object)
        {
            return null;
        }

        if (data.TryGetProperty(property, out var element))
        {
            return element.GetString();
        }

        return null;
    }

    private decimal? TryGetNumber(JsonElement data, string property)
    {
        if (data.ValueKind != JsonValueKind.Object)
        {
            return null;
        }

        if (data.TryGetProperty(property, out var element) && element.TryGetDecimal(out var value))
        {
            return value;
        }

        return null;
    }
}
