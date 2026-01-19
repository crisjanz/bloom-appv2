using System.Collections.Concurrent;
using ReceiptPrintAgent.Config;
using ReceiptPrintAgent.Connection;
using ReceiptPrintAgent.Logging;
using ReceiptPrintAgent.Models;

namespace ReceiptPrintAgent.Printing;

public class PrintManager
{
    private readonly ConfigManager _configManager;
    private readonly WebSocketClient _webSocketClient;
    private readonly Logger _logger;
    private readonly ThermalPrinter _thermalPrinter;
    private readonly ConcurrentQueue<PrintJob> _queue = new();
    private readonly SemaphoreSlim _signal = new(0);
    private CancellationTokenSource? _cts;
    private Task? _worker;
    public event Action<string, string, string?>? JobStatusReported;

    public PrintManager(ConfigManager configManager, WebSocketClient webSocketClient, Logger logger)
    {
        _configManager = configManager;
        _webSocketClient = webSocketClient;
        _logger = logger;
        _thermalPrinter = new ThermalPrinter(logger);
    }

    public void Start()
    {
        if (_worker != null)
        {
            return;
        }

        _cts = new CancellationTokenSource();
        _worker = Task.Run(() => ProcessLoopAsync(_cts.Token));
    }

    public async Task StopAsync()
    {
        if (_cts == null)
        {
            return;
        }

        _cts.Cancel();
        _signal.Release();

        if (_worker != null)
        {
            await _worker;
        }

        _worker = null;
        _cts = null;
    }

    public void EnqueueJob(PrintJob job)
    {
        if (!ShouldProcess(job))
        {
            _logger.Info($"Skipping job {job.Id} for agentType {job.AgentType} and type {job.Type}.");
            return;
        }

        _queue.Enqueue(job);
        _signal.Release();
    }

    public async Task PrintTestAsync(string printerName)
    {
        await _thermalPrinter.PrintTestAsync(printerName);
    }

    public List<string> GetInstalledPrinters()
    {
        return _thermalPrinter.GetInstalledPrinters();
    }

    private async Task ProcessLoopAsync(CancellationToken token)
    {
        while (!token.IsCancellationRequested)
        {
            try
            {
                await _signal.WaitAsync(token);
            }
            catch (OperationCanceledException)
            {
                return;
            }

            if (!_queue.TryDequeue(out var job))
            {
                continue;
            }

            await ProcessJobAsync(job);
        }
    }

    private async Task ProcessJobAsync(PrintJob job)
    {
        var printerName = !string.IsNullOrWhiteSpace(job.PrinterName)
            ? job.PrinterName
            : _configManager.Current.PrinterName;

        var copies = job.Copies ?? 1;

        try
        {
            _logger.Info($"Printing receipt job {job.Id} to {printerName}.");
            await _thermalPrinter.PrintReceiptAsync(job, printerName, copies);
            await SendJobStatusAsync(job.Id, "COMPLETED", null);
            JobStatusReported?.Invoke(job.Id, "COMPLETED", null);
        }
        catch (Exception ex)
        {
            _logger.Error($"Print job {job.Id} failed: {ex.Message}");
            await SendJobStatusAsync(job.Id, "FAILED", ex.Message);
            JobStatusReported?.Invoke(job.Id, "FAILED", ex.Message);
        }
    }

    private async Task SendJobStatusAsync(string jobId, string status, string? errorMessage)
    {
        await _webSocketClient.SendAsync(new
        {
            type = "JOB_STATUS",
            jobId,
            status,
            agentId = _configManager.Current.AgentId,
            errorMessage
        });
    }

    private bool ShouldProcess(PrintJob job)
    {
        var agentType = job.AgentType ?? string.Empty;
        var jobType = job.Type ?? string.Empty;

        return agentType.Equals("receipt-agent", StringComparison.OrdinalIgnoreCase)
            && jobType.Equals("RECEIPT", StringComparison.OrdinalIgnoreCase);
    }
}
