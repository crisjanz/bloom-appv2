// src/hooks/usePOSTabs.ts - Final version, no services
import { useState, useEffect } from 'react';

export interface POSTab {
  id: string;
  name: string;
  productIds: string[];
  order: number;
}

export const usePOSTabs = () => {
  const [tabs, setTabs] = useState<POSTab[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTabs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/settings/pos-tabs');
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch POS tabs');
      }
      
      setTabs(data.tabs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tabs');
      console.error('Error fetching POS tabs:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveTabs = async (newTabs: POSTab[]) => {
    try {
      const response = await fetch('/api/settings/pos-tabs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tabs: newTabs }),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to save POS tabs');
      }
      
      setTabs(newTabs);
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save tabs';
      setError(errorMessage);
      console.error('Error saving POS tabs:', err);
      return { success: false, error: errorMessage };
    }
  };

  useEffect(() => {
    fetchTabs();
  }, []);

  return {
    tabs,
    loading,
    error,
    fetchTabs,
    saveTabs,
    setTabs
  };
};