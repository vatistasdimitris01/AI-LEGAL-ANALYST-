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
import { ROBOTO_REGULAR_BASE64 } from './fonts/RobotoRegular';
import { ROBOTO_BOLD_BASE64 } from './fonts/RobotoBold';

declare const marked: any;
declare const DOMPurify: any;
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
        if (!result) {
            console.error("Downloadable content not found!");
            return;
        }

        const { jsPDF } = jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
        
        // --- FONT SETUP ---
        doc.addFileToVFS('Roboto-Regular.ttf', ROBOTO_REGULAR_BASE64);
        doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
        doc.addFileToVFS('Roboto-Bold.ttf', ROBOTO_BOLD_BASE64);
        doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
        
        // --- HELPERS ---
        const cleanTextForPdf = (md: string): string => {
            if (!md) return '';
            return md
                .replace(/\*\*(.*?)\*\*/g, '$1') // bold
                .replace(/_(.*?)_/g, '$1')     // italic
                .replace(/#+\s(.*?)\n/g, '')  // headers
                .replace(/\[(.*?)\]\((.*?)\)/g, '$1') // links
                .replace(/^\s*[\-\*]\s/gm, '• ') // list items
                .replace(/<\/?[^>]+(>|$)/g, ""); // strip html tags
        };

        const margin = 40;
        const pageHeight = doc.internal.pageSize.getHeight();
        const pageWidth = doc.internal.pageSize.getWidth();
        const usableWidth = pageWidth - 2 * margin;
        let y = margin;

        const checkPageBreak = (heightNeeded: number) => {
            if (y + heightNeeded > pageHeight - margin) {
                doc.addPage();
                y = margin;
            }
        };

        const renderArticle = (item: LegalArticle) => {
            doc.setFont('Roboto', 'bold');
            doc.setFontSize(12);
            const titleLines = doc.splitTextToSize(item.article, usableWidth);
            checkPageBreak(titleLines.length * 14 + 15);
            doc.text(titleLines, margin, y);
            y += titleLines.length * 14 + 5;

            doc.setFont('Roboto', 'normal');
            doc.setFontSize(10);
            const reasoningText = cleanTextForPdf(item.reasoning);
            const reasoningLines = doc.splitTextToSize(reasoningText, usableWidth);
            checkPageBreak(reasoningLines.length * 12 + 20);
            doc.text(reasoningLines, margin, y);
            y += reasoningLines.length * 12 + 20;
        };

        // --- PDF CONTENT ---
        // Title
        doc.setFont('Roboto', 'bold');
        doc.setFontSize(20);
        doc.text("AI Νομική Ανάλυση", pageWidth / 2, y, { align: 'center' });
        y += 40;

        // Case Summary
        doc.setFont('Roboto', 'bold');
        doc.setFontSize(14);
        doc.text("Περίληψη Υπόθεσης", margin, y);
        y += 20;

        doc.setFont('Roboto', 'normal');
        doc.setFontSize(10);
        const summaryText = cleanTextForPdf(result.caseSummary);
        const summaryLines = doc.splitTextToSize(summaryText, usableWidth);
        doc.text(summaryLines, margin, y);
        y += summaryLines.length * 12 + 30;

        // Plaintiff Articles
        checkPageBreak(40);
        doc.setFont('Roboto', 'bold');
        doc.setFontSize(14);
        doc.text("Για τον Ενάγοντα / Κατήγορο", margin, y);
        y += 25;
        result.plaintiffArticles.forEach(renderArticle);

        // Defendant Articles
        checkPageBreak(40);
        doc.setFont('Roboto', 'bold');
        doc.setFontSize(14);
        doc.text("Για τον Εναγόμενο", margin, y);
        y += 25;
        result.defendantArticles.forEach(renderArticle);

        // --- SAVE PDF ---
        doc.save('ai-νομική-ανάλυση.pdf');
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