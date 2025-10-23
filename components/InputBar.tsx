import React, { useRef, useLayoutEffect } from 'react';
import { PlusIcon, ArrowUpIcon, PaperClipIcon, ChatBubbleIcon, ScaleIcon } from './icons/Icons';

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.max(textarea.scrollHeight, 44)}px`;
    }
  }, [value]);

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
    <div className="relative w-full rounded-[28px] border border-brand-border dark:border-dark-border bg-brand-secondary dark:bg-dark-secondary shadow-lg px-3 sm:px-4 pt-4 pb-16">
      <div className="relative z-10">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholderText}
          className="w-full bg-transparent focus:outline-none text-brand-text-primary dark:text-dark-text-primary placeholder-brand-text-secondary dark:placeholder-dark-text-secondary resize-none overflow-y-auto px-2"
          style={{ minHeight: '44px', maxHeight: '150px' }}
          rows={1}
          disabled={isLoading}
        />
        {fileName && (
          <div className="mt-2 text-sm text-brand-text-secondary dark:text-dark-text-secondary flex items-center bg-input-bg dark:bg-dark-input-bg px-3 py-1 rounded-full w-fit ml-2">
            <PaperClipIcon className="w-4 h-4 mr-2" />
            <span>{fileName}</span>
          </div>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 px-3 sm:px-4 py-3">
          <label
            htmlFor="file-upload"
            className="group inline-flex items-center justify-center h-10 w-10 rounded-full bg-transparent hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors"
            aria-label="Επισύναψη αρχείου"
          >
            <PlusIcon className="w-5 h-5 text-brand-text-secondary dark:text-dark-text-secondary group-hover:text-brand-text-primary dark:group-hover:text-dark-text-primary" />
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
            className={`group inline-flex items-center justify-center h-10 w-10 rounded-full bg-transparent hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors`}
            aria-label={`Εναλλαγή σε λειτουργία ${mode === 'case' ? 'Συνομιλίας' : 'Ανάλυσης Υπόθεσης'}`}
            title={`Εναλλαγή σε λειτουργία ${mode === 'case' ? 'Συνομιλίας' : 'Ανάλυσης Υπόθεσης'}`}
          >
            {mode === 'case' 
              ? <ChatBubbleIcon className="w-5 h-5 text-brand-text-secondary dark:text-dark-text-secondary group-hover:text-brand-text-primary dark:group-hover:text-dark-text-primary" /> 
              : <ScaleIcon className="w-5 h-5 text-brand-text-secondary dark:text-dark-text-secondary group-hover:text-brand-text-primary dark:group-hover:text-dark-text-primary" />}
          </button>
        
        <div className="ml-auto">
            <button
            onClick={onSubmit}
            disabled={isLoading || !value.trim()}
            className="inline-flex items-center justify-center rounded-full h-11 w-11 bg-brand-dark text-white hover:bg-brand-dark-hover disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-400 dark:bg-dark-accent dark:text-dark-primary dark:hover:bg-sky-300 dark:disabled:bg-slate-700 shadow-sm transition-colors"
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