// components/pos/POSLayout.tsx
import React from 'react';
import POSHeader from './POSHeader';

type Props = {
  children: React.ReactNode;
};

export default function POSLayout({ children }: Props) {
  return (
    <div className="h-screen bg-gray-50 dark:bg-boxdark-2 overflow-hidden">
      <main className="h-full">
        {children}
      </main>
    </div>
  );
}