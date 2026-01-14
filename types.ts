
export interface ExtractedNumber {
  id: string;
  original: string;
  formatted: string;
  sourceImage: string;
}

export interface ProcessingFile {
  id: string;
  file: File;
  previewUrl: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  rawText?: string;
  error?: string;
}

export interface DownloadHistory {
  id: string;
  filename: string;
  timestamp: number;
  count: number;
  data: string; // Base64 or Blob URL reference for CSV content
}
