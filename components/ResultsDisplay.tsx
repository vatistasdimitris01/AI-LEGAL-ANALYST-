import React from 'react';
import { type AnalysisResult, type LegalArticle } from '../types';
import { DownloadIcon, ArrowPathIcon, ScaleIcon, CheckBadgeIcon, ShieldExclamationIcon, ArrowTopRightOnSquareIcon } from './icons/Icons';

declare const html2canvas: any;
declare const jspdf: any;
declare const marked: any;
declare const DOMPurify: any;

interface ResultsDisplayProps {
  analysis: AnalysisResult;
  onReset: () => void;
}

const MarkdownRenderer: React.FC<{ content: string, className?: string }> = ({ content, className }) => {
    const rawMarkup = marked.parse(content || '');
    const sanitizedMarkup = DOMPurify.sanitize(rawMarkup);
    return <div className={className} dangerouslySetInnerHTML={{ __html: sanitizedMarkup }} />;
};

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ analysis, onReset }) => {
  
  const handleDownload = () => {
    const input = document.getElementById('analysis-content-to-download');
    if (!input) {
        console.error("Downloadable content not found!");
        return;
    };
    
    // Temporarily hide buttons for screenshot
    const buttons = input.querySelector('#action-buttons');
    if (buttons) (buttons as HTMLElement).style.display = 'none';

    // Get current theme to set PDF background color
    const isDarkMode = document.documentElement.classList.contains('dark');
    const backgroundColor = isDarkMode ? '#1e293b' : '#ffffff';
    const textColor = isDarkMode ? '#f1f5f9' : '#0f172a';
    
    // Temporarily set text color for canvas rendering if in dark mode
    if(isDarkMode) {
      input.querySelectorAll('.dark\\:text-dark-text-primary').forEach(el => (el as HTMLElement).style.color = textColor);
      input.querySelectorAll('.dark\\:text-dark-text-secondary').forEach(el => (el as HTMLElement).style.color = '#cbd5e1'); // A lighter secondary for PDF
    }

    html2canvas(input, {
        scale: 2,
        useCORS: true,
        backgroundColor: backgroundColor,
    }).then(canvas => {
        // Restore buttons and styles
        if (buttons) (buttons as HTMLElement).style.display = 'flex';
        if (isDarkMode) {
            input.querySelectorAll('[style]').forEach(el => el.removeAttribute('style'));
        }

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
        // Ensure buttons and styles are restored on error
        if (buttons) (buttons as HTMLElement).style.display = 'flex';
        if (isDarkMode) {
            input.querySelectorAll('[style]').forEach(el => el.removeAttribute('style'));
        }
    });
  };
  
  const ArticleCard: React.FC<{ item: LegalArticle }> = ({ item }) => (
    <div className="bg-brand-secondary dark:bg-dark-secondary p-4 rounded-lg border border-brand-border dark:border-dark-border transition-all hover:shadow-md hover:border-brand-accent/50 dark:hover:border-dark-accent/50">
        {item.link ? (
             <a 
                href={item.link} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="group font-semibold text-brand-accent dark:text-dark-accent hover:underline inline-flex items-center"
            >
                <h4 className="font-semibold">{item.article}</h4>
                <ArrowTopRightOnSquareIcon className="w-4 h-4 ml-1.5 opacity-60 group-hover:opacity-100 transition-opacity" />
            </a>
        ) : (
             <h4 className="font-semibold text-brand-accent dark:text-dark-accent">{item.article}</h4>
        )}
        <MarkdownRenderer content={item.reasoning} className="text-brand-text-secondary dark:text-dark-text-secondary text-sm mt-1 prose prose-sm max-w-none prose-chat" />
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in" id="analysis-content-to-download">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
             <h2 className="text-2xl font-bold text-brand-text-primary dark:text-dark-text-primary flex items-center">
                <ScaleIcon className="w-7 h-7 mr-3 text-brand-accent dark:text-dark-accent"/>
                Η Ανάλυση Ολοκληρώθηκε
             </h2>
             <div className="flex space-x-2 w-full sm:w-auto" id="action-buttons">
                <button
                    onClick={handleDownload}
                    className="flex-1 sm:flex-none flex items-center justify-center bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-brand-text-primary dark:text-dark-text-primary font-semibold py-2 px-4 rounded-lg transition-colors duration-200 text-sm border border-slate-300 dark:border-slate-600"
                >
                    <DownloadIcon className="w-5 h-5 mr-2" />
                    Λήψη PDF
                </button>
                <button
                    onClick={onReset}
                    className="flex-1 sm:flex-none flex items-center justify-center bg-brand-accent hover:bg-brand-accent-dark text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 text-sm"
                >
                    <ArrowPathIcon className="w-5 h-5 mr-2" />
                    Νέα Ανάλυση
                </button>
             </div>
        </div>

      <div className="bg-brand-secondary dark:bg-dark-secondary p-6 rounded-xl border border-brand-border dark:border-dark-border shadow-sm">
        <h3 className="text-xl font-semibold mb-3 text-brand-text-primary dark:text-dark-text-primary">Περίληψη Υπόθεσης</h3>
        <MarkdownRenderer content={analysis.caseSummary} className="text-brand-text-secondary dark:text-dark-text-secondary prose max-w-none prose-chat" />
      </div>
      
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-xl font-semibold mb-4 text-brand-text-primary dark:text-dark-text-primary flex items-center">
            <CheckBadgeIcon className="w-6 h-6 mr-2 text-green-500" />
            Για τον Ενάγοντα / Κατήγορο
          </h3>
          <div className="space-y-4">
            {analysis.plaintiffArticles.map((item, index) => <ArticleCard key={`plaintiff-${index}`} item={item} />)}
          </div>
        </div>
        <div>
          <h3 className="text-xl font-semibold mb-4 text-brand-text-primary dark:text-dark-text-primary flex items-center">
            <ShieldExclamationIcon className="w-6 h-6 mr-2 text-yellow-500" />
            Για τον Εναγόμενο
          </h3>
          <div className="space-y-4">
            {analysis.defendantArticles.map((item, index) => <ArticleCard key={`defendant-${index}`} item={item} />)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsDisplay;