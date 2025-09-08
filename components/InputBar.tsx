import React, { useRef, useState, useEffect, useLayoutEffect } from 'react';
import { PlusIcon, ArrowUpIcon, PaperClipIcon, MicrophoneIcon, ChatBubbleIcon, ScaleIcon } from './icons/Icons';

// Fix: Add type definitions for the Web Speech API to resolve TypeScript errors.
// These APIs are not yet part of the standard TypeScript DOM typings.
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  start(): void;
  stop(): void;
}

declare global {
  interface Window {
    SpeechRecognition: { new (): SpeechRecognition };
    webkitSpeechRecognition: { new (): SpeechRecognition };
  }
}

interface InputBarProps {
  value: string;
  onValueChange: React.Dispatch<React.SetStateAction<string>>;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: () => void;
  isLoading: boolean;
  fileName: string | null;
  fileInputRef: React.RefObject<HTMLInputElement>;
  mode: 'case' | 'chat';
  onModeChange: (mode: 'case' | 'chat') => void;
}

const InputBar: React.FC<InputBarProps> = ({
  value,
  onValueChange,
  onFileChange,
  onSubmit,
  isLoading,
  fileName,
  fileInputRef,
  mode,
  onModeChange,
}) => {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.max(textarea.scrollHeight, 44)}px`;
    }
  }, [value]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'el-GR';

      recognition.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        onValueChange(currentValue => currentValue + finalTranscript);
      };

      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [onValueChange]);

  const handleMicClick = () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
    setIsListening(!isListening);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        if (!isLoading && value.trim()) {
            onSubmit();
        }
    }
  };
  
  const placeholderText = mode === 'case'
    ? "Περιγράψτε την υπόθεσή σας ή ανεβάστε ένα αρχείο..."
    : "Ρωτήστε κάτι ή αναζητήστε ένα νόμο...";

  return (
    <div className="relative w-full rounded-[28px] border border-brand-border bg-brand-secondary shadow-lg px-3 sm:px-4 pt-4 pb-16">
      <div className="relative z-10">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholderText}
          className="w-full bg-transparent focus:outline-none text-brand-text placeholder-brand-subtle resize-none overflow-y-auto px-2"
          style={{ minHeight: '44px', maxHeight: '150px' }}
          rows={1}
          disabled={isLoading}
        />
        {fileName && (
          <div className="mt-2 text-sm text-brand-subtle flex items-center bg-input-bg px-3 py-1 rounded-full w-fit ml-2">
            <PaperClipIcon className="w-4 h-4 mr-2" />
            <span>{fileName}</span>
          </div>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 px-3 sm:px-4 py-3">
          <label
            htmlFor="file-upload"
            className="group inline-flex items-center justify-center h-10 w-10 rounded-full bg-transparent hover:bg-slate-100 cursor-pointer transition-colors"
            aria-label="Επισύναψη αρχείου"
          >
            <PlusIcon className="w-5 h-5 text-brand-subtle group-hover:text-brand-text" />
            <input
              id="file-upload"
              type="file"
              className="hidden"
              onChange={onFileChange}
              accept=".txt,.md,.rtf,image/*"
              disabled={isLoading}
              ref={fileInputRef}
            />
          </label>
          
          <button
            onClick={() => onModeChange(mode === 'case' ? 'chat' : 'case')}
            disabled={isLoading}
            className={`group inline-flex items-center justify-center h-10 w-10 rounded-full bg-transparent hover:bg-slate-100 transition-colors`}
            aria-label={`Εναλλαγή σε λειτουργία ${mode === 'case' ? 'Συνομιλίας' : 'Ανάλυσης Υπόθεσης'}`}
            title={`Εναλλαγή σε λειτουργία ${mode === 'case' ? 'Συνομιλίας' : 'Ανάλυσης Υπόθεσης'}`}
          >
            {mode === 'case' 
              ? <ChatBubbleIcon className="w-5 h-5 text-brand-subtle group-hover:text-brand-text" /> 
              : <ScaleIcon className="w-5 h-5 text-brand-subtle group-hover:text-brand-text" />}
          </button>

          <button
            onClick={handleMicClick}
            disabled={isLoading || !recognitionRef.current}
            className={`group inline-flex items-center justify-center h-10 w-10 rounded-full bg-transparent disabled:opacity-60 transition-colors ${isListening ? 'bg-brand-accent/10' : 'hover:bg-slate-100'}`}
            aria-label={isListening ? 'Διακοπή ακρόασης' : 'Έναρξη ακρόασης'}
          >
            <MicrophoneIcon className={`w-5 h-5 transition-colors ${isListening ? 'text-brand-accent' : 'text-brand-subtle group-hover:text-brand-text'}`} />
          </button>
        
        <div className="ml-auto">
            <button
            onClick={onSubmit}
            disabled={isLoading || !value.trim()}
            className="inline-flex items-center justify-center rounded-full h-11 w-11 bg-slate-400 text-white hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-300 shadow-sm transition-colors"
            aria-label="Υποβολή"
            >
            <ArrowUpIcon className="w-6 h-6" />
            </button>
        </div>

      </div>
    </div>
  );
};

export default InputBar;