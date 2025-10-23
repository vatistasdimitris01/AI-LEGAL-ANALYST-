import React, { useState, useEffect } from 'react';
import { ScaleIcon } from './icons/Icons';

interface CountryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (country: string) => void;
  isLoading: boolean;
}

const CountryModal: React.FC<CountryModalProps> = ({ isOpen, onClose, onConfirm, isLoading }) => {
  const [country, setCountry] = useState('');

  useEffect(() => {
    if (isOpen) {
      setCountry('');
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleConfirm = () => {
    if (country.trim()) {
      onConfirm(country.trim());
    }
  };
  
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleConfirm();
    }
  };


  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-brand-primary dark:bg-dark-secondary rounded-xl shadow-2xl p-5 md:p-6 w-full max-w-md m-4 animate-slide-up border border-brand-border dark:border-dark-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center mb-4">
            <div className="p-1.5 bg-brand-accent/10 rounded-full mr-3">
                <ScaleIcon className="w-5 h-5 text-brand-accent"/>
            </div>
            <h2 className="text-lg font-bold text-brand-text-primary dark:text-dark-text-primary">Προσδιορίστε Δικαιοδοσία</h2>
        </div>
        <p className="text-brand-text-secondary dark:text-dark-text-secondary mb-5 text-sm">
          Για να παρέχουμε ακριβή ανάλυση, παρακαλώ προσδιορίστε τη χώρα της οποίας οι νόμοι ισχύουν για αυτή την υπόθεση.
        </p>
        
        <label htmlFor="country-input" className="block text-sm font-medium text-brand-text-secondary dark:text-dark-text-secondary mb-2">
            Χώρα
        </label>
        <input
          id="country-input"
          type="text"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="π.χ., Ελλάδα, Κύπρος, Γερμανία"
          className="w-full px-3 py-2 bg-brand-primary dark:bg-dark-primary border border-brand-border dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-accent dark:focus:ring-dark-accent"
          autoFocus
        />
        
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 bg-brand-secondary dark:bg-dark-secondary text-brand-text-primary dark:text-dark-text-primary font-semibold rounded-lg hover:bg-brand-tertiary dark:hover:bg-dark-tertiary transition-colors duration-200 disabled:opacity-50 border border-brand-border dark:border-dark-border text-sm"
          >
            Άκυρο
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading || !country.trim()}
            className="px-4 py-2 bg-brand-accent text-white font-semibold rounded-lg hover:bg-brand-accent-dark transition-colors duration-200 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed shadow-sm text-sm"
          >
            {isLoading ? 'Γίνεται ανάλυση...' : 'Ανάλυση Υπόθεσης'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CountryModal;
