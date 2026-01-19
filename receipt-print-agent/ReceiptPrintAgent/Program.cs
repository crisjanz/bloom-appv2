using ReceiptPrintAgent.Config;
using ReceiptPrintAgent.Connection;
using ReceiptPrintAgent.Logging;
using ReceiptPrintAgent.Printing;

namespace ReceiptPrintAgent;

internal static class Program
{
    [STAThread]
    private static void Main()
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);

        var configManager = new ConfigManager();
        configManager.Load();

        var logger = new Logger(
            () => configManager.Current.EnableLogging,
            () => configManager.LogDirectory
        );

        var webSocketClient = new WebSocketClient(configManager, logger);
        var messageHandler = new MessageHandler(webSocketClient, logger);
        var printManager = new PrintManager(configManager, webSocketClient, logger);

        messageHandler.PrintJobReceived += (_, job) => printManager.EnqueueJob(job);

        webSocketClient.Start();
        printManager.Start();

        Application.Run(new TrayApp(configManager, webSocketClient, printManager, logger));

        printManager.StopAsync().GetAwaiter().GetResult();
        webSocketClient.StopAsync().GetAwaiter().GetResult();
    }
}
