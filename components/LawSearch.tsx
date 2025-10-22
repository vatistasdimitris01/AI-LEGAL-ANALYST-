import React, { useState } from 'react';
import { searchLaws } from '../services/geminiService';
import { BookOpenIcon, LinkIcon, ArrowTopRightOnSquareIcon } from './icons/Icons';

declare const marked: any;
declare const DOMPurify: any;

interface ParsedResult {
    mainContent: string;
    sourceUrl: string | null;
    sourceDomain: string | null;
}

const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
    if (!content) return null;
    const rawMarkup = marked.parse(content);
    const sanitizedMarkup = DOMPurify.sanitize(rawMarkup);
    return <div className="prose law-library-results max-w-none" dangerouslySetInnerHTML={{ __html: sanitizedMarkup }} />;
};

const LawLibrary: React.FC = () => {
    const [parsedResult, setParsedResult] = useState<ParsedResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const [hasSearched, setHasSearched] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;
        setIsLoading(true);
        setError(null);
        setParsedResult(null);
        setHasSearched(true);
        try {
            const response = await searchLaws(query);
            
            const sourceRegex = /\*\*Πηγή:\*\*\s*(https?:\/\/[^\s]+)/;
            const match = response.match(sourceRegex);

            let mainContent = response;
            let sourceUrl: string | null = null;
            let sourceDomain: string | null = null;

            if (match && match[1]) {
                sourceUrl = match[1];
                mainContent = response.replace(sourceRegex, '').trim();
                try {
                    const url = new URL(sourceUrl);
                    sourceDomain = url.hostname.replace(/^www\./, '');
                } catch (e) {
                    console.error("Invalid URL for source:", sourceUrl);
                    sourceDomain = 'Εξωτερικός Σύνδεσμος';
                }
            }
            setParsedResult({ mainContent, sourceUrl, sourceDomain });

        } catch (err) {
            setError('Παρουσιάστηκε σφάλμα κατά την αναζήτηση.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full space-y-8 animate-fade-in">
            <div className="text-center pt-4 animate-slide-up">
                <div className="inline-block p-4 bg-brand-accent/10 rounded-full">
                    <BookOpenIcon className="w-12 h-12 mx-auto text-brand-accent" />
                </div>
                <h2 className="text-3xl font-bold mt-4 mb-2 text-brand-text-primary dark:text-dark-text-primary">Νομική Βιβλιοθήκη</h2>
                <p className="text-brand-text-secondary dark:text-dark-text-secondary max-w-xl mx-auto">
                    Εξερευνήστε βασικά άρθρα ή αναζητήστε συγκεκριμένους νόμους και κώδικες.
                </p>
            </div>
            
            <div className="max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '100ms' }}>
                <form onSubmit={handleSearch} className="flex items-center gap-3">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="άρθρο 1507"
                        className="w-full px-5 py-3 bg-brand-secondary dark:bg-dark-secondary border border-brand-border dark:border-dark-border rounded-full focus:outline-none focus:ring-2 focus:ring-brand-accent dark:focus:ring-dark-accent shadow-sm"
                    />
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="px-6 py-3 bg-brand-dark text-white font-semibold rounded-full hover:bg-brand-dark-hover transition-colors disabled:opacity-50 flex-shrink-0 shadow-sm"
                    >
                        {isLoading ? '...' : 'Αναζήτηση'}
                    </button>
                </form>

                <div className="mt-8">
                    {isLoading && <p className="text-center text-brand-text-secondary dark:text-dark-text-secondary py-4">Αναζήτηση σε εξέλιξη...</p>}
                    {error && <p className="text-center text-red-500 dark:text-red-400 text-sm py-4">{error}</p>}
                    {parsedResult && parsedResult.mainContent && (
                        <div className="bg-brand-secondary dark:bg-dark-secondary p-6 sm:p-8 rounded-2xl border border-brand-border dark:border-dark-border shadow-sm animate-fade-in">
                             <MarkdownRenderer content={parsedResult.mainContent} />
                             {parsedResult.sourceUrl && (
                                 <div className="mt-6 pt-4 border-t border-brand-border dark:border-dark-border">
                                     <h4 className="text-sm font-semibold text-brand-text-secondary dark:text-dark-text-secondary mb-2">Πηγή</h4>
                                     <a 
                                        href={parsedResult.sourceUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="flex items-center gap-3 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 p-3 rounded-lg border border-brand-border dark:border-dark-border transition-colors w-full"
                                     >
                                        <LinkIcon className="w-5 h-5 text-brand-accent dark:text-dark-accent flex-shrink-0" />
                                        <span className="text-brand-accent dark:text-dark-accent font-semibold truncate text-sm">{parsedResult.sourceDomain}</span>
                                        <ArrowTopRightOnSquareIcon className="w-4 h-4 text-brand-text-secondary dark:text-dark-text-secondary ml-auto flex-shrink-0" />
                                     </a>
                                 </div>
                             )}
                        </div>
                    )}
                    {hasSearched && !isLoading && !parsedResult?.mainContent && !error && <p className="text-center text-brand-text-secondary dark:text-dark-text-secondary py-4">Δεν βρέθηκαν αποτελέσματα για το ερώτημά σας.</p>}
                </div>
            </div>
        </div>
    );
};

export default LawLibrary;