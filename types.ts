export interface LegalArticle {
  article: string;
  reasoning: string;
  link?: string;
}

export interface AnalysisResult {
  caseSummary: string;
  plaintiffArticles: LegalArticle[];
  defendantArticles: LegalArticle[];
}

export type TextMessage = {
  type: 'text';
  id: string;
  role: 'user' | 'ai';
  content: string;
};

export type AnalysisMessage = {
  type: 'analysis';
  id: string;
  role: 'ai';
  content: AnalysisResult;
};

export type ChatMessage = TextMessage | AnalysisMessage;