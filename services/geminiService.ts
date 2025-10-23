import { type AnalysisResult, type ChatMessage } from '../types';

async function callApi<T>(action: string, payload: any): Promise<T> {
  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, payload }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ error: 'An unknown error occurred.' }));
      throw new Error(errorBody.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.result as T;
  } catch (error) {
    console.error(`API call for action '${action}' failed:`, error);
    if (error instanceof Error) {
        throw new Error(`API call failed: ${error.message}`);
    }
    throw new Error('An unknown error occurred during the API call.');
  }
}

export const analyzeCase = (caseDetails: string, country: string): Promise<AnalysisResult> => {
  return callApi<AnalysisResult>('analyzeCase', { caseDetails, country });
};

export const searchLaws = (query: string): Promise<string> => {
  return callApi<string>('searchLaws', { query });
};

export async function* chatWithAIStream(history: ChatMessage[]): AsyncGenerator<string, void, undefined> {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'chatWithAIStream', payload: { history } }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: 'An unknown error occurred.' }));
    throw new Error(errorBody.error || `HTTP error! status: ${response.status}`);
  }

  if (!response.body) {
    throw new Error("Response body is null");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    
    // Process buffer line by line
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep the last, possibly incomplete line

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const jsonString = line.substring(6);
        if (jsonString === '[DONE]') {
          return;
        }
        try {
          const chunk = JSON.parse(jsonString);
          if (chunk.text) {
             yield chunk.text;
          }
        } catch (e) {
          console.error('Failed to parse stream chunk:', e);
        }
      }
    }
  }
}

export const extractTextFromImage = (base64Image: string): Promise<string> => {
  return callApi<string>('extractTextFromImage', { base64Image });
};

export const formatTextAsCase = (rawText: string, source: string): Promise<string> => {
  return callApi<string>('formatTextAsCase', { rawText, source });
};