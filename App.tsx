import React, { useState, useCallback, useRef, useEffect } from 'react';
import { analyzeCase, extractTextFromImage, chatWithAIStream, formatTextAsCase, refineAnalysisForReadability } from './services/geminiService';
import { type AnalysisResult, type ChatMessage } from './types';
import InputBar from './components/InputBar';
import CountryModal from './components/CountryModal';
import { ScaleIcon, SparklesIcon, DocumentTextIcon, BookOpenIcon, LogoIcon, MenuIcon, XIcon, SunIcon, MoonIcon, ChatBubbleIcon } from './components/icons/Icons';
import LoadingSpinner from './components/LoadingSpinner';
import LawLibrary from './components/LawSearch';
import ChatDisplay from './components/ChatDisplay';
import ResultsDisplay from './components/ResultsDisplay';

type View = 'analysis' | 'library';
type InputMode = 'case' | 'chat';

const App: React.FC = () => {
  const [inputText, setInputText] = useState<string>('');
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
  
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analysisContext, setAnalysisContext] = useState<AnalysisResult | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('theme')) {
        return localStorage.getItem('theme') as 'light' | 'dark';
    }
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    }
    return 'light';
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomOfChatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
      setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

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

    // If this is the first message in a chat that follows an analysis, clear the analysis view
    if (analysisResult) {
      setAnalysisResult(null);
    }

    const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: 'user', content: text };
    const currentChatHistory = [...chatHistory, userMessage];
    setChatHistory(currentChatHistory);
    
    const aiMessageId = `ai-${Date.now()}`;
    const aiMessage: ChatMessage = { id: aiMessageId, role: 'ai', content: '' };
    setChatHistory(prev => [...prev, aiMessage]);

    try {
      const stream = chatWithAIStream(currentChatHistory, analysisContext);
      for await (const chunk of stream) {
          setChatHistory(prev =>
              prev.map(msg =>
                  msg.id === aiMessageId ? { ...msg, content: msg.content + chunk } : msg
              )
          );
      }
    } catch (err) {
      console.error(err);
      const errorMessage: ChatMessage = { id: `ai-error-${Date.now()}`, role: 'ai', content: 'Προέκυψε σφάλμα. Προσπαθήστε ξανά.' };
      setChatHistory(prev => prev.map(msg => msg.id === aiMessageId ? errorMessage : msg));
      setError('Προέκυψε σφάλμα κατά την επικοινωνία με την AI.');
    } finally {
      setIsLoading(false);
    }
  }, [chatHistory, analysisContext, analysisResult]);

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
    setChatHistory([]);
    setAnalysisResult(null);

    try {
      const result = await analyzeCase(inputText, country);
      setAnalysisResult(result);
      setAnalysisContext(result);
      setInputMode('chat');
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

    setChatHistory(prev => prev.filter((msg) => !(msg.role === 'ai' && msg.id === chatHistory[chatHistory.length -1].id)));
    
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

  const handleRefineAnalysis = useCallback(async () => {
    if (!analysisResult) return;
    
    try {
      const refinedResult = await refineAnalysisForReadability(analysisResult);
      setAnalysisResult(refinedResult);
      setAnalysisContext(refinedResult); // Update context as well
    } catch (err) {
      console.error(err);
      setError('Αποτυχία βελτίωσης της ανάλυσης. Προσπαθήστε ξανά.');
      throw err; // Re-throw to be caught by the component
    }
  }, [analysisResult]);


  const handleReset = () => {
    setInputText('');
    setChatHistory([]);
    setAnalysisResult(null);
    setAnalysisContext(null);
    setError(null);
    setFileName(null);
    setIsModalOpen(false);
    setInputMode('case');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  
  const handleSetView = (view: View) => {
    setCurrentView(view);
    setIsSidebarOpen(false);
  }

  const NavLinks: React.FC<{ isMobile?: boolean }> = ({ isMobile }) => (
    <nav className={`flex ${isMobile ? 'flex-col space-y-2 pt-6' : 'items-center bg-brand-secondary dark:bg-dark-secondary p-1 rounded-full'}`}>
      <button 
          onClick={() => handleSetView('analysis')}
          className={`px-3 py-1.5 text-sm font-semibold rounded-full transition-colors flex items-center gap-2 w-full ${currentView === 'analysis' ? 'bg-brand-primary dark:bg-dark-primary shadow-sm text-brand-text-primary dark:text-dark-text-primary' : 'text-brand-text-secondary hover:text-brand-text-primary dark:hover:text-dark-text-primary'}`}
      >
          <ScaleIcon className="w-5 h-5" />
          Ανάλυση
      </button>
      <button 
          onClick={() => handleSetView('library')}
          className={`px-3 py-1.5 text-sm font-semibold rounded-full transition-colors flex items-center gap-2 w-full ${currentView === 'library' ? 'bg-brand-primary dark:bg-dark-primary shadow-sm text-brand-text-primary dark:text-dark-text-primary' : 'text-brand-text-secondary hover:text-brand-text-primary dark:hover:text-dark-text-primary'}`}
      >
          <BookOpenIcon className="w-5 h-5"/>
          Βιβλιοθήκη
      </button>
    </nav>
  );
  
  const FeatureCard: React.FC<{ icon: React.ReactNode, title: string, description: string, className?: string }> = ({ icon, title, description, className }) => (
      <div className={`bg-brand-secondary dark:bg-dark-secondary p-5 rounded-2xl border border-brand-border dark:border-dark-border text-center flex flex-col items-center ${className}`}>
          <div className="mb-3 text-brand-accent">{icon}</div>
          <h3 className="font-bold text-base mb-2 text-brand-text-primary dark:text-dark-text-primary">{title}</h3>
          <p className="text-xs text-brand-text-secondary dark:text-dark-text-secondary">{description}</p>
      </div>
  );

  const features = [
    { 
      icon: <ScaleIcon className="w-7 h-7"/>, 
      title: "Ανάλυση Υπόθεσης",
      description: "Ανεβάστε ή επικολλήστε κείμενο για να λάβετε μια λεπτομερή νομική ανάλυση."
    },
    { 
      icon: <ChatBubbleIcon className="w-7 h-7"/>, 
      title: "Συνομιλία με AI",
      description: "Κάντε ερωτήσεις, ζητήστε διευκρινήσεις ή συζητήστε νομικά θέματα."
    },
    { 
      icon: <BookOpenIcon className="w-7 h-7"/>, 
      title: "Νομική Βιβλιοθήκη",
      description: "Αναζητήστε συγκεκριμένα άρθρα, νόμους και νομικούς κώδικες."
    }
  ];

  const isProcessingUrl = isFetchingUrl || isFormattingCase;
  const isInputLoading = isLoading || isProcessingUrl || isProcessingImage;
  const showWelcome = !isLoading && !analysisResult && chatHistory.length === 0;

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <header className="w-full p-3 border-b border-brand-border/80 dark:border-dark-border/80 bg-brand-primary/80 dark:bg-dark-primary/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
                <button onClick={() => setIsSidebarOpen(true)} className="p-2 md:hidden text-brand-text-secondary hover:text-brand-text-primary dark:text-dark-text-secondary dark:hover:text-dark-text-primary -ml-2">
                    <MenuIcon className="w-6 h-6" />
                </button>
                <div className="flex items-center gap-3">
                    <LogoIcon className="h-7 w-7 text-brand-text-primary dark:text-dark-text-primary" />
                    <h1 className="text-lg font-bold tracking-tight text-brand-text-primary dark:text-dark-text-primary hidden sm:block">
                      AI Legal Analyst
                    </h1>
                </div>
            </div>
            <div className="hidden md:block">
              <NavLinks />
            </div>
            <div className="flex items-center">
               <button 
                  onClick={toggleTheme} 
                  className="p-2 rounded-full text-brand-text-secondary hover:text-brand-text-primary dark:text-dark-text-secondary dark:hover:text-dark-text-primary hover:bg-brand-secondary dark:hover:bg-dark-secondary transition-colors"
                  aria-label="Toggle theme"
                >
                  {theme === 'light' ? <MoonIcon className="w-5 h-5" /> : <SunIcon className="w-5 h-5" />}
              </button>
            </div>
        </div>
      </header>

      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>
            <div className="relative z-10 bg-brand-primary dark:bg-dark-primary w-72 h-full shadow-xl p-4 animate-fade-in">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                        <LogoIcon className="h-7 w-7 text-brand-text-primary dark:text-dark-text-primary" />
                        <h2 className="text-lg font-bold">AI Legal Analyst</h2>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className="p-2 -mr-2 text-brand-text-secondary hover:text-brand-text-primary dark:text-dark-text-secondary dark:hover:text-dark-text-primary">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>
                <NavLinks isMobile />
            </div>
        </div>
      )}

      <main className="flex-grow container mx-auto p-4 md:p-6 lg:p-8 w-full max-w-4xl relative">
        {currentView === 'analysis' && (
          <div className={'pb-40'}>
            {isLoading && !analysisResult && <LoadingSpinner />}
            {error && !isLoading && (
              <div className="bg-accent-red/10 dark:bg-dark-accent-red/10 border border-accent-red/30 dark:border-dark-accent-red/30 text-accent-red dark:text-dark-accent-red px-4 py-3 rounded-lg relative text-center mb-4 animate-fade-in" role="alert">
                <strong className="font-bold">Σφάλμα: </strong>
                <span className="block sm:inline">{error}</span>
              </div>
            )}
            {showWelcome && (
              <div className="text-center pt-8 sm:pt-16 space-y-12 animate-slide-up">
                  <div className="space-y-4">
                    <div className="inline-block p-3 bg-brand-accent/10 rounded-full">
                       <SparklesIcon className="h-8 w-8 sm:h-10 sm:w-10 mx-auto text-brand-accent" />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-brand-text-primary dark:text-dark-text-primary">Ξεκινήστε την Ανάλυση</h2>
                    <p className="text-sm text-brand-text-secondary dark:text-dark-text-secondary max-w-xl mx-auto">
                      Ένας βοηθός AI για γρήγορη νομική ανάλυση, συνομιλία και αναζήτηση στη βιβλιοθήκη.
                    </p>
                  </div>
                  <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 sm:gap-6 pb-4 -mx-4 px-4 scrollbar-hide sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0 max-w-3xl mx-auto">
                      {features.map((feature, index) => (
                        <FeatureCard 
                          key={index}
                          icon={feature.icon} 
                          title={feature.title}
                          description={feature.description}
                          className="w-[80vw] max-w-xs flex-shrink-0 snap-center sm:w-auto"
                        />
                      ))}
                  </div>
              </div>
            )}
            
            {analysisResult && !isLoading && <ResultsDisplay result={analysisResult} onRefine={handleRefineAnalysis} onStartOver={handleReset} />}
            {chatHistory.length > 0 && !analysisResult && <ChatDisplay history={chatHistory} onEdit={handleEdit} onRegenerate={handleRegenerate} isLoading={isLoading} onStartOver={handleReset} />}
            
            <div ref={bottomOfChatRef} />
          </div>
        )}
        
        {currentView === 'library' && <LawLibrary />}

      </main>
      
      {currentView === 'analysis' && (
         <div className="fixed bottom-0 left-0 right-0 p-4 flex justify-center pointer-events-none">
            <div className="w-full max-w-4xl pointer-events-auto flex flex-col items-center">
              {isUrlDetected && !isInputLoading && inputMode === 'case' && (
                <button onClick={handleFetchUrlContent} className="bg-brand-accent text-white font-semibold py-2 px-5 rounded-full mb-2 shadow-lg hover:bg-brand-accent-dark transition-all flex items-center animate-fade-in">
                  <DocumentTextIcon className="w-5 h-5 mr-2" />
                  Εξαγωγή Περιεχομένου από URL
                </button>
              )}
              {isProcessingUrl && (
                  <div className="bg-brand-secondary dark:bg-dark-secondary text-brand-text-secondary dark:text-dark-text-secondary font-semibold py-2 px-5 rounded-full mb-2 shadow-lg flex items-center animate-fade-in">
                      <div className="w-4 h-4 border-2 border-brand-text-tertiary border-t-transparent rounded-full animate-spin mr-2"></div>
                      {isFetchingUrl ? 'Ανάκτηση περιεχομένου...' : 'Διαμόρφωση υπόθεσης...'}
                  </div>
              )}
              {isProcessingImage && (
                  <div className="bg-brand-secondary dark:bg-dark-secondary text-brand-text-secondary dark:text-dark-text-secondary font-semibold py-2 px-5 rounded-full mb-2 shadow-lg flex items-center animate-fade-in">
                      <div className="w-4 h-4 border-2 border-brand-text-tertiary border-t-transparent rounded-full animate-spin mr-2"></div>
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
                      if (chatHistory.length > 0 || analysisResult) handleReset();
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