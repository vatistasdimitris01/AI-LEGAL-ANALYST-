import React, { useState, useRef } from 'react';
import { type AnalysisResult, type LegalArticle } from '../types';
import {
  DownloadIcon,
  ScaleIcon,
  CheckBadgeIcon,
  ShieldExclamationIcon,
  ArrowTopRightOnSquareIcon,
  SparklesIcon,
  ArrowPathIcon
} from './icons/Icons';

declare const marked: any;
declare const DOMPurify: any;
declare const html2canvas: any;
declare const jspdf: any;

const MarkdownRenderer: React.FC<{ content: string, className?: string }> = ({ content, className }) => {
    if (!content) return null;
    const rawMarkup = marked.parse(content);
    const sanitizedMarkup = DOMPurify.sanitize(rawMarkup);
    return <div className={className} dangerouslySetInnerHTML={{ __html: sanitizedMarkup }} />;
};

const ArticleCard: React.FC<{ item: LegalArticle }> = ({ item }) => (
    <div className="bg-brand-primary dark:bg-dark-tertiary p-4 rounded-xl border border-brand-border dark:border-dark-border transition-all hover:shadow-md hover:border-brand-accent/50 dark:hover:border-dark-accent/50">
        {item.link ? (
             <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group font-semibold text-brand-accent dark:text-dark-accent hover:underline inline-flex items-center"
            >
                <h4 className="font-semibold text-brand-text-primary dark:text-dark-text-primary">{item.article}</h4>
                <ArrowTopRightOnSquareIcon className="w-4 h-4 ml-1.5 opacity-60 group-hover:opacity-100 transition-opacity" />
            </a>
        ) : (
             <h4 className="font-semibold text-brand-text-primary dark:text-dark-text-primary">{item.article}</h4>
        )}
        <MarkdownRenderer content={item.reasoning} className="text-brand-text-secondary dark:text-dark-text-secondary text-sm mt-1 prose prose-sm max-w-none prose-chat" />
    </div>
);

interface ResultsDisplayProps {
    result: AnalysisResult;
    onRefine: () => Promise<void>;
    onStartOver: () => void;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ result, onRefine, onStartOver }) => {
    const analysisContentRef = useRef<HTMLDivElement>(null);
    const [isRefining, setIsRefining] = useState(false);

    const handleRefineClick = async () => {
        setIsRefining(true);
        try {
            await onRefine();
        } catch (e) {
            console.error("Refining failed", e);
        } finally {
            setIsRefining(false);
        }
    };
    
    const handleDownload = () => {
        const input = analysisContentRef.current;
        if (!input) {
            console.error("Downloadable content not found!");
            return;
        }

        const buttons = input.querySelector('#action-buttons');
        if (buttons) (buttons as HTMLElement).style.display = 'none';

        html2canvas(input, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
             onclone: (clonedDoc: Document) => {
                clonedDoc.documentElement.classList.remove('dark');
            }
        }).then(canvas => {
            if (buttons) (buttons as HTMLElement).style.display = 'flex';

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jspdf.jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const ratio = canvas.height / canvas.width;
            const imgWidth = pdfWidth - 40;
            const imgHeight = imgWidth * ratio;
            let heightLeft = imgHeight;
            let position = 20;

            pdf.addImage(imgData, 'PNG', 20, position, imgWidth, imgHeight);
            heightLeft -= (pdfHeight - 40);

            while (heightLeft > 0) {
                position = -heightLeft - 20;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 20, position, imgWidth, imgHeight);
                heightLeft -= (pdfHeight - 40);
            }
            pdf.save('ai-νομική-ανάλυση.pdf');
        }).catch(err => {
            console.error("Failed to generate PDF:", err);
            if (buttons) (buttons as HTMLElement).style.display = 'flex';
        });
    };

    return (
        <div className="animate-fade-in space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-brand-accent/10 rounded-full">
                        <ScaleIcon className="w-5 h-5 text-brand-accent"/>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-brand-text-primary dark:text-dark-text-primary">
                            Ανάλυση Υπόθεσης
                        </h2>
                        <p className="text-sm text-brand-text-secondary dark:text-dark-text-secondary">Αυτή είναι μια σύνοψη της υπόθεσής σας.</p>
                    </div>
                 </div>
                 <div className="flex space-x-3 w-full sm:w-auto self-end sm:self-center" id="action-buttons">
                    <button
                        onClick={handleRefineClick}
                        disabled={isRefining}
                        className="flex-1 sm:flex-none flex items-center justify-center bg-brand-accent/10 hover:bg-brand-accent/20 text-brand-accent font-semibold py-1.5 px-4 rounded-lg transition-colors duration-200 text-sm border border-brand-accent/20 disabled:opacity-50"
                    >
                        {isRefining ? (
                            <div className="w-5 h-5 border-2 border-brand-accent border-t-transparent rounded-full animate-spin mr-2"></div>
                        ) : (
                            <SparklesIcon className="w-5 h-5 mr-2" />
                        )}
                        {isRefining ? 'Βελτίωση...' : 'Βελτίωση με AI'}
                    </button>
                    <button
                        onClick={handleDownload}
                        className="flex-1 sm:flex-none flex items-center justify-center bg-brand-secondary dark:bg-dark-secondary hover:bg-brand-tertiary dark:hover:bg-dark-tertiary text-brand-text-primary dark:text-dark-text-primary font-semibold py-1.5 px-4 rounded-lg transition-colors duration-200 text-sm border border-brand-border dark:border-dark-border"
                    >
                        <DownloadIcon className="w-5 h-5 mr-2" />
                        Λήψη PDF
                    </button>
                    <button
                        onClick={onStartOver}
                        className="flex-1 sm:flex-none flex items-center justify-center bg-brand-secondary dark:bg-dark-secondary hover:bg-brand-tertiary dark:hover:bg-dark-tertiary text-brand-text-primary dark:text-dark-text-primary font-semibold py-1.5 px-4 rounded-lg transition-colors duration-200 text-sm border border-brand-border dark:border-dark-border"
                        title="Start New Analysis"
                    >
                         <ArrowPathIcon className="w-5 h-5" />
                    </button>
                 </div>
            </div>

            <div className="bg-brand-secondary/70 dark:bg-dark-secondary p-4 sm:p-5 rounded-2xl border border-brand-border/80 dark:border-dark-border/80" ref={analysisContentRef}>
                <div className="space-y-6">
                    <div>
                        <h3 className="text-base font-semibold mb-2 text-brand-text-primary dark:text-dark-text-primary">Περίληψη Υπόθεσης</h3>
                        <MarkdownRenderer content={result.caseSummary} className="prose prose-sm max-w-none prose-chat prose-custom text-brand-text-secondary dark:text-dark-text-secondary" />
                    </div>
                  
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="text-base font-semibold mb-3 text-brand-text-primary dark:text-dark-text-primary flex items-center">
                                <CheckBadgeIcon className="w-5 h-5 mr-2 text-accent-green dark:text-dark-accent-green" />
                                Για τον Ενάγοντα / Κατήγορο
                            </h3>
                            <div className="space-y-4">
                                {result.plaintiffArticles.map((item, index) => <ArticleCard key={`plaintiff-${index}`} item={item} />)}
                            </div>
                        </div>
                        <div>
                            <h3 className="text-base font-semibold mb-3 text-brand-text-primary dark:text-dark-text-primary flex items-center">
                                <ShieldExclamationIcon className="w-5 h-5 mr-2 text-accent-orange dark:text-dark-accent-orange" />
                                Για τον Εναγόμενο
                            </h3>
                            <div className="space-y-4">
                                {result.defendantArticles.map((item, index) => <ArticleCard key={`defendant-${index}`} item={item} />)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResultsDisplay;
