'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const MAX_RECORDING_MS = 120_000;

const PREFERRED_MIME_TYPES = [
  'audio/ogg;codecs=opus',
  'audio/ogg',
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
];

function pickRecorderMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return PREFERRED_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
}

function microphoneErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') {
      return 'Microphone access was denied. Allow microphone access in your browser settings.';
    }
    if (error.name === 'NotFoundError') {
      return 'No microphone was found on this device.';
    }
  }

  return error instanceof Error
    ? error.message
    : 'Could not access the microphone';
}

export interface UseVoiceTranscriptionOptions {
  onTranscript: (text: string) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
}

export function useVoiceTranscription({
  onTranscript,
  onError,
  disabled = false,
}: UseVoiceTranscriptionOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const mimeTypeRef = useRef('audio/webm');
  const maxDurationTimerRef = useRef<number | null>(null);
  const stopRecordingRef = useRef<(() => Promise<void>) | null>(null);

  const cleanupStream = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  }, []);

  const clearMaxDurationTimer = useCallback(() => {
    if (maxDurationTimerRef.current !== null) {
      window.clearTimeout(maxDurationTimerRef.current);
      maxDurationTimerRef.current = null;
    }
  }, []);

  const transcribeBlob = useCallback(
    async (blob: Blob) => {
      setIsTranscribing(true);
      try {
        const formData = new FormData();
        formData.append('audio', blob, 'recording.webm');

        const response = await fetch('/api/composer/transcribe', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(
            (err as { error?: string }).error ?? 'Failed to transcribe audio',
          );
        }

        const { transcript } = (await response.json()) as { transcript: string };
        onTranscript(transcript);
      } catch (error) {
        onError?.(
          error instanceof Error ? error.message : 'Failed to transcribe audio',
        );
      } finally {
        setIsTranscribing(false);
      }
    },
    [onError, onTranscript],
  );

  const stopRecording = useCallback(async () => {
    clearMaxDurationTimer();

    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      setIsRecording(false);
      cleanupStream();
      return;
    }

    await new Promise<void>((resolve) => {
      recorder.addEventListener(
        'stop',
        () => {
          resolve();
        },
        { once: true },
      );
      recorder.stop();
    });

    mediaRecorderRef.current = null;
    setIsRecording(false);
    cleanupStream();

    const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
    chunksRef.current = [];

    if (blob.size === 0) {
      onError?.('No audio was captured. Try speaking closer to the microphone.');
      return;
    }

    await transcribeBlob(blob);
  }, [cleanupStream, clearMaxDurationTimer, onError, transcribeBlob]);

  useEffect(() => {
    stopRecordingRef.current = stopRecording;
  }, [stopRecording]);

  const startRecording = useCallback(async () => {
    if (disabled || isRecording || isTranscribing) return;

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      onError?.('Voice input is not supported in this browser.');
      return;
    }

    const mimeType = pickRecorderMimeType();
    if (!mimeType) {
      onError?.('Voice recording is not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      mimeTypeRef.current = mimeType;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      });

      recorder.start();
      setIsRecording(true);

      maxDurationTimerRef.current = window.setTimeout(() => {
        void stopRecordingRef.current?.();
      }, MAX_RECORDING_MS);
    } catch (error) {
      cleanupStream();
      onError?.(microphoneErrorMessage(error));
    }
  }, [cleanupStream, disabled, isRecording, isTranscribing, onError]);

  const toggleVoiceInput = useCallback(async () => {
    if (isRecording) {
      await stopRecording();
      return;
    }

    await startRecording();
  }, [isRecording, startRecording, stopRecording]);

  useEffect(() => {
    return () => {
      clearMaxDurationTimer();
      mediaRecorderRef.current?.stop();
      cleanupStream();
    };
  }, [cleanupStream, clearMaxDurationTimer]);

  return {
    toggleVoiceInput,
    isRecording,
    isTranscribing,
  };
}
