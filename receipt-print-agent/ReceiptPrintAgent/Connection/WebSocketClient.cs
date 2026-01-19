using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using ReceiptPrintAgent.Config;
using ReceiptPrintAgent.Logging;

namespace ReceiptPrintAgent.Connection;

public class WebSocketClient
{
    private readonly ConfigManager _configManager;
    private readonly Logger _logger;
    private readonly object _sync = new();
    private ClientWebSocket? _socket;
    private CancellationTokenSource? _cts;
    private Task? _runTask;

    public event EventHandler<ConnectionStatus>? ConnectionStatusChanged;
    public event EventHandler<string>? MessageReceived;

    public ConnectionStatus Status { get; private set; } = ConnectionStatus.Disconnected;

    public WebSocketClient(ConfigManager configManager, Logger logger)
    {
        _configManager = configManager;
        _logger = logger;

        _configManager.ConfigChanged += (_, config) =>
        {
            _logger.Info("Configuration changed. Reconnecting WebSocket.");
            _ = RestartAsync();
        };
    }

    public void Start()
    {
        if (_runTask != null)
        {
            return;
        }

        _cts = new CancellationTokenSource();
        _runTask = Task.Run(() => RunAsync(_cts.Token));
    }

    public async Task StopAsync()
    {
        if (_cts == null)
        {
            return;
        }

        _cts.Cancel();
        if (_runTask != null)
        {
            await _runTask;
        }

        await CloseSocketAsync();
        _runTask = null;
        _cts = null;
    }

    public async Task RestartAsync()
    {
        await StopAsync();
        Start();
    }

    public async Task SendAsync(object payload)
    {
        var json = JsonSerializer.Serialize(payload);
        await SendRawAsync(json);
    }

    public async Task SendRawAsync(string payload)
    {
        ClientWebSocket? socket;
        lock (_sync)
        {
            socket = _socket;
        }

        if (socket == null || socket.State != WebSocketState.Open)
        {
            _logger.Warn("WebSocket not connected. Message not sent.");
            return;
        }

        var bytes = Encoding.UTF8.GetBytes(payload);
        var segment = new ArraySegment<byte>(bytes);
        try
        {
            await socket.SendAsync(segment, WebSocketMessageType.Text, true, CancellationToken.None);
        }
        catch (Exception ex)
        {
            _logger.Error($"Failed to send WebSocket message: {ex.Message}");
        }
    }

    private async Task RunAsync(CancellationToken token)
    {
        var delayMs = 1000;

        while (!token.IsCancellationRequested)
        {
            var backendUrl = _configManager.Current.BackendUrl;
            if (!Uri.TryCreate(backendUrl, UriKind.Absolute, out var uri))
            {
                _logger.Error($"Invalid backend URL: {backendUrl}");
                await Task.Delay(delayMs, token);
                delayMs = Math.Min(delayMs * 2, 30000);
                continue;
            }

            UpdateStatus(ConnectionStatus.Connecting);

            try
            {
                var socket = new ClientWebSocket();
                socket.Options.KeepAliveInterval = TimeSpan.FromSeconds(30);
                await socket.ConnectAsync(uri, token);

                lock (_sync)
                {
                    _socket = socket;
                }

                _logger.Info("WebSocket connected.");
                UpdateStatus(ConnectionStatus.Connected);
                delayMs = 1000;

                var receiveTask = ReceiveLoopAsync(socket, token);
                var heartbeatTask = HeartbeatLoopAsync(socket, token);

                await Task.WhenAny(receiveTask, heartbeatTask);
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.Error($"WebSocket connection failed: {ex.Message}");
            }
            finally
            {
                await CloseSocketAsync();
                UpdateStatus(ConnectionStatus.Disconnected);
            }

            try
            {
                await Task.Delay(delayMs, token);
            }
            catch (OperationCanceledException)
            {
                break;
            }

            delayMs = Math.Min(delayMs * 2, 30000);
        }
    }

    private async Task ReceiveLoopAsync(ClientWebSocket socket, CancellationToken token)
    {
        var buffer = new byte[8192];

        while (socket.State == WebSocketState.Open && !token.IsCancellationRequested)
        {
            try
            {
                var builder = new StringBuilder();
                WebSocketReceiveResult result;

                do
                {
                    result = await socket.ReceiveAsync(new ArraySegment<byte>(buffer), token);

                    if (result.MessageType == WebSocketMessageType.Close)
                    {
                        await socket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Closing", token);
                        return;
                    }

                    var chunk = Encoding.UTF8.GetString(buffer, 0, result.Count);
                    builder.Append(chunk);
                }
                while (!result.EndOfMessage);

                var message = builder.ToString();
                if (!string.IsNullOrWhiteSpace(message))
                {
                    MessageReceived?.Invoke(this, message);
                }
            }
            catch (OperationCanceledException)
            {
                return;
            }
            catch (Exception ex)
            {
                _logger.Error($"WebSocket receive error: {ex.Message}");
                return;
            }
        }
    }

    private async Task HeartbeatLoopAsync(ClientWebSocket socket, CancellationToken token)
    {
        while (socket.State == WebSocketState.Open && !token.IsCancellationRequested)
        {
            var payload = new
            {
                type = "HEARTBEAT",
                agentId = _configManager.Current.AgentId,
                timestamp = DateTime.UtcNow.ToString("O")
            };

            await SendAsync(payload);

            try
            {
                await Task.Delay(TimeSpan.FromSeconds(30), token);
            }
            catch (OperationCanceledException)
            {
                return;
            }
        }
    }

    private async Task CloseSocketAsync()
    {
        ClientWebSocket? socket;
        lock (_sync)
        {
            socket = _socket;
            _socket = null;
        }

        if (socket == null)
        {
            return;
        }

        try
        {
            if (socket.State == WebSocketState.Open)
            {
                await socket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Closing", CancellationToken.None);
            }
        }
        catch
        {
            // Ignore close errors
        }
        finally
        {
            socket.Dispose();
        }
    }

    private void UpdateStatus(ConnectionStatus status)
    {
        if (Status == status)
        {
            return;
        }

        Status = status;
        ConnectionStatusChanged?.Invoke(this, status);
    }
}
