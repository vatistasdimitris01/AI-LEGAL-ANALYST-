import React, { useState, useCallback, useRef, useEffect } from 'react';
import { analyzeCase, extractTextFromImage, chatWithAI, formatTextAsCase } from './services/geminiService';
import { type AnalysisResult, type ChatMessage } from './types';
import InputBar from './components/InputBar';
import ResultsDisplay from './components/ResultsDisplay';
import CountryModal from './components/CountryModal';
import { ScaleIcon, SparklesIcon, DocumentTextIcon, BookOpenIcon, LogoIcon, MenuIcon, XIcon } from './components/icons/Icons';
import LoadingSpinner from './components/LoadingSpinner';
import LawLibrary from './components/LawSearch';
import ChatDisplay from './components/ChatDisplay';

type View = 'analysis' | 'library';
type InputMode = 'case' | 'chat';

const App: React.FC = () => {
  const [inputText, setInputText] = useState<string>('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isFetchingUrl, setIsFetchingUrl] = useState<boolean>(false);
  const [isFormattingCase, setIsFormattingCase] = useState<boolean>(false);
  const [isUrlDetected, setIsUrlDetected] = useState<boolean>(false);
  const [isProcessingImage, setIsProcessingImage] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<View>('analysis');
  const [inputMode, setInputMode] = useState<InputMode>('case');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomOfChatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
    setIsUrlDetected(urlRegex.test(inputText.trim()) && inputMode === 'case');
  }, [inputText, inputMode]);

  useEffect(() => {
    if (bottomOfChatRef.current) {
        bottomOfChatRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory]);

  const handleFetchUrlContent = async () => {
    setIsFetchingUrl(true);
    setIsFormattingCase(false);
    setError(null);
    try {
      let url = inputText.trim();
      if (!/^https?:\/\//i.test(url)) {
          url = 'https://' + url;
      }
      
      const response = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`);
      if (!response.ok) throw new Error('Αποτυχία ανάκτησης περιεχομένου από το URL.');
      
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const articleEl = doc.querySelector('article');
      const mainEl = doc.querySelector('main');
      let content = '';

      if (articleEl) {
        content = articleEl.innerText || '';
      } else if (mainEl) {
        content = mainEl.innerText || '';
      } else {
        const paragraphs = Array.from(doc.querySelectorAll('p'));
        content = paragraphs.map(p => p.innerText).join('\n\n');
      }

      const extractedText = (content || doc.body.innerText || '').trim();
      if (!extractedText) {
          throw new Error("Δεν βρέθηκε περιεχόμενο για εξαγωγή.");
      }
      
      let sourceDomain = 'Unknown Source';
      try {
          const urlObject = new URL(url);
          sourceDomain = urlObject.hostname.replace(/^www\./, '');
      } catch (e) {
          console.error("Could not parse URL to get domain:", e);
      }

      setIsFetchingUrl(false);
      setIsFormattingCase(true);

      const formattedCaseText = await formatTextAsCase(extractedText, sourceDomain);
      setInputText(formattedCaseText);

    } catch (err) {
        console.error(err);
        setError('Δεν ήταν δυνατή η εξαγωγή περιεχομένου από το URL. Παρακαλώ αντιγράψτε και επικολλήστε το κείμενο χειροκίνητα.');
    } finally {
        setIsFetchingUrl(false);
        setIsFormattingCase(false);
    }
  };


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setInputMode('case');
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const base64Image = e.target?.result as string;
          setIsProcessingImage(true);
          setError(null);
          try {
            const extractedText = await extractTextFromImage(base64Image);
            setInputText(extractedText);
          } catch (err) {
            console.error(err);
            setError('Αποτυχία εξαγωγής κειμένου από την εικόνα.');
          } finally {
            setIsProcessingImage(false);
          }
        };
        reader.readAsDataURL(file);
      } else {
        const reader = new FileReader();
        reader.onload = (e) => setInputText(e.target?.result as string);
        reader.readAsText(file);
      }
    }
  };
  
  const handleChatSubmit = useCallback(async (text: string) => {
    setIsLoading(true);
    setError(null);
    setAnalysis(null);

    const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: 'user', content: text };
    setChatHistory(prev => [...prev, userMessage]);
    
    try {
      const result = await chatWithAI(text);
      const aiMessage: ChatMessage = { id: `ai-${Date.now()}`, role: 'ai', content: result };
      setChatHistory(prev => [...prev, aiMessage]);
    } catch (err) {
      console.error(err);
      const errorMessage: ChatMessage = { id: `ai-error-${Date.now()}`, role: 'ai', content: 'Προέκυψε σφάλμα. Προσπαθήστε ξανά.' };
      setChatHistory(prev => [...prev, errorMessage]);
      setError('Προέκυψε σφάλμα κατά την επικοινωνία με την AI.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleTriggerSubmit = () => {
    if (!inputText.trim()) return;
    setError(null);

    if (inputMode === 'chat') {
      handleChatSubmit(inputText);
      setInputText('');
    } else {
      setIsModalOpen(true);
    }
  };

  const handleConfirmSubmit = useCallback(async (country: string) => {
    setIsModalOpen(false);
    setIsLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const result = await analyzeCase(inputText, country);
      setAnalysis(result);
      setInputText('');
      setFileName(null);
    } catch (err) {
      console.error(err);
      setError('Προέκυψε σφάλμα κατά την ανάλυση της υπόθεσης.');
    } finally {
      setIsLoading(false);
    }
  }, [inputText]);
  
  const handleRegenerate = useCallback(async () => {
    const lastUserMessage = [...chatHistory].reverse().find(m => m.role === 'user');
    if (!lastUserMessage) return;

    setChatHistory(prev => prev.filter((_, i) => i !== prev.length -1 || prev[prev.length-1].role !== 'ai'));
    
    await handleChatSubmit(lastUserMessage.content);

  }, [chatHistory, handleChatSubmit]);

  const handleEdit = useCallback(async (id: string, newContent: string) => {
    const messageIndex = chatHistory.findIndex(m => m.id === id);
    if (messageIndex === -1) return;

    const updatedHistory = chatHistory.slice(0, messageIndex + 1);
    updatedHistory[messageIndex].content = newContent;
    setChatHistory(updatedHistory);

    await handleChatSubmit(newContent);
  }, [chatHistory, handleChatSubmit]);


  const handleReset = () => {
    setInputText('');
    setAnalysis(null);
    setChatHistory([]);
    setError(null);
    setFileName(null);
    setIsModalOpen(false);
    setInputMode('case');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  
  const handleNewChat = () => {
      setChatHistory([]);
      setError(null);
  }
  
  const handleSetView = (view: View) => {
    setCurrentView(view);
    setIsSidebarOpen(false);
  }

  const NavLinks: React.FC<{ isMobile?: boolean }> = ({ isMobile }) => (
    <nav className={`flex items-center ${isMobile ? 'flex-col space-y-4 pt-8' : 'space-x-1 sm:space-x-2'}`}>
      <button 
          onClick={() => handleSetView('analysis')}
          className={`px-3 sm:px-4 py-2 text-sm sm:text-base font-semibold rounded-lg transition-colors flex items-center gap-2 w-full ${currentView === 'analysis' ? 'bg-brand-accent text-white' : 'text-brand-subtle hover:bg-slate-100'}`}
      >
          <ScaleIcon className="w-5 h-5" />
          Ανάλυση
      </button>
      <button 
          onClick={() => handleSetView('library')}
          className={`px-3 sm:px-4 py-2 text-sm sm:text-base font-semibold rounded-lg transition-colors flex items-center gap-2 w-full ${currentView === 'library' ? 'bg-brand-accent text-white' : 'text-brand-subtle hover:bg-slate-100'}`}
      >
          <BookOpenIcon className="w-5 h-5"/>
          Βιβλιοθήκη
      </button>
    </nav>
  );

  const isProcessingUrl = isFetchingUrl || isFormattingCase;
  const isInputLoading = isLoading || isProcessingUrl || isProcessingImage;
  const showWelcome = !isLoading && !analysis && chatHistory.length === 0;
  const showInputBar = !analysis;

  return (
    <div className="min-h-screen flex flex-col bg-brand-primary text-brand-text font-sans">
      <header className="w-full p-4 border-b border-brand-border bg-brand-secondary/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center">
                <button onClick={() => setIsSidebarOpen(true)} className="p-2 md:hidden text-brand-subtle hover:text-brand-text mr-2 -ml-2">
                    <MenuIcon className="w-6 h-6" />
                </button>
                <div className="flex items-center">
                    <LogoIcon className="h-8 w-8 text-brand-text mr-3" />
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-brand-text">
                      AI Legal Analyst
                    </h1>
                </div>
            </div>
            <div className="hidden md:block">
              <NavLinks />
            </div>
        </div>
      </header>

      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
            <div className="absolute inset-0 bg-black/30" onClick={() => setIsSidebarOpen(false)}></div>
            <div className="relative z-10 bg-brand-secondary w-72 h-full shadow-xl p-4">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center">
                        <LogoIcon className="h-7 w-7 text-brand-text mr-2" />
                        <h2 className="text-lg font-bold">AI Legal Analyst</h2>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-brand-subtle hover:text-brand-text">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>
                <NavLinks isMobile />
            </div>
        </div>
      )}

      <main className="flex-grow container mx-auto p-4 md:p-6 lg:p-8 w-full max-w-4xl relative">
        {currentView === 'analysis' && (
          <div className={showInputBar ? 'pb-40' : ''}>
            {isLoading && chatHistory.length === 0 && <LoadingSpinner />}
            {error && !isLoading && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative text-center mb-4" role="alert">
                <strong className="font-bold">Σφάλμα: </strong>
                <span className="block sm:inline">{error}</span>
              </div>
            )}
            {showWelcome && (
              <div className="text-center pt-16 space-y-4">
                <SparklesIcon className="h-12 w-12 mx-auto text-brand-accent mb-4" />
                <h2 className="text-3xl font-bold mb-2 text-brand-text">Ξεκινήστε την Ανάλυση</h2>
                <p className="text-brand-subtle max-w-xl mx-auto">
                  Επιλέξτε τη λειτουργία "Ανάλυση Υπόθεσης" ή "Συνομιλία" από την μπάρα εισαγωγής παρακάτω.
                </p>
              </div>
            )}
            {analysis && <ResultsDisplay analysis={analysis} onReset={handleReset} />}
            {chatHistory.length > 0 && <ChatDisplay history={chatHistory} onEdit={handleEdit} onRegenerate={handleRegenerate} isLoading={isLoading} onNewChat={handleNewChat} />}
             <div ref={bottomOfChatRef} />
          </div>
        )}
        
        {currentView === 'library' && <LawLibrary />}

      </main>
      
      {currentView === 'analysis' && showInputBar && (
         <div className="fixed bottom-0 left-0 right-0 p-4 flex justify-center pointer-events-none">
            <div className="w-full max-w-4xl pointer-events-auto flex flex-col items-center">
              {isUrlDetected && !isInputLoading && inputMode === 'case' && (
                <button onClick={handleFetchUrlContent} className="bg-brand-accent text-white font-semibold py-2 px-5 rounded-full mb-2 shadow-lg hover:bg-brand-accent-dark transition-colors flex items-center">
                  <DocumentTextIcon className="w-5 h-5 mr-2" />
                  Εξαγωγή Περιεχομένου από URL
                </button>
              )}
              {isProcessingUrl && (
                  <div className="bg-slate-200 text-brand-subtle font-semibold py-2 px-5 rounded-full mb-2 shadow-lg flex items-center">
                      <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin mr-2"></div>
                      {isFetchingUrl ? 'Ανάκτηση περιεχομένου...' : 'Διαμόρφωση υπόθεσης...'}
                  </div>
              )}
              {isProcessingImage && (
                  <div className="bg-slate-200 text-brand-subtle font-semibold py-2 px-5 rounded-full mb-2 shadow-lg flex items-center">
                      <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin mr-2"></div>
                      Επεξεργασία εικόνας...
                  </div>
              )}
              <InputBar
                  value={inputText}
                  onValueChange={setInputText}
                  onFileChange={handleFileChange}
                  onSubmit={handleTriggerSubmit}
                  isLoading={isInputLoading}
                  fileName={fileName}
                  fileInputRef={fileInputRef}
                  mode={inputMode}
                  onModeChange={(newMode) => {
                      setInputMode(newMode);
setError(null);
                      if (analysis) handleReset();
                  }}
              />
            </div>
        </div>
      )}
      
      <CountryModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onConfirm={handleConfirmSubmit} isLoading={isLoading} />
    </div>
  );
};

export default App;