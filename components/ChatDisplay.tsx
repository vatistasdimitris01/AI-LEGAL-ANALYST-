import React, { useState } from 'react';
import { type ChatMessage } from '../types';
import { UserIcon, AiIcon, CopyIcon, SquarePenIcon, RotateCcwIcon, ArrowPathIcon } from './icons/Icons';

declare const marked: any;
declare const DOMPurify: any;

const MarkdownRenderer: React.FC<{ content: string, className?: string }> = ({ content, className }) => {
    const rawMarkup = marked.parse(content || '');
    const sanitizedMarkup = DOMPurify.sanitize(rawMarkup);
    return <div className={`prose prose-chat max-w-none text-brand-text-primary dark:text-dark-text-primary ${className || ''}`} dangerouslySetInnerHTML={{ __html: sanitizedMarkup }} />;
};

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
    const Icon = isUser ? UserIcon : AiIcon;
    const bubbleClass = isUser 
      ? 'bg-user-bubble dark:bg-dark-user-bubble rounded-br-lg' 
      : 'bg-ai-bubble dark:bg-dark-ai-bubble rounded-bl-lg';
    const textClass = isUser ? 'prose-chat-user-inverted' : '';


    return (
        <div className={`flex items-start gap-4 ${isUser ? 'justify-end' : 'justify-start'} animate-slide-up`}>
            {!isUser && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-border dark:bg-dark-border flex items-center justify-center">
                    <Icon className="w-5 h-5 text-brand-text-secondary dark:text-dark-text-secondary"/>
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
                                className="w-full bg-transparent focus:outline-none text-brand-text-primary dark:text-dark-text-primary resize-none"
                                rows={Math.max(3, editText.split('\n').length)}
                                autoFocus
                             />
                             <div className="flex justify-end gap-2">
                                <button onClick={() => setIsEditing(false)} className="text-xs font-semibold px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600">Άκυρο</button>
                                <button onClick={handleSaveEdit} className="text-xs font-semibold px-2 py-1 rounded bg-brand-dark text-white hover:bg-brand-dark-hover">Αποθήκευση</button>
                             </div>
                        </div>
                    ) : (
                         <MarkdownRenderer content={message.content} className={textClass} />
                    )}
                 </div>
                 <div className="h-7 mt-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isUser && (
                         <button onClick={() => setIsEditing(true)} title="Επεξεργασία" className="p-1 text-brand-text-secondary dark:text-dark-text-secondary hover:text-brand-text-primary dark:hover:text-dark-text-primary hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full">
                            <SquarePenIcon className="w-4 h-4" />
                         </button>
                    )}
                    <button onClick={handleCopy} title="Αντιγραφή" className="p-1 text-brand-text-secondary dark:text-dark-text-secondary hover:text-brand-text-primary dark:hover:text-dark-text-primary hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full">
                         <CopyIcon className="w-4 h-4" />
                    </button>
                     {!isUser && isLastMessage && (
                        <button onClick={onRegenerate} title="Επανάληψη δημιουργίας" className="p-1 text-brand-text-secondary dark:text-dark-text-secondary hover:text-brand-text-primary dark:hover:text-dark-text-primary hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full">
                           <RotateCcwIcon className="w-4 h-4" />
                        </button>
                     )}
                 </div>
            </div>

            {isUser && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-accent flex items-center justify-center">
                    <UserIcon className="w-5 h-5 text-white"/>
                </div>
            )}
        </div>
    );
};


interface ChatDisplayProps {
    history: ChatMessage[];
    onEdit: (id: string, newContent: string) => void;
    onRegenerate: () => void;
    isLoading: boolean;
    onNewChat: () => void;
}

const ChatDisplay: React.FC<ChatDisplayProps> = ({ history, onEdit, onRegenerate, isLoading, onNewChat }) => {
    return (
        <div className="space-y-6">
             <div className="flex justify-end animate-fade-in">
                <button
                    onClick={onNewChat}
                    className="flex items-center bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-brand-text-primary dark:text-dark-text-primary font-semibold py-2 px-4 rounded-lg transition-colors duration-200 text-sm border border-slate-300 dark:border-slate-600"
                >
                    <ArrowPathIcon className="w-5 h-5 mr-2" />
                    Νέα Συνομιλία
                </button>
             </div>
            {history.map((msg, index) => (
                <Message 
                    key={msg.id}
                    message={msg}
                    isLastMessage={index === history.length - 1 && !isLoading}
                    onEdit={onEdit}
                    onRegenerate={onRegenerate}
                />
            ))}
            {isLoading && (
                 <div className="flex items-start gap-4 justify-start animate-slide-up">
                     <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-border dark:bg-dark-border flex items-center justify-center">
                         <AiIcon className="w-5 h-5 text-brand-text-secondary dark:text-dark-text-secondary"/>
                     </div>
                     <div className="px-4 py-3 rounded-2xl rounded-bl-lg bg-ai-bubble dark:bg-dark-ai-bubble">
                        <div className="flex items-center gap-2 text-brand-text-secondary dark:text-dark-text-secondary">
                             <div className="w-2 h-2 bg-brand-text-secondary dark:bg-dark-text-secondary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                             <div className="w-2 h-2 bg-brand-text-secondary dark:bg-dark-text-secondary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                             <div className="w-2 h-2 bg-brand-text-secondary dark:bg-dark-text-secondary rounded-full animate-bounce"></div>
                        </div>
                     </div>
                 </div>
            )}
        </div>
    );
};

export default ChatDisplay;