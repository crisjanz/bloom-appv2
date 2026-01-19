using System.Runtime.InteropServices;

namespace ReceiptPrintAgent.Printing;

public static class RawPrinterHelper
{
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private class DocInfo
    {
        public string pDocName = "Receipt";
        public string? pOutputFile;
        public string pDataType = "RAW";
    }

    [DllImport("winspool.Drv", SetLastError = true, CharSet = CharSet.Unicode)]
    private static extern bool OpenPrinter(string pPrinterName, out IntPtr phPrinter, IntPtr pDefault);

    [DllImport("winspool.Drv", SetLastError = true, CharSet = CharSet.Unicode)]
    private static extern bool StartDocPrinter(IntPtr hPrinter, int level, DocInfo docInfo);

    [DllImport("winspool.Drv", SetLastError = true)]
    private static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", SetLastError = true)]
    private static extern bool WritePrinter(IntPtr hPrinter, byte[] pBytes, int dwCount, out int dwWritten);

    [DllImport("winspool.Drv", SetLastError = true)]
    private static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", SetLastError = true)]
    private static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", SetLastError = true)]
    private static extern bool ClosePrinter(IntPtr hPrinter);

    public static bool SendBytesToPrinter(string printerName, byte[] bytes, out string? error)
    {
        error = null;
        if (!OpenPrinter(printerName, out var printerHandle, IntPtr.Zero))
        {
            error = $"OpenPrinter failed: {Marshal.GetLastWin32Error()}";
            return false;
        }

        try
        {
            var docInfo = new DocInfo();
            if (!StartDocPrinter(printerHandle, 1, docInfo))
            {
                error = $"StartDocPrinter failed: {Marshal.GetLastWin32Error()}";
                return false;
            }

            if (!StartPagePrinter(printerHandle))
            {
                error = $"StartPagePrinter failed: {Marshal.GetLastWin32Error()}";
                EndDocPrinter(printerHandle);
                return false;
            }

            if (!WritePrinter(printerHandle, bytes, bytes.Length, out var written) || written != bytes.Length)
            {
                error = $"WritePrinter failed: {Marshal.GetLastWin32Error()}";
                EndPagePrinter(printerHandle);
                EndDocPrinter(printerHandle);
                return false;
            }

            EndPagePrinter(printerHandle);
            EndDocPrinter(printerHandle);
            return true;
        }
        finally
        {
            ClosePrinter(printerHandle);
        }
    }
}
