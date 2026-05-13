'use client';
import { useRef } from 'react';

const TYPING_STOP_DELAY_MS = 2000;

interface UseTypingProps {
  onStartTyping: () => void;
  onStopTyping: () => void;
}

export function useTyping({ onStartTyping, onStopTyping }: UseTypingProps) {
  const typingTimeoutRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCurrentlyTypingRef  = useRef(false);

  const handleTypingInput = () => {
    if (!isCurrentlyTypingRef.current) {
      isCurrentlyTypingRef.current = true;
      onStartTyping();
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isCurrentlyTypingRef.current = false;
      onStopTyping();
    }, TYPING_STOP_DELAY_MS);
  };

  const cancelTyping = () => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (isCurrentlyTypingRef.current) {
      isCurrentlyTypingRef.current = false;
      onStopTyping();
    }
  };

  return { handleTypingInput, cancelTyping };
}
