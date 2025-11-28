export interface Mountain {
  id: string;
  chineseName: string; // e.g., 壬
  pinyin: string;      // e.g., Ren
  name: string;        // Russian translation/transliteration
  element: string;
  direction: string;   // N1, N2, N3, etc.
  startDegree: number;
  endDegree: number;
  description: string;
}

export interface AnalysisState {
  isLoading: boolean;
  result: string | null;
  error: string | null;
}