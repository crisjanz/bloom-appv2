// components/pos/POSHeader.tsx - Updated header with icons
import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function POSHeader() {
  const navigate = useNavigate();

  return (
    <header className="bg-gray-50 dark:bg-gray-900 h-20 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        {/* Back to Dashboard */}
        <button
          onClick={() => navigate('/dashboard')}
          className="w-12 h-12 bg-white dark:bg-boxdark rounded-2xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shadow-sm"
        >
          <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        
        {/* Logo */}
        <div className="text-2xl font-bold text-black dark:text-white">
          🌸 Bloom POS
        </div>
      </div>

      {/* Settings */}
      <button className="w-12 h-12 bg-white dark:bg-boxdark rounded-2xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shadow-sm">
        <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
    </header>
  );
}