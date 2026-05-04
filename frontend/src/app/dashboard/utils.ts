import {
  MSG_NOTIFICATION_FREQUENCIES_HZ,
  NEWS_NOTIFICATION_FREQUENCIES_HZ,
  AUDIO_NOTE_INTERVAL_SECONDS,
  AUDIO_NOTE_INITIAL_GAIN,
  AUDIO_NOTE_FINAL_GAIN,
  AUDIO_NOTE_DURATION_SECONDS,
  TOAST_MAX_VISIBLE,
  TOAST_FADE_OUT_DELAY_MS,
  TOAST_REMOVE_DELAY_MS,
} from './constants';
import type { ToastItem } from '@/components/Toast';

export function playSound(soundType: 'msg' | 'news') {
  try {
    const AudioContextConstructor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const audioContext = new AudioContextConstructor();
    const noteFrequencies = soundType === 'msg' ? MSG_NOTIFICATION_FREQUENCIES_HZ : NEWS_NOTIFICATION_FREQUENCIES_HZ;
    noteFrequencies.forEach((noteFrequency, noteIndex) => {
      const oscillatorNode = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillatorNode.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillatorNode.type = soundType === 'msg' ? 'sine' : 'triangle';
      oscillatorNode.frequency.setValueAtTime(noteFrequency, audioContext.currentTime + noteIndex * AUDIO_NOTE_INTERVAL_SECONDS);
      gainNode.gain.setValueAtTime(AUDIO_NOTE_INITIAL_GAIN, audioContext.currentTime + noteIndex * AUDIO_NOTE_INTERVAL_SECONDS);
      gainNode.gain.exponentialRampToValueAtTime(AUDIO_NOTE_FINAL_GAIN, audioContext.currentTime + noteIndex * AUDIO_NOTE_INTERVAL_SECONDS + AUDIO_NOTE_DURATION_SECONDS);
      oscillatorNode.start(audioContext.currentTime + noteIndex * AUDIO_NOTE_INTERVAL_SECONDS);
      oscillatorNode.stop(audioContext.currentTime + noteIndex * AUDIO_NOTE_INTERVAL_SECONDS + AUDIO_NOTE_DURATION_SECONDS);
    });
  } catch {}
}

export function addToast(setFn: React.Dispatch<React.SetStateAction<ToastItem[]>>, item: Omit<ToastItem, 'id' | 'removing'>) {
  const toastId = `${Date.now()}-${Math.random()}`;
  setFn(previousToasts => [{ ...item, id: toastId }, ...previousToasts.slice(0, TOAST_MAX_VISIBLE - 1)]);
  setTimeout(() => setFn(previousToasts => previousToasts.map(existingToast => existingToast.id === toastId ? { ...existingToast, removing: true } : existingToast)), TOAST_FADE_OUT_DELAY_MS);
  setTimeout(() => setFn(previousToasts => previousToasts.filter(existingToast => existingToast.id !== toastId)), TOAST_REMOVE_DELAY_MS);
}
