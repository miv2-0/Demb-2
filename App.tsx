
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Upload, 
  FileText, 
  Download, 
  Trash2, 
  CheckCircle2, 
  Loader2, 
  History, 
  AlertCircle,
  Copy,
  LayoutDashboard,
  Smartphone
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
    // Explicitly type selectedFiles as File[] to fix inference issues for map and createObjectURL
    const selectedFiles: File[] = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    // Limit to 20 images
    const limitedFiles = selectedFiles.slice(0, 20);
    
    // Typing f as File in map to fix the unknown type error reported on lines 54 and 57
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
              original: num, // Simplified for this context
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
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl text-white">
              <Smartphone size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">OmniExtract Pro</h1>
              <p className="text-xs text-slate-500 font-medium">Batch Mobile Extraction & OCR</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowLogs(!showLogs)}
              className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
            >
              {showLogs ? 'Hide Raw Logs' : 'View Raw Logs'}
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
              <span className="text-xs text-slate-400">Max 20 images</span>
            </div>
            
            <div className="p-8">
              <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer bg-slate-50 hover:bg-indigo-50/50 hover:border-indigo-300 transition-all">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <div className="p-3 bg-white rounded-full shadow-sm mb-4">
                    <Upload className="w-8 h-8 text-indigo-500" />
                  </div>
                  <p className="mb-2 text-sm text-slate-700">
                    <span className="font-semibold text-indigo-600">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-slate-500">PNG, JPG or JPEG (Max. 5MB per file)</p>
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
                <div className="mt-8 space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-slate-700">Process Queue ({files.length} files)</h3>
                    <button 
                      onClick={processAll}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 transition-all shadow-md shadow-indigo-100"
                    >
                      {isProcessing ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                      {isProcessing ? 'Processing...' : 'Start Scan'}
                    </button>
                  </div>
                  
                  <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
                    {files.map(file => (
                      <div key={file.id} className="flex items-center gap-4 p-3 bg-white border border-slate-200 rounded-xl">
                        <img src={file.previewUrl} className="w-12 h-12 object-cover rounded-lg border border-slate-100" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{file.file.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {file.status === 'completed' ? (
                              <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider bg-green-50 px-2 py-0.5 rounded-full">Completed</span>
                            ) : file.status === 'processing' ? (
                              <div className="w-full bg-slate-100 rounded-full h-1.5">
                                <div className="bg-indigo-600 h-1.5 rounded-full animate-pulse transition-all duration-300" style={{ width: `${file.progress}%` }}></div>
                              </div>
                            ) : file.status === 'error' ? (
                              <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider bg-red-50 px-2 py-0.5 rounded-full">Error</span>
                            ) : (
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 px-2 py-0.5 rounded-full">Pending</span>
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

          {/* Results Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FileText size={18} className="text-indigo-500" />
                Extracted Results
              </h2>
              {extractedNumbers.length > 0 && (
                <button 
                  onClick={handleDownload}
                  className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-all flex items-center gap-2 shadow-md shadow-green-100"
                >
                  <Download size={16} />
                  Download {downloadCount + 1}.csv
                </button>
              )}
            </div>
            
            <div className="overflow-x-auto">
              {extractedNumbers.length > 0 ? (
                <table className="w-full text-left">
                  <thead className="bg-slate-50/80">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-20">Number</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Phone Number</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {extractedNumbers.map((num, idx) => (
                      <tr key={num.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4 text-sm font-medium text-slate-400">{idx + 1}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-900 flex items-center gap-2">
                          {num.formatted}
                          <button 
                            onClick={() => navigator.clipboard.writeText(num.formatted)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-indigo-600"
                          >
                            <Copy size={12} />
                          </button>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-400 font-medium italic">{num.sourceImage}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-20 text-center">
                  <div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <FileText className="text-slate-300" size={32} />
                  </div>
                  <h3 className="text-slate-900 font-semibold">No numbers extracted yet</h3>
                  <p className="text-slate-500 text-sm mt-1 max-w-xs mx-auto">Upload and scan images to see results populate here automatically.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: History & Logs */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* History Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center gap-2">
              <History size={18} className="text-indigo-500" />
              <h2 className="text-lg font-semibold">Recent Downloads</h2>
            </div>
            <div className="p-4 space-y-3">
              {history.length > 0 ? history.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-indigo-100 transition-all">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800">{item.filename}</p>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-tighter mt-0.5">
                      {new Date(item.timestamp).toLocaleString()} • {item.count} items
                    </p>
                  </div>
                  <button 
                    onClick={() => downloadCSV(item.data, item.filename)}
                    className="p-2 text-indigo-600 bg-white rounded-lg shadow-sm border border-slate-200 hover:bg-indigo-50 transition-all"
                  >
                    <Download size={16} />
                  </button>
                </div>
              )) : (
                <p className="text-center py-8 text-sm text-slate-400 italic font-medium">No recent history</p>
              )}
            </div>
          </div>

          {/* Stats Widget */}
          <div className="bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200 p-6 text-white relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-indigo-100 text-xs font-bold uppercase tracking-widest mb-1">Session Total</h3>
              <div className="text-4xl font-black mb-1">{extractedNumbers.length}</div>
              <p className="text-indigo-200 text-xs font-medium">Valid Unique Numbers Extracted</p>
            </div>
            <LayoutDashboard className="absolute -bottom-4 -right-4 w-24 h-24 text-indigo-500 opacity-30" />
          </div>

          {/* Raw Text Log Section (Toggleable) */}
          {showLogs && (
            <div className="bg-slate-900 rounded-2xl shadow-xl p-6 text-slate-300 font-mono text-xs animate-in slide-in-from-top-4 duration-300">
              <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
                <span className="flex items-center gap-2 text-green-400">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  OCR RAW LOGS
                </span>
                <span className="text-[10px] text-slate-500 uppercase font-bold">Read-only</span>
              </div>
              <div className="max-h-96 overflow-y-auto space-y-4">
                {files.filter(f => f.rawText).length > 0 ? (
                  files.filter(f => f.rawText).map(f => (
                    <div key={f.id} className="border-l border-slate-700 pl-3">
                      <p className="text-indigo-400 mb-1">[{f.file.name}]</p>
                      <p className="leading-relaxed opacity-80 whitespace-pre-wrap">{f.rawText}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-600 italic">No OCR logs available. Start processing files to see data.</p>
                )}
              </div>
            </div>
          )}

          {/* Tips Card */}
          <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="text-amber-500 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-amber-900">Optimization Tip</h4>
                <p className="text-xs text-amber-800/80 mt-1 leading-relaxed font-medium">
                  For handwritten notes, ensure clear lighting. The "Sharpening & Contrast" engine automatically processes images to improve digit detection.
                </p>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 py-6 px-6 text-center text-slate-400 text-xs font-medium uppercase tracking-widest">
        OmniExtract Pro • Developed for High-Volume Extraction • © 2024
      </footer>
    </div>
  );
};

export default App;
