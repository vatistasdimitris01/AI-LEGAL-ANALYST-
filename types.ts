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

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
}
