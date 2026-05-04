'use client';
import { ReactNode } from 'react';

export type Tab = 'news' | 'messages' | 'group' | 'discussions';

export const MSG_NOTIFICATION_FREQUENCIES_HZ = [880, 1100];
export const NEWS_NOTIFICATION_FREQUENCIES_HZ = [660, 550, 440];
export const AUDIO_NOTE_INTERVAL_SECONDS = 0.17;
export const AUDIO_NOTE_INITIAL_GAIN = 0.22;
export const AUDIO_NOTE_FINAL_GAIN = 0.001;
export const AUDIO_NOTE_DURATION_SECONDS = 0.2;

export const TOAST_MAX_VISIBLE = 5;
export const TOAST_FADE_OUT_DELAY_MS = 4700;
export const TOAST_REMOVE_DELAY_MS = 5000;

export const MESSAGE_PREVIEW_MAX_LENGTH = 80;
export const TYPING_INDICATOR_TIMEOUT_MS = 3000;

export const NAV_ICONS: Record<Tab, ReactNode> = {
  news: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10l6 6v8a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M14 4v4h4M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  messages: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  group: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  discussions: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M8 8h8M8 12h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
};
