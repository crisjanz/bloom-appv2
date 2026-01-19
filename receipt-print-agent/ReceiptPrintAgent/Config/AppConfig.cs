namespace ReceiptPrintAgent.Config;

public class AppConfig
{
    public string BackendUrl { get; set; } = "wss://api.hellobloom.ca/print-agent";
    public string AgentId { get; set; } = string.Empty;
    public string PrinterName { get; set; } = "Star TSP143IIIU";
    public bool EnableLogging { get; set; } = true;
    public bool AutoStart { get; set; } = true;
}
