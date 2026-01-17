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
  Zap,
  ShieldCheck,
  Terminal,
  FileText
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
  const [logs, setLogs] = useState<{msg: string, type: 'info' | 'success' | 'error' | 'system'}[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedHistory = localStorage.getItem('omniextract_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    const savedCount = localStorage.getItem('omniextract_count');
    if (savedCount) setDownloadCount(parseInt(savedCount, 10));
    addLog('OMNI-CORE INITIALIZED. READY FOR INGESTION.', 'system');
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

  const addLog = (msg: string, type: 'info' | 'success' | 'error' | 'system' = 'info') => {
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
    addLog(`Buffer update: ${limitedFiles.length} objects added to queue.`, 'info');
  };

  const processAll = async () => {
    if (files.length === 0 || isProcessing) return;
    setIsProcessing(true);
    addLog('CRITICAL: Batch extraction sequence engaged.', 'system');

    const updatedFiles = [...files];
    const newExtracted: ExtractedNumber[] = [];

    for (let i = 0; i < updatedFiles.length; i++) {
      const current = updatedFiles[i];
      if (current.status === 'completed') continue;

      try {
        setFiles(prev => prev.map(f => f.id === current.id ? { ...f, status: 'processing', progress: 10 } : f));
        addLog(`Analyzing Object: ${current.file.name.toUpperCase()}`, 'info');
        
        const base64 = await preprocessImage(current.file);
        setFiles(prev => prev.map(f => f.id === current.id ? { ...f, progress: 30 } : f));

        const { text } = await performOCR(base64);
        setFiles(prev => prev.map(f => f.id === current.id ? { ...f, progress: 70, rawText: text } : f));

        const numbers = extractAndFormatNumbers(text);
        let discoveredInObject = 0;
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
            discoveredInObject++;
          }
        });

        if (discoveredInObject > 0) {
          addLog(`Success: Captured ${discoveredInObject} unique identities from object ${i+1}.`, 'success');
        } else {
          addLog(`Result: No new unique identifiers found in object ${i+1}.`, 'info');
        }

        setFiles(prev => prev.map(f => f.id === current.id ? { ...f, status: 'completed', progress: 100 } : f));
      } catch (err) {
        addLog(`FAILURE: Kernel error on object ${i+1}. Skipping.`, 'error');
        setFiles(prev => prev.map(f => f.id === current.id ? { ...f, status: 'error', error: 'Process failed' } : f));
      }
    }

    setExtractedNumbers(prev => [...prev, ...newExtracted]);
    setIsProcessing(false);
    addLog('SEQUENCE COMPLETE. DATA BUFFER POPULATED.', 'system');
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

    setHistory(prev => [historyItem, ...prev].slice(0, 10));
    setDownloadCount(nextCount);
    addLog(`Exported archive: ${filename} (Google Contacts Format).`, 'success');
  };

  const resetSystem = () => {
    if (confirm("Confirm system wipe? All temporary buffer data will be purged.")) {
      setFiles([]);
      setExtractedNumbers([]);
      setIsProcessing(false);
      addLog('CORE WIPE SUCCESSFUL. SYSTEM RESET.', 'system');
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-4 sm:p-10 selection:bg-indigo-500/30">
      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none opacity-20 overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2"></div>
      </div>

      {/* Header */}
      <div className="max-w-6xl mx-auto w-full flex flex-col sm:flex-row justify-between items-start sm:items-end pb-8 border-b border-slate-800 gap-4 mb-10 relative z-10">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter glow-text italic flex items-center gap-3">
            OMNI<span className="text-indigo-500">EXTRACT</span> <span className="text-slate-500 not-italic font-light">PRO</span>
          </h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.4em] mono mt-1">Stealth Batch Engine // Google Contacts Ready</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={resetSystem}
            className="text-[10px] text-red-500 hover:text-red-400 font-bold uppercase tracking-widest border border-red-900/30 bg-red-950/20 px-5 py-2 rounded-full transition-all hover:bg-red-900/40"
          >
            System Wipe
          </button>
        </div>
      </div>

      <main className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 relative z-10">
        
        {/* Left Column: Command & Input */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* Upload Area */}
          <div className="glass rounded-3xl p-1 relative overflow-hidden group border border-slate-800/50 hover:border-indigo-500/30 transition-all duration-500">
            <div className="p-10 flex flex-col items-center justify-center text-center cursor-pointer relative z-10">
              <input 
                type="file" 
                multiple 
                accept="image/*" 
                onChange={handleFileUpload}
                disabled={isProcessing}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
              />
              <div className="p-6 bg-indigo-500/10 rounded-2xl mb-4 border border-indigo-500/20 group-hover:scale-110 transition-transform duration-500 group-hover:bg-indigo-500/20">
                <Upload className="w-8 h-8 text-indigo-500" />
              </div>
              <p className="font-black text-white text-xl tracking-tight">INJECT BATCH</p>
              <p className="text-[10px] text-slate-500 mono mt-2 uppercase tracking-widest font-bold">Secure Local Ingestion // Max 20 Objects</p>
            </div>
          </div>

          {/* Core Status & Export */}
          <div className="glass p-8 rounded-3xl relative overflow-hidden border border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-[10px] font-bold text-slate-500 mono uppercase tracking-widest mb-1">Identified Targets</p>
                <h3 className="text-6xl font-black text-white tracking-tighter">{extractedNumbers.length.toString().padStart(2, '0')}</h3>
              </div>
              <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl animate-pulse">
                <ShieldCheck className="w-8 h-8 text-indigo-500" />
              </div>
            </div>

            {files.length > 0 && !isProcessing && extractedNumbers.length === 0 && (
              <button 
                onClick={processAll}
                className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-2xl shadow-indigo-900/30 mb-4 flex items-center justify-center gap-3 group"
              >
                <Zap className="w-4 h-4 fill-white group-hover:scale-125 transition-transform" />
                Initiate Extraction
              </button>
            )}

            <button 
              onClick={handleDownload}
              disabled={extractedNumbers.length === 0 || isProcessing}
              className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${
                extractedNumbers.length > 0 && !isProcessing 
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-2xl shadow-emerald-900/30' 
                : 'bg-slate-900 text-slate-700 border border-slate-800 cursor-not-allowed'
              }`}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                  Kernel Processing...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Generate Archive
                </>
              )}
            </button>
            <p className="text-[9px] text-center text-slate-600 font-bold mono mt-5 uppercase tracking-widest opacity-40">Next Sequence Index: {downloadCount + 1}</p>
          </div>

          {/* Progress List (Mini) */}
          {files.length > 0 && (
            <div className="glass rounded-3xl p-6 border border-slate-800 max-h-48 overflow-y-auto scrollbar-hide">
               <div className="flex items-center gap-2 mb-4">
                <FileText size={14} className="text-slate-500" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Buffer Queue</span>
              </div>
              <div className="space-y-2">
                {files.map(f => (
                  <div key={f.id} className="flex items-center justify-between text-[10px] font-mono border-b border-slate-800/50 pb-2">
                    <span className="text-slate-400 truncate max-w-[150px]">{f.file.name}</span>
                    <span className={`uppercase ${f.status === 'completed' ? 'text-emerald-500' : f.status === 'error' ? 'text-red-500' : 'text-slate-600 animate-pulse'}`}>
                      {f.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Kernel Stream & Archive */}
        <div className="lg:col-span-7 space-y-8 flex flex-col">
          
          <div className="glass rounded-3xl overflow-hidden flex flex-col flex-1 border border-slate-800 shadow-2xl min-h-[400px]">
            <div className="bg-slate-950/80 p-4 border-b border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Terminal className="w-4 h-4 text-indigo-500" />
                <span className="text-[10px] font-bold text-slate-400 font-mono tracking-widest uppercase">System Core Output</span>
              </div>
              <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-slate-800"></div>
                <div className="w-2 h-2 rounded-full bg-slate-800"></div>
                <div className="w-2 h-2 rounded-full bg-slate-800"></div>
              </div>
            </div>
            
            <div className="flex-1 p-6 font-mono text-[11px] overflow-y-auto space-y-2 bg-black/50 scrollbar-hide">
              {logs.map((log, idx) => (
                <div key={idx} className={`animate-in fade-in slide-in-from-left-2 duration-300 border-l-2 pl-3 py-0.5 ${
                  log.type === 'success' ? 'text-emerald-400 border-emerald-900/50' : 
                  log.type === 'error' ? 'text-red-400 border-red-900/50' : 
                  log.type === 'system' ? 'text-indigo-400 border-indigo-900/50' : 'text-slate-500 border-slate-800'
                }`}>
                  <span className="opacity-30 mr-2 tabular-nums">[{new Date().toLocaleTimeString([], {hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit'})}]</span>
                  <span className={`${log.type === 'system' ? 'font-black' : 'font-medium'}`}>>> {log.msg.toUpperCase()}</span>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>

          {/* History / Recent Exports */}
          {history.length > 0 && (
            <div className="glass rounded-3xl p-6 border border-slate-800 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-2 mb-4">
                <History size={16} className="text-indigo-500" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Extraction Archive</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {history.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-slate-900/40 rounded-xl border border-slate-800/50 hover:border-indigo-500/40 transition-all group backdrop-blur-sm">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-slate-300 truncate">{item.filename}</p>
                      <p className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter mt-0.5 font-mono">
                        {item.count} IDENTITIES CAPTURED
                      </p>
                    </div>
                    <button 
                      onClick={() => downloadCSV(item.data, item.filename)}
                      className="p-2 text-indigo-400 hover:text-white hover:bg-indigo-600 rounded-lg transition-all shadow-lg"
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

      <footer className="max-w-6xl mx-auto w-full pt-12 pb-8 text-center text-slate-700 text-[9px] font-black uppercase tracking-[0.5em] opacity-30">
        OmniExtract Pro // Engine Revision 4.2.0 // Secure Extraction Shield Active
      </footer>
    </div>
  );
};

export default App;