import React, { useState } from 'react';
import { type ChatMessage } from '../types';
import { UserIcon, AiIcon, CopyIcon, SquarePenIcon, RotateCcwIcon, ArrowPathIcon } from './icons/Icons';

declare const marked: any;
declare const DOMPurify: any;

const MarkdownRenderer: React.FC<{ content: string, className?: string }> = ({ content, className }) => {
    const rawMarkup = marked.parse(content || '');
    const sanitizedMarkup = DOMPurify.sanitize(rawMarkup);
    return <div className={`prose prose-chat max-w-none ${className || ''}`} dangerouslySetInnerHTML={{ __html: sanitizedMarkup }} />;
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
            {history.map((msg, index) => {
                const isLastEmptyAiMessageWhileLoading = isLoading && index === history.length - 1 && msg.role === 'ai' && !msg.content;
                if (isLastEmptyAiMessageWhileLoading) {
                    return null;
                }
                return (
                    <Message 
                        key={msg.id}
                        message={msg}
                        isLastMessage={index === history.length - 1 && !isLoading}
                        onEdit={onEdit}
                        onRegenerate={onRegenerate}
                    />
                );
            })}
            {isLoading && history[history.length-1]?.role !== 'user' && (
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
