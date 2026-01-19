using System.Text.Json;
using ReceiptPrintAgent.Logging;
using ReceiptPrintAgent.Models;

namespace ReceiptPrintAgent.Connection;

public class MessageHandler
{
    private readonly WebSocketClient _client;
    private readonly Logger _logger;
    private readonly JsonSerializerOptions _serializerOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public event EventHandler<PrintJob>? PrintJobReceived;

    public MessageHandler(WebSocketClient client, Logger logger)
    {
        _client = client;
        _logger = logger;
        _client.MessageReceived += HandleMessage;
    }

    private async void HandleMessage(object? sender, string message)
    {
        try
        {
            using var document = JsonDocument.Parse(message);
            if (!document.RootElement.TryGetProperty("type", out var typeElement))
            {
                _logger.Warn("WebSocket message missing type field.");
                return;
            }

            var messageType = typeElement.GetString() ?? string.Empty;
            switch (messageType)
            {
                case "PRINT_JOB":
                {
                    if (!document.RootElement.TryGetProperty("job", out var jobElement))
                    {
                        _logger.Warn("PRINT_JOB message missing job payload.");
                        return;
                    }

                    var job = JsonSerializer.Deserialize<PrintJob>(jobElement.GetRawText(), _serializerOptions);
                    if (job == null || string.IsNullOrWhiteSpace(job.Id))
                    {
                        _logger.Warn("PRINT_JOB message failed to deserialize.");
                        return;
                    }

                    await _client.SendAsync(new
                    {
                        type = "ACK",
                        jobId = job.Id
                    });

                    PrintJobReceived?.Invoke(this, job);
                    break;
                }
                case "HEARTBEAT_ACK":
                    _logger.Info("Heartbeat acknowledged by backend.");
                    break;
                default:
                    _logger.Warn($"Unhandled message type: {messageType}");
                    break;
            }
        }
        catch (Exception ex)
        {
            _logger.Error($"Failed to handle message: {ex.Message}");
        }
    }
}
