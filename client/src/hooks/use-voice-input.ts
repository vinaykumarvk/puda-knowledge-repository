// @ts-nocheck
import { useState, useRef, useCallback, useEffect } from 'react';

interface UseVoiceInputOptions {
  onTranscriptionComplete?: (text: string) => void;
  onError?: (error: string) => void;
}

interface VoiceInputState {
  isRecording: boolean;
  isProcessing: boolean;
  interimTranscript: string;
  finalTranscript: string;
  error: string | null;
  hasPermission: boolean | null;
}

export function useVoiceInput(options: UseVoiceInputOptions = {}) {
  const [state, setState] = useState<VoiceInputState>({
    isRecording: false,
    isProcessing: false,
    interimTranscript: '',
    finalTranscript: '',
    error: null,
    hasPermission: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const checkMicrophonePermission = useCallback(async () => {
    try {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      setState(prev => ({ ...prev, hasPermission: result.state === 'granted' }));
      return result.state === 'granted';
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    checkMicrophonePermission();
  }, [checkMicrophonePermission]);

  const initializeSpeechRecognition = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      return null;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript + ' ';
        } else {
          interim += transcript;
        }
      }

      setState(prev => ({
        ...prev,
        interimTranscript: interim,
        finalTranscript: prev.finalTranscript + final,
      }));
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setState(prev => ({
          ...prev,
          error: 'Microphone permission denied',
          hasPermission: false,
        }));
      }
    };

    return recognition;
  }, []);

  const startRecording = useCallback(async () => {
    try {
      audioChunksRef.current = [];
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        } 
      });
      
      streamRef.current = stream;

      setState(prev => ({ 
        ...prev, 
        isRecording: true, 
        error: null,
        interimTranscript: '',
        finalTranscript: '',
        hasPermission: true,
      }));

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') 
          ? 'audio/webm' 
          : 'audio/mp4',
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100);

      const recognition = initializeSpeechRecognition();
      if (recognition) {
        recognitionRef.current = recognition;
        recognition.start();
      }

    } catch (error) {
      console.error('Error starting recording:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to access microphone';
      
      setState(prev => ({ 
        ...prev, 
        error: errorMessage,
        isRecording: false,
        hasPermission: false,
      }));
      
      options.onError?.(errorMessage);
    }
  }, [initializeSpeechRecognition, options]);

  const stopRecording = useCallback(async () => {
    return new Promise<void>((resolve) => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.onstop = async () => {
          setState(prev => ({ ...prev, isRecording: false, isProcessing: true }));

          const audioBlob = new Blob(audioChunksRef.current, { 
            type: mediaRecorderRef.current?.mimeType || 'audio/webm' 
          });

          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }

          try {
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');

            const response = await fetch('/api/voice/transcribe', {
              method: 'POST',
              body: formData,
            });

            if (!response.ok) {
              throw new Error('Transcription failed');
            }

            const data = await response.json();
            const whisperTranscript = data.text || '';

            setState(prev => {
              const combinedTranscript = whisperTranscript || prev.finalTranscript.trim();
              return {
                ...prev,
                finalTranscript: combinedTranscript,
                isProcessing: false,
              };
            });

            options.onTranscriptionComplete?.(whisperTranscript || state.finalTranscript.trim());
          } catch (error) {
            console.error('Transcription error:', error);
            const fallbackTranscript = state.finalTranscript.trim();
            
            setState(prev => ({ 
              ...prev, 
              isProcessing: false,
              error: 'Whisper transcription failed, using Web Speech result',
            }));

            if (fallbackTranscript) {
              options.onTranscriptionComplete?.(fallbackTranscript);
            } else {
              options.onError?.('Failed to transcribe audio');
            }
          }

          resolve();
        };

        mediaRecorderRef.current.stop();
      } else {
        setState(prev => ({ ...prev, isRecording: false }));
        resolve();
      }
    });
  }, [options, state.finalTranscript]);

  const cancelRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    audioChunksRef.current = [];
    setState({
      isRecording: false,
      isProcessing: false,
      interimTranscript: '',
      finalTranscript: '',
      error: null,
      hasPermission: state.hasPermission,
    });
  }, [state.hasPermission]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    startRecording,
    stopRecording,
    cancelRecording,
    clearError,
  };
}

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

declare var SpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};
