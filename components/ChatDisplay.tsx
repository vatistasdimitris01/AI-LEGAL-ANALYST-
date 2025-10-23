import React, { useState, useRef } from 'react';
import { type ChatMessage, type AnalysisResult, type LegalArticle } from '../types';
import { UserIcon, AiIcon, CopyIcon, SquarePenIcon, RotateCcwIcon, ArrowPathIcon, DownloadIcon, ScaleIcon, CheckBadgeIcon, ShieldExclamationIcon, ArrowTopRightOnSquareIcon } from './icons/Icons';

declare const marked: any;
declare const DOMPurify: any;
declare const html2canvas: any;
declare const jspdf: any;

const MarkdownRenderer: React.FC<{ content: string, className?: string }> = ({ content, className }) => {
    const rawMarkup = marked.parse(content || '');
    const sanitizedMarkup = DOMPurify.sanitize(rawMarkup);
    return <div className={`prose prose-chat max-w-none ${className || ''}`} dangerouslySetInnerHTML={{ __html: sanitizedMarkup }} />;
};

// --- Analysis Card Component ---
const AnalysisCard: React.FC<{ analysis: AnalysisResult }> = ({ analysis }) => {
    const analysisContentRef = useRef<HTMLDivElement>(null);

    const handleDownload = () => {
        const input = analysisContentRef.current;
        if (!input) {
            console.error("Downloadable content not found!");
            return;
        }

        const buttons = input.querySelector('#action-buttons');
        if (buttons) (buttons as HTMLElement).style.display = 'none';

        const isDarkMode = document.documentElement.classList.contains('dark');
        const backgroundColor = isDarkMode ? '#121212' : '#ffffff';

        html2canvas(input, {
            scale: 2,
            useCORS: true,
            backgroundColor: backgroundColor,
            onclone: (clonedDoc: Document) => {
                if(isDarkMode) {
                    clonedDoc.querySelectorAll('.dark\\:text-dark-text-primary').forEach(el => (el as HTMLElement).style.color = '#FFFFFF');
                    clonedDoc.querySelectorAll('.dark\\:text-dark-text-secondary').forEach(el => (el as HTMLElement).style.color = '#AFAFAF');
                    clonedDoc.querySelectorAll('.dark\\:text-dark-accent-green').forEach(el => (el as HTMLElement).style.color = '#1AD977');
                    clonedDoc.querySelectorAll('.dark\\:text-dark-accent-orange').forEach(el => (el as HTMLElement).style.color = '#FF926C');
                }
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

    return (
        <div className="flex items-start gap-3 justify-start animate-slide-up">
             <div className="flex-shrink-0 w-7 h-7 rounded-full bg-brand-secondary dark:bg-dark-secondary flex items-center justify-center border border-brand-border dark:border-dark-border">
                <AiIcon className="w-5 h-5 text-brand-text-secondary dark:text-dark-text-secondary"/>
            </div>
            <div className="w-full max-w-[85%] bg-ai-bubble dark:bg-dark-ai-bubble p-4 sm:p-5 rounded-2xl rounded-bl-lg" ref={analysisContentRef}>
                 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                     <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-brand-accent/10 rounded-full">
                            <ScaleIcon className="w-5 h-5 text-brand-accent"/>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-brand-text-primary dark:text-dark-text-primary">
                                Ανάλυση Υπόθεσης
                            </h2>
                            <p className="text-sm text-brand-text-secondary dark:text-dark-text-secondary">Αυτή είναι μια σύνοψη της υπόθεσής σας.</p>
                        </div>
                     </div>
                     <div className="flex space-x-3 w-full sm:w-auto self-end sm:self-center" id="action-buttons">
                        <button
                            onClick={handleDownload}
                            className="flex-1 sm:flex-none flex items-center justify-center bg-brand-secondary dark:bg-dark-secondary hover:bg-brand-tertiary dark:hover:bg-dark-tertiary text-brand-text-primary dark:text-dark-text-primary font-semibold py-1.5 px-4 rounded-lg transition-colors duration-200 text-sm border border-brand-border dark:border-dark-border"
                        >
                            <DownloadIcon className="w-5 h-5 mr-2" />
                            Λήψη PDF
                        </button>
                     </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-brand-primary dark:bg-dark-secondary/80 p-4 rounded-xl border border-brand-border dark:border-dark-border">
                        <h3 className="text-base font-semibold mb-2 text-brand-text-primary dark:text-dark-text-primary">Περίληψη Υπόθεσης</h3>
                        <MarkdownRenderer content={analysis.caseSummary} className="text-brand-text-secondary dark:text-dark-text-secondary prose max-w-none prose-chat prose-custom" />
                    </div>
                  
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="text-base font-semibold mb-3 text-brand-text-primary dark:text-dark-text-primary flex items-center">
                                <CheckBadgeIcon className="w-5 h-5 mr-2 text-accent-green dark:text-dark-accent-green" />
                                Για τον Ενάγοντα / Κατήγορο
                            </h3>
                            <div className="space-y-4">
                                {analysis.plaintiffArticles.map((item, index) => <ArticleCard key={`plaintiff-${index}`} item={item} />)}
                            </div>
                        </div>
                        <div>
                            <h3 className="text-base font-semibold mb-3 text-brand-text-primary dark:text-dark-text-primary flex items-center">
                                <ShieldExclamationIcon className="w-5 h-5 mr-2 text-accent-orange dark:text-dark-accent-orange" />
                                Για τον Εναγόμενο
                            </h3>
                            <div className="space-y-4">
                                {analysis.defendantArticles.map((item, index) => <ArticleCard key={`defendant-${index}`} item={item} />)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Text Message Component ---
interface MessageProps {
    message: ChatMessage;
    isLastMessage: boolean;
    onEdit: (id: string, newContent: string) => void;
    onRegenerate: () => void;
}

const Message: React.FC<MessageProps> = ({ message, isLastMessage, onEdit, onRegenerate }) => {
    const [isEditing, setIsEditing] = useState(false);
    
    if (message.type === 'analysis') {
         return <AnalysisCard analysis={message.content} />;
    }

    const [editText, setEditText] = useState(message.content);

    const handleCopy = () => {
        navigator.clipboard.writeText(message.content);
    };

    const handleSaveEdit = () => {
        if (editText.trim() && editText !== message.content) {
            onEdit(message.id, editText);
        }
        setIsEditing(false);
    };
    
    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSaveEdit();
        }
    };

    const isUser = message.role === 'user';
    const bubbleClass = isUser 
      ? 'bg-user-bubble dark:bg-dark-user-bubble rounded-br-lg text-brand-text-inverted' 
      : 'bg-ai-bubble dark:bg-dark-ai-bubble rounded-bl-lg text-brand-text-primary dark:text-dark-text-primary';
    const textClass = isUser ? 'prose-chat-user-inverted' : '';


    return (
        <div className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'} animate-slide-up`}>
            {!isUser && (
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-brand-secondary dark:bg-dark-secondary flex items-center justify-center border border-brand-border dark:border-dark-border">
                    <AiIcon className="w-5 h-5 text-brand-text-secondary dark:text-dark-text-secondary"/>
                </div>
            )}

            <div className={`group relative w-full max-w-[85%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                 <div className={`relative px-4 py-3 rounded-2xl ${bubbleClass}`}>
                    {isEditing ? (
                        <div className="flex flex-col gap-2">
                             <textarea
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="w-full bg-transparent focus:outline-none text-brand-text-inverted resize-none"
                                rows={Math.max(3, editText.split('\n').length)}
                                autoFocus
                             />
                             <div className="flex justify-end gap-2">
                                <button onClick={() => setIsEditing(false)} className="text-xs font-semibold px-2 py-1 rounded hover:bg-black/10">Άκυρο</button>
                                <button onClick={handleSaveEdit} className="text-xs font-semibold px-2 py-1 rounded bg-white text-brand-accent hover:bg-white/90">Αποθήκευση</button>
                             </div>
                        </div>
                    ) : (
                         <MarkdownRenderer content={message.content} className={textClass} />
                    )}
                 </div>
                 <div className="h-7 mt-1 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isUser && (
                         <button onClick={() => setIsEditing(true)} title="Επεξεργασία" className="p-1 text-brand-text-secondary dark:text-dark-text-secondary hover:text-brand-text-primary dark:hover:text-dark-text-primary hover:bg-brand-secondary dark:hover:bg-dark-secondary rounded-full">
                            <SquarePenIcon className="w-3.5 h-3.5" />
                         </button>
                    )}
                    <button onClick={handleCopy} title="Αντιγραφή" className="p-1 text-brand-text-secondary dark:text-dark-text-secondary hover:text-brand-text-primary dark:hover:text-dark-text-primary hover:bg-brand-secondary dark:hover:bg-dark-secondary rounded-full">
                         <CopyIcon className="w-3.5 h-3.5" />
                    </button>
                     {!isUser && isLastMessage && (
                        <button onClick={onRegenerate} title="Επανάληψη δημιουργίας" className="p-1 text-brand-text-secondary dark:text-dark-text-secondary hover:text-brand-text-primary dark:hover:text-dark-text-primary hover:bg-brand-secondary dark:hover:bg-dark-secondary rounded-full">
                           <RotateCcwIcon className="w-3.5 h-3.5" />
                        </button>
                     )}
                 </div>
            </div>

            {isUser && (
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-brand-accent flex items-center justify-center">
                    <UserIcon className="w-5 h-5 text-white"/>
                </div>
            )}
        </div>
    );
};

// --- Main Chat Display Component ---
interface ChatDisplayProps {
    history: ChatMessage[];
    onEdit: (id: string, newContent: string) => void;
    onRegenerate: () => void;
    isLoading: boolean;
    onStartOver: () => void;
}

const ChatDisplay: React.FC<ChatDisplayProps> = ({ history, onEdit, onRegenerate, isLoading, onStartOver }) => {
    return (
        <div className="space-y-8">
             <div className="flex justify-end animate-fade-in">
                <button
                    onClick={onStartOver}
                    className="flex items-center bg-brand-secondary dark:bg-dark-secondary hover:bg-brand-tertiary dark:hover:bg-dark-tertiary text-brand-text-primary dark:text-dark-text-primary font-semibold py-2 px-4 rounded-lg transition-colors duration-200 text-sm border border-brand-border dark:border-dark-border"
                >
                    <ArrowPathIcon className="w-4 h-4 mr-2" />
                    Αρχή από την αρχή
                </button>
             </div>
            {history.map((msg, index) => (
                <Message 
                    key={msg.id}
                    message={msg}
                    isLastMessage={index === history.length - 1 && !isLoading && msg.type === 'text'}
                    onEdit={onEdit}
                    onRegenerate={onRegenerate}
                />
            ))}
            {isLoading && history[history.length-1]?.role !== 'user' && ( // Show loading indicator only when AI is "thinking"
                 <div className="flex items-start gap-3 justify-start animate-slide-up">
                     <div className="flex-shrink-0 w-7 h-7 rounded-full bg-brand-secondary dark:bg-dark-secondary flex items-center justify-center border border-brand-border dark:border-dark-border">
                         <AiIcon className="w-5 h-5 text-brand-text-secondary dark:text-dark-text-secondary"/>
                     </div>
                     <div className="px-4 py-3 rounded-2xl rounded-bl-lg bg-ai-bubble dark:bg-dark-ai-bubble">
                        <div className="flex items-center gap-2 text-brand-text-secondary dark:text-dark-text-secondary">
                             <div className="w-2 h-2 bg-brand-text-tertiary dark:bg-dark-text-tertiary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                             <div className="w-2 h-2 bg-brand-text-tertiary dark:bg-dark-text-tertiary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                             <div className="w-2 h-2 bg-brand-text-tertiary dark:bg-dark-text-tertiary rounded-full animate-bounce"></div>
                        </div>
                     </div>
                 </div>
            )}
        </div>
    );
};

export default ChatDisplay;