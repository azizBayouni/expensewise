
'use client';

import type { DateRange } from "react-day-picker";

const TRAVEL_MODE_STORAGE_KEY = 'expensewise-travel-mode';

type TravelModeState = {
    isActive: boolean;
    currency: string | null;
    eventId: string | null;
    duration?: DateRange;
};

export function setTravelMode(newState: Omit<TravelModeState, 'isActive'> & { isActive: true }): void {
  if (typeof window !== 'undefined') {
    const stateToStore = { ...newState, isActive: true };
    localStorage.setItem(TRAVEL_MODE_STORAGE_KEY, JSON.stringify(stateToStore));
    window.dispatchEvent(new Event('travelModeChanged'));
  }
}

export function disconnectTravelMode(): void {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(TRAVEL_MODE_STORAGE_KEY);
        window.dispatchEvent(new Event('travelModeChanged'));
    }
}

export function getTravelMode(): TravelModeState {
  if (typeof window !== 'undefined') {
    const storedState = localStorage.getItem(TRAVEL_MODE_STORAGE_KEY);
    if (storedState) {
      try {
        const parsed = JSON.parse(storedState);
        // Basic validation
        if (typeof parsed.isActive === 'boolean') {
            return parsed;
        }
      } catch (e) {
        // Fallback if JSON is corrupted
        return { isActive: false, currency: null, eventId: null };
      }
    }
  }
  return { isActive: false, currency: null, eventId: null };
}
