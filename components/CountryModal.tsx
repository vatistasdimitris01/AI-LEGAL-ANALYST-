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
      // Reset country input when modal opens
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
        className="bg-brand-secondary rounded-xl shadow-2xl p-6 md:p-8 w-full max-w-md m-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center mb-4">
            <ScaleIcon className="w-6 h-6 mr-3 text-brand-accent"/>
            <h2 className="text-xl font-bold text-brand-text">Προσδιορίστε Δικαιοδοσία</h2>
        </div>
        <p className="text-brand-subtle mb-6">
          Για να παρέχουμε ακριβή ανάλυση, παρακαλώ προσδιορίστε τη χώρα της οποίας οι νόμοι ισχύουν για αυτή την υπόθεση.
        </p>
        
        <label htmlFor="country-input" className="block text-sm font-medium text-brand-subtle mb-2">
            Χώρα
        </label>
        <input
          id="country-input"
          type="text"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="π.χ., Ελλάδα, Κύπρος, Γερμανία"
          className="w-full px-4 py-2 bg-brand-primary border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-accent"
          autoFocus
        />
        
        <div className="flex justify-end space-x-3 mt-8">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 bg-slate-100 text-brand-text font-semibold rounded-lg hover:bg-slate-200 transition-colors duration-200 disabled:opacity-50"
          >
            Άκυρο
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading || !country.trim()}
            className="px-4 py-2 bg-brand-accent text-white font-semibold rounded-lg hover:bg-sky-400 transition-colors duration-200 disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Γίνεται ανάλυση...' : 'Ανάλυση Υπόθεσης'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CountryModal;