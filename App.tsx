import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  Download, 
  Trash2, 
  CheckCircle2, 
  Loader2, 
  History, 
  AlertCircle,
  LayoutDashboard,
  Smartphone,
  ImagePlus
} from 'lucide-react';
import { ProcessingFile, ExtractedNumber, DownloadHistory } from './types';
import { preprocessImage, extractAndFormatNumbers } from './utils/imageProcessing';
import { performOCR } from './services/geminiService';
import { generateCSV, downloadCSV } from './utils/csv';

const App: React.FC = () => {
  const [files, setFiles] = useState<ProcessingFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedNumbers, setExtractedNumbers] = useState<ExtractedNumber[]>([]);
  const [history, setHistory] = useState<DownloadHistory[]>([]);
  const [downloadCount, setDownloadCount] = useState(0);
  const [showLogs, setShowLogs] = useState(false);

  // Load state from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('omniextract_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));

    const savedCount = localStorage.getItem('omniextract_count');
    if (savedCount) setDownloadCount(parseInt(savedCount, 10));
  }, []);

  // Save state to localStorage
  useEffect(() => {
    localStorage.setItem('omniextract_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('omniextract_count', downloadCount.toString());
  }, [downloadCount]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles: File[] = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    // Limit to 20 images
    const limitedFiles = selectedFiles.slice(0, 20);
    
    const newFiles: ProcessingFile[] = limitedFiles.map((f: File) => ({
      id: Math.random().toString(36).substr(2, 9),
      file: f,
      previewUrl: URL.createObjectURL(f),
      status: 'pending',
      progress: 0
    }));

    setFiles(prev => [...prev, ...newFiles]);
  };

  const processAll = async () => {
    if (files.length === 0 || isProcessing) return;
    setIsProcessing(true);

    const updatedFiles = [...files];
    const newExtracted: ExtractedNumber[] = [];

    for (let i = 0; i < updatedFiles.length; i++) {
      const current = updatedFiles[i];
      if (current.status === 'completed') continue;

      try {
        setFiles(prev => prev.map(f => f.id === current.id ? { ...f, status: 'processing', progress: 20 } : f));
        
        // 1. Preprocess
        const base64 = await preprocessImage(current.file);
        setFiles(prev => prev.map(f => f.id === current.id ? { ...f, progress: 50 } : f));

        // 2. OCR
        const { text } = await performOCR(base64);
        setFiles(prev => prev.map(f => f.id === current.id ? { ...f, progress: 80, rawText: text } : f));

        // 3. Extract Numbers
        const numbers = extractAndFormatNumbers(text);
        numbers.forEach(num => {
          // Prevent duplicates globally
          if (!newExtracted.find(n => n.formatted === num) && !extractedNumbers.find(n => n.formatted === num)) {
            newExtracted.push({
              id: Math.random().toString(36).substr(2, 9),
              original: num,
              formatted: num,
              sourceImage: current.file.name
            });
          }
        });

        setFiles(prev => prev.map(f => f.id === current.id ? { ...f, status: 'completed', progress: 100 } : f));
      } catch (err) {
        setFiles(prev => prev.map(f => f.id === current.id ? { ...f, status: 'error', error: 'Failed to process image' } : f));
      }
    }

    setExtractedNumbers(prev => [...prev, ...newExtracted]);
    setIsProcessing(false);
  };

  const handleDownload = () => {
    if (extractedNumbers.length === 0) return;

    const nextCount = downloadCount + 1;
    const filename = `${nextCount}.csv`;
    const csvContent = generateCSV(extractedNumbers.map(n => n.formatted));
    
    downloadCSV(csvContent, filename);

    // Update history
    const historyItem: DownloadHistory = {
      id: Math.random().toString(36).substr(2, 9),
      filename,
      timestamp: Date.now(),
      count: extractedNumbers.length,
      data: csvContent
    };

    setHistory(prev => [historyItem, ...prev].slice(0, 5));
    setDownloadCount(nextCount);
  };

  const clearAll = () => {
    setFiles([]);
    setExtractedNumbers([]);
    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl text-white">
              <Smartphone size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">OmniExtract Pro</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Background Processing Engine</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowLogs(!showLogs)}
              className="text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest"
            >
              {showLogs ? 'Hide Logs' : 'View Logs'}
            </button>
            <div className="h-6 w-px bg-slate-200"></div>
            <button 
              onClick={clearAll}
              className="p-2 text-slate-400 hover:text-red-500 transition-colors"
              title="Clear All"
            >
              <Trash2 size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Upload & Processing */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Upload Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Upload size={18} className="text-indigo-500" />
                Upload Images
              </h2>
              <div className="flex items-center gap-3">
                {extractedNumbers.length > 0 && (
                  <button 
                    onClick={handleDownload}
                    className="px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg shadow-emerald-100 animate-in fade-in zoom-in duration-300"
                  >
                    <Download size={16} />
                    Export CSV
                  </button>
                )}
                <span className="text-xs text-slate-400 font-medium">Max 20 images</span>
              </div>
            </div>
            
            <div className="p-8">
              <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer bg-slate-50 hover:bg-indigo-50/50 hover:border-indigo-300 transition-all">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <div className="p-3 bg-white rounded-full shadow-sm mb-4">
                    <ImagePlus className="w-8 h-8 text-indigo-500" />
                  </div>
                  <p className="mb-2 text-sm text-slate-700">
                    <span className="font-semibold text-indigo-600">Select images</span> or drag and drop
                  </p>
                  <p className="text-xs text-slate-500">PNG, JPG or JPEG (Local batch OCR)</p>
                </div>
                <input 
                  type="file" 
                  className="hidden" 
                  multiple 
                  accept="image/*" 
                  onChange={handleFileUpload}
                  disabled={isProcessing}
                />
              </label>

              {files.length > 0 && (
                <div className="mt-8 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Queue: {files.length} files</h3>
                    <button 
                      onClick={processAll}
                      disabled={isProcessing}
                      className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 transition-all shadow-lg shadow-indigo-100"
                    >
                      {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                      {isProcessing ? 'Processing Batch...' : 'Start Scan'}
                    </button>
                  </div>
                  
                  <div className="max-h-[500px] overflow-y-auto space-y-2 pr-2">
                    {files.map(file => (
                      <div key={file.id} className="flex items-center gap-4 p-3 bg-white border border-slate-200 rounded-xl transition-all">
                        <img src={file.previewUrl} className="w-12 h-12 object-cover rounded-lg border border-slate-100" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{file.file.name}</p>
                          <div className="mt-1">
                            {file.status === 'completed' ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Completed</span>
                                <CheckCircle2 size={10} className="text-emerald-500" />
                              </div>
                            ) : file.status === 'processing' ? (
                              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${file.progress}%` }}></div>
                              </div>
                            ) : file.status === 'error' ? (
                              <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Failed</span>
                            ) : (
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">In Queue</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Success Message Placeholder */}
          {extractedNumbers.length > 0 && !isProcessing && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 text-center animate-in slide-in-from-bottom-4 duration-500">
               <div className="mx-auto w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-3">
                  <CheckCircle2 className="text-emerald-600" size={24} />
               </div>
               <h3 className="text-emerald-900 font-bold">Extraction Complete</h3>
               <p className="text-emerald-800 text-sm mt-1">Found {extractedNumbers.length} unique mobile numbers. Click "Export CSV" to download the formatted list.</p>
            </div>
          )}
        </div>

        {/* Right Column: History & Logs */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Stats Widget */}
          <div className="bg-indigo-600 rounded-3xl shadow-xl shadow-indigo-200 p-8 text-white relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-indigo-100 text-[10px] font-black uppercase tracking-[0.2em] mb-2 opacity-80">Extraction Stats</h3>
              <div className="text-6xl font-black mb-1 leading-none">{extractedNumbers.length.toString().padStart(2, '0')}</div>
              <p className="text-indigo-100 text-xs font-medium">Valid Unique Numbers Found</p>
            </div>
            <LayoutDashboard className="absolute -bottom-6 -right-6 w-32 h-32 text-indigo-500 opacity-30" />
          </div>

          {/* History Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center gap-2">
              <History size={18} className="text-indigo-500" />
              <h2 className="text-lg font-semibold">Recent Downloads</h2>
            </div>
            <div className="p-4 space-y-3">
              {history.length > 0 ? history.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-indigo-100 transition-all group">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800">{item.filename}</p>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-tighter mt-0.5">
                      {new Date(item.timestamp).toLocaleTimeString()} • {item.count} items
                    </p>
                  </div>
                  <button 
                    onClick={() => downloadCSV(item.data, item.filename)}
                    className="p-2 text-indigo-600 bg-white rounded-lg shadow-sm border border-slate-200 group-hover:bg-indigo-600 group-hover:text-white transition-all"
                  >
                    <Download size={16} />
                  </button>
                </div>
              )) : (
                <p className="text-center py-8 text-sm text-slate-400 italic font-medium">No session history yet</p>
              )}
            </div>
          </div>

          {/* Raw Text Log Section (Toggleable) */}
          {showLogs && (
            <div className="bg-slate-900 rounded-2xl shadow-xl p-6 text-slate-300 font-mono text-xs animate-in slide-in-from-top-4 duration-300">
              <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
                <span className="flex items-center gap-2 text-emerald-400">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                  RAW OCR LOGS
                </span>
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Active</span>
              </div>
              <div className="max-h-96 overflow-y-auto space-y-4">
                {files.filter(f => f.rawText).length > 0 ? (
                  files.filter(f => f.rawText).map(f => (
                    <div key={f.id} className="border-l border-slate-700 pl-3">
                      <p className="text-indigo-400 font-bold mb-1">[{f.file.name}]</p>
                      <p className="leading-relaxed opacity-80 whitespace-pre-wrap">{f.rawText}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-600 italic">Logs will appear here during scan.</p>
                )}
              </div>
            </div>
          )}

          {/* Info Card */}
          <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="text-amber-500 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-amber-900">Background Processing</h4>
                <p className="text-xs text-amber-800/80 mt-2 leading-relaxed font-medium">
                  Result data is hidden for privacy and focus. The extraction engine removes duplicates and formats numbers automatically in the background.
                </p>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 py-6 px-6 text-center text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em]">
        OmniExtract Pro • Developed for Batch Mobile Extraction • © 2024
      </footer>
    </div>
  );
};

export default App;