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
