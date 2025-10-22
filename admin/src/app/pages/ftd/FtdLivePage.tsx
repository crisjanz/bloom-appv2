import React, { useState } from 'react';

export default function FtdLivePage() {
  const [iframeBlocked, setIframeBlocked] = useState(false);

  const openInNewWindow = () => {
    const width = 1400;
    const height = 900;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    window.open(
      'https://mercuryhq.com/orders',
      'MercuryHQ',
      `width=${width},height=${height},left=${left},top=${top}`
    );
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-stroke dark:border-strokedark bg-white dark:bg-boxdark">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-black dark:text-white">
              FTD Live - Mercury HQ Dashboard
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Accept, reject, and manage FTD orders
            </p>
          </div>

          <button
            onClick={openInNewWindow}
            className="flex items-center gap-2 px-4 py-2 border border-stroke dark:border-strokedark rounded-xl hover:bg-gray-50 dark:hover:bg-meta-4 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
            Open in New Window
          </button>
        </div>
      </div>

      {/* iframe Container */}
      <div className="flex-1 bg-gray-100 dark:bg-meta-4 p-6 overflow-hidden">
        <div className="h-full bg-white dark:bg-boxdark rounded-xl overflow-hidden shadow-lg">
          {!iframeBlocked ? (
            <iframe
              src="https://mercuryhq.com/orders"
              className="w-full h-full border-0"
              title="Mercury HQ Dashboard"
              onError={() => setIframeBlocked(true)}
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="mb-6">
                <svg
                  className="w-16 h-16 text-gray-400 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
                <h3 className="text-xl font-semibold text-black dark:text-white mb-2">
                  Mercury HQ cannot be embedded
                </h3>
                <p className="text-gray-600 dark:text-gray-400 max-w-md">
                  For security reasons, Mercury HQ blocks iframe embedding.
                  Click below to open in a new window.
                </p>
              </div>

              <button
                onClick={openInNewWindow}
                className="px-6 py-3 bg-[#597485] text-white rounded-xl hover:bg-[#4e6575] transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
                Open Mercury HQ Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
