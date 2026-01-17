import React, { useState, useEffect, useRef } from 'react';
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
  Zap,
  ShieldCheck,
  Terminal
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
  const [logs, setLogs] = useState<{msg: string, type: 'info' | 'success' | 'error'}[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedHistory = localStorage.getItem('omniextract_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    const savedCount = localStorage.getItem('omniextract_count');
    if (savedCount) setDownloadCount(parseInt(savedCount, 10));
    addLog('System initialized. Awaiting input buffer...', 'info');
  }, []);

  useEffect(() => {
    localStorage.setItem('omniextract_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('omniextract_count', downloadCount.toString());
  }, [downloadCount]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {
    setLogs(prev => [...prev, { msg, type }]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles: File[] = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    const limitedFiles = selectedFiles.slice(0, 20);
    const newFiles: ProcessingFile[] = limitedFiles.map((f: File) => ({
      id: Math.random().toString(36).substr(2, 9),
      file: f,
      previewUrl: URL.createObjectURL(f),
      status: 'pending',
      progress: 0
    }));

    setFiles(prev => [...prev, ...newFiles]);
    addLog(`Ingested ${limitedFiles.length} objects into processing queue.`, 'info');
  };

  const processAll = async () => {
    if (files.length === 0 || isProcessing) return;
    setIsProcessing(true);
    addLog('Starting extraction sequence...', 'info');

    const updatedFiles = [...files];
    const newExtracted: ExtractedNumber[] = [];

    for (let i = 0; i < updatedFiles.length; i++) {
      const current = updatedFiles[i];
      if (current.status === 'completed') continue;

      try {
        setFiles(prev => prev.map(f => f.id === current.id ? { ...f, status: 'processing', progress: 20 } : f));
        addLog(`Processing Object: ${current.file.name}...`, 'info');
        
        const base64 = await preprocessImage(current.file);
        setFiles(prev => prev.map(f => f.id === current.id ? { ...f, progress: 50 } : f));

        const { text } = await performOCR(base64);
        setFiles(prev => prev.map(f => f.id === current.id ? { ...f, progress: 80, rawText: text } : f));

        const numbers = extractAndFormatNumbers(text);
        let foundNew = 0;
        numbers.forEach(num => {
          const isDuplicate = 
            newExtracted.some(n => n.formatted === num) || 
            extractedNumbers.some(n => n.formatted === num);
          
          if (!isDuplicate) {
            newExtracted.push({
              id: Math.random().toString(36).substr(2, 9),
              original: num,
              formatted: num,
              sourceImage: current.file.name
            });
            foundNew++;
          }
        });

        if (foundNew > 0) {
          addLog(`Extraction Success: ${foundNew} unique targets identified in ${current.file.name}.`, 'success');
        } else {
          addLog(`Scan Complete: No new unique targets in ${current.file.name}.`, 'info');
        }

        setFiles(prev => prev.map(f => f.id === current.id ? { ...f, status: 'completed', progress: 100 } : f));
      } catch (err) {
        addLog(`Critical Error processing ${current.file.name}. Core skip.`, 'error');
        setFiles(prev => prev.map(f => f.id === current.id ? { ...f, status: 'error', error: 'Extraction failed' } : f));
      }
    }

    setExtractedNumbers(prev => [...prev, ...newExtracted]);
    setIsProcessing(false);
    addLog('Batch processing sequence finalized.', 'success');
  };

  const handleDownload = () => {
    if (extractedNumbers.length === 0) return;

    const nextCount = downloadCount + 1;
    const filename = `${nextCount}.csv`;
    const csvContent = generateCSV(extractedNumbers.map(n => n.formatted));
    
    downloadCSV(csvContent, filename);

    const historyItem: DownloadHistory = {
      id: Math.random().toString(36).substr(2, 9),
      filename,
      timestamp: Date.now(),
      count: extractedNumbers.length,
      data: csvContent
    };

    setHistory(prev => [historyItem, ...prev].slice(0, 5));
    setDownloadCount(nextCount);
    addLog(`Buffer exported to ${filename}.`, 'success');
  };

  const clearAll = () => {
    setFiles([]);
    setExtractedNumbers([]);
    setIsProcessing(false);
    addLog('Buffer cleared. System reset.', 'info');
  };

  return (
    <div className="min-h-screen flex flex-col p-4 sm:p-10">
      {/* Header */}
      <div className="max-w-6xl mx-auto w-full flex flex-col sm:flex-row justify-between items-start sm:items-end pb-8 border-b border-slate-800 gap-4 mb-10">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter glow-text italic flex items-center gap-3">
            OMNI<span className="text-indigo-500">EXTRACT</span> <span className="text-slate-500 not-italic font-light">PRO</span>
          </h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.4em] mono mt-1">Stealth Ops // Fixed CSV Format for Google Contacts</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={clearAll}
            className="text-[10px] text-red-500 hover:text-red-400 font-bold uppercase tracking-widest border border-red-900/30 bg-red-950/20 px-5 py-2 rounded-full transition-all hover:bg-red-900/40"
          >
            Reset System
          </button>
        </div>
      </div>

      <main className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
        
        {/* Left: Input Buffer */}
        <div className="lg:col-span-5 space-y-8">
          
          <div className="glass rounded-3xl p-1 relative overflow-hidden group">
            <div className="p-8 flex flex-col items-center justify-center text-center cursor-pointer relative z-10">
              <input 
                type="file" 
                multiple 
                accept="image/*" 
                onChange={handleFileUpload}
                disabled={isProcessing}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
              />
              <div className="p-5 bg-indigo-500/10 rounded-2xl mb-4 border border-indigo-500/20 group-hover:scale-110 transition-transform duration-500">
                <Upload className="w-8 h-8 text-indigo-500" />
              </div>
              <p className="font-black text-white text-xl tracking-tight">INGEST DATA</p>
              <p className="text-[10px] text-slate-500 mono mt-2 uppercase tracking-widest font-bold">Max 20 image objects per batch</p>
            </div>
          </div>

          <div className="glass p-8 rounded-3xl relative overflow-hidden border border-slate-800">
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-[10px] font-bold text-slate-500 mono uppercase tracking-widest mb-1">Unique Mobiles</p>
                <h3 className="text-6xl font-black text-white tracking-tighter">{extractedNumbers.length.toString().padStart(2, '0')}</h3>
              </div>
              <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
                <ShieldCheck className="w-8 h-8 text-indigo-500" />
              </div>
            </div>

            {files.length > 0 && !isProcessing && extractedNumbers.length === 0 && (
              <button 
                onClick={processAll}
                className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-indigo-900/20 mb-4 flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4 fill-white" />
                Run Extraction
              </button>
            )}

            <button 
              onClick={handleDownload}
              disabled={extractedNumbers.length === 0 || isProcessing}
              className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${
                extractedNumbers.length > 0 && !isProcessing 
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-900/20' 
                : 'bg-slate-900 text-slate-700 border border-slate-800 cursor-not-allowed'
              }`}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Export to CSV
                </>
              )}
            </button>
            <p className="text-[9px] text-center text-slate-600 font-bold mono mt-4 uppercase tracking-widest opacity-50">Volume: {downloadCount + 1}.CSV</p>
          </div>

          <div className="bg-slate-900/30 rounded-2xl p-6 border border-slate-800/50">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="text-indigo-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Stealth Protocol</h4>
                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed font-medium">
                  Extraction list is obfuscated for privacy. Output strictly formatted for direct import into Google Contacts.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Kernel Logs & History */}
        <div className="lg:col-span-7 space-y-8 flex flex-col">
          
          <div className="glass rounded-3xl overflow-hidden flex flex-col flex-1 border border-slate-800 shadow-2xl">
            <div className="bg-slate-950/80 p-4 border-b border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Terminal className="w-4 h-4 text-slate-600" />
                <span className="text-[10px] font-bold text-slate-500 font-mono tracking-widest uppercase">Kernel Output Stream</span>
              </div>
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-slate-800"></div>
                <div className="w-2 h-2 rounded-full bg-slate-800"></div>
                <div className="w-2 h-2 rounded-full bg-slate-800"></div>
              </div>
            </div>
            
            <div className="flex-1 p-6 font-mono text-[11px] overflow-y-auto space-y-1.5 bg-black/40 min-h-[300px]">
              {logs.map((log, idx) => (
                <div key={idx} className={`animate-in fade-in slide-in-from-left-2 duration-300 ${
                  log.type === 'success' ? 'text-emerald-500' : 
                  log.type === 'error' ? 'text-red-500' : 'text-slate-400'
                }`}>
                  <span className="opacity-50 mr-2">[{new Date().toLocaleTimeString([], {hour12: false})}]</span>
                  <span className="font-bold">>> {log.msg.toUpperCase()}</span>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>

          {history.length > 0 && (
            <div className="glass rounded-3xl p-6 border border-slate-800">
              <div className="flex items-center gap-2 mb-4">
                <History size={16} className="text-indigo-500" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Historical Exports</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {history.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-800/50 hover:border-indigo-500/30 transition-all group">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-slate-300 truncate">{item.filename}</p>
                      <p className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter mt-0.5">
                        {item.count} Targets Found
                      </p>
                    </div>
                    <button 
                      onClick={() => downloadCSV(item.data, item.filename)}
                      className="p-2 text-indigo-400 hover:text-white hover:bg-indigo-600 rounded-lg transition-all"
                    >
                      <Download size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="max-w-6xl mx-auto w-full pt-10 pb-6 text-center text-slate-600 text-[10px] font-black uppercase tracking-[0.4em] opacity-50">
        OmniExtract Pro • Background OCR Engine • Secure Transmission
      </footer>
    </div>
  );
};

export default App;