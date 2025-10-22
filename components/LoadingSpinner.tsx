
import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 space-y-4 animate-fade-in">
      <div className="relative w-16 h-16">
        <div className="absolute top-0 left-0 w-full h-full border-4 border-slate-200 dark:border-slate-700 rounded-full"></div>
        <div className="absolute top-0 left-0 w-full h-full border-t-4 border-brand-accent dark:border-dark-accent rounded-full animate-spin"></div>
      </div>
      <p className="text-brand-text-secondary dark:text-dark-text-secondary animate-pulse-fast">Αναλύεται η υπόθεσή σας...</p>
    </div>
  );
};

export default LoadingSpinner;