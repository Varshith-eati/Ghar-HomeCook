'use client';
import { useEffect, useState, useCallback } from 'react';
import { seedState } from './data.mjs';
import { todayIST } from './domain.mjs';
export const STORAGE_KEY = 'ghar-demo-v1';
const scopedKey = userId => STORAGE_KEY + ':' + userId;
export function canImportPreviousDemo(userId) {
  try {
    return !!localStorage.getItem(STORAGE_KEY) && !localStorage.getItem(scopedKey(userId)) && !localStorage.getItem(STORAGE_KEY + ':imported');
  } catch { return false; }
}
export function importPreviousDemo(userId) {
  if (!canImportPreviousDemo(userId)) return;
  localStorage.setItem(scopedKey(userId), localStorage.getItem(STORAGE_KEY));
  localStorage.setItem(STORAGE_KEY + ':imported', 'yes');
}
export function useDemoStore(userId) {
  const key = scopedKey(userId);
  const [state, setState] = useState(null);
  const [storageWarning, setStorageWarning] = useState(false);
  useEffect(() => {
    let next = seedState(todayIST());
    try {
      const saved = JSON.parse(localStorage.getItem(key) || 'null');
      if (saved?.version === 1 && Array.isArray(saved.providers) && Array.isArray(saved.subscriptions) && Array.isArray(saved.saved) && saved.ratings && saved.orderStatuses) {
        // Retain existing meal plans while discarding the retired report records.
        const { reports: retiredReports, ...current } = saved;
        next = current;
      }
    } catch { setStorageWarning(true); }
    setState(next);
  }, [key]);
  useEffect(() => {
    if (!state) return;
    try { localStorage.setItem(key, JSON.stringify(state)); } catch { setStorageWarning(true); }
  }, [state, key]);
  const update = useCallback(fn => setState(previous => fn(previous)), []);
  return { state, update, storageWarning };
}
