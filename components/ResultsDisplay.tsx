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

    const buttons = input.querySelector('#action-buttons');
    if (buttons) {
        (buttons as HTMLElement).style.display = 'none';
    }

    html2canvas(input, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#f8fafc'
    }).then(canvas => {
        if (buttons) {
            (buttons as HTMLElement).style.display = 'flex';
        }

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jspdf.jsPDF({
            orientation: 'portrait',
            unit: 'pt',
            format: 'a4'
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const ratio = canvasHeight / canvasWidth;
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
        if (buttons) {
            (buttons as HTMLElement).style.display = 'flex';
        }
    });
  };
  
  const ArticleCard: React.FC<{ item: LegalArticle }> = ({ item }) => (
    <div className="bg-brand-secondary p-4 rounded-lg border border-brand-border">
        {item.link ? (
             <a 
                href={item.link} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="group font-semibold text-brand-accent hover:underline inline-flex items-center"
            >
                <h4 className="font-semibold text-brand-accent">{item.article}</h4>
                <ArrowTopRightOnSquareIcon className="w-4 h-4 ml-1.5 opacity-60 group-hover:opacity-100 transition-opacity" />
            </a>
        ) : (
             <h4 className="font-semibold text-brand-accent">{item.article}</h4>
        )}
        <MarkdownRenderer content={item.reasoning} className="text-brand-subtle text-sm mt-1 prose prose-sm max-w-none" />
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in" id="analysis-content-to-download">
        <div className="flex justify-between items-center" id="action-buttons">
             <h2 className="text-2xl font-bold text-brand-text flex items-center">
                <ScaleIcon className="w-7 h-7 mr-3 text-brand-accent"/>
                Η Ανάλυση Ολοκληρώθηκε
             </h2>
             <div className="flex space-x-2">
                <button
                    onClick={handleDownload}
                    className="flex items-center bg-slate-100 hover:bg-slate-200 text-brand-text font-semibold py-2 px-4 rounded-lg transition-colors duration-200 text-sm border border-slate-300"
                >
                    <DownloadIcon className="w-5 h-5 mr-2" />
                    Λήψη PDF
                </button>
                <button
                    onClick={onReset}
                    className="flex items-center bg-brand-accent hover:bg-sky-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 text-sm"
                >
                    <ArrowPathIcon className="w-5 h-5 mr-2" />
                    Νέα Ανάλυση
                </button>
             </div>
        </div>

      <div className="bg-brand-secondary p-6 rounded-xl border border-brand-border">
        <h3 className="text-xl font-semibold mb-3 text-brand-text">Περίληψη Υπόθεσης</h3>
        <MarkdownRenderer content={analysis.caseSummary} className="text-brand-subtle prose max-w-none" />
      </div>
      
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-xl font-semibold mb-4 text-brand-text flex items-center">
            <CheckBadgeIcon className="w-6 h-6 mr-2 text-green-400" />
            Για τον Ενάγοντα / Κατήγορο
          </h3>
          <div className="space-y-4">
            {analysis.plaintiffArticles.map((item, index) => <ArticleCard key={`plaintiff-${index}`} item={item} />)}
          </div>
        </div>
        <div>
          <h3 className="text-xl font-semibold mb-4 text-brand-text flex items-center">
            <ShieldExclamationIcon className="w-6 h-6 mr-2 text-yellow-400" />
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