// Define shared interfaces for the application to resolve module import errors
export interface ProcessingFile {
  id: string;
  file: File;
  previewUrl: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  rawText?: string;
  error?: string;
}

export interface ExtractedNumber {
  id: string;
  original: string;
  formatted: string;
  sourceImage: string;
}

export interface DownloadHistory {
  id: string;
  filename: string;
  timestamp: number;
  count: number;
  data: string;
}
