export interface ConversionOptions {
  inputFormat: string;
  outputFormat: string;
  quality?: number;
  ocrLanguage?: string;
}

export interface ConversionProgress {
  percentage: number;
  status: string;
  currentStep?: string;
}

export interface ConversionStats {
  conversionsToday: number;
  totalConversions: number;
  savedFiles: number;
}

export interface RecentFile {
  id: number;
  name: string;
  date: string;
  size: string;
  type: string;
  originalFormat: string;
  targetFormat: string;
}

export type ConversionType = 'pdf-to-word' | 'pdf-to-text' | 'word-to-pdf' | 'text-to-pdf' | 'image-to-pdf' | 'ocr-extract';
