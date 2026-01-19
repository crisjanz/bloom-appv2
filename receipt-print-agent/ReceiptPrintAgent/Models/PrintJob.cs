using System.Text.Json;

namespace ReceiptPrintAgent.Models;

public class PrintJob
{
    public string Id { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string? AgentType { get; set; }
    public string? PrinterName { get; set; }
    public int? PrinterTray { get; set; }
    public int? Copies { get; set; }
    public string? OrderId { get; set; }
    public JsonElement Data { get; set; }
    public string? Template { get; set; }
    public int Priority { get; set; }
    public DateTime CreatedAt { get; set; }
}
