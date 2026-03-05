'use client';

import { createClient } from '@supabase/supabase-js';
import React, { useState, useRef, useEffect } from 'react';
import { 
  UploadCloud, FileAudio, CheckCircle, Clock, Play, Pause, 
  Plus, Headphones, ChevronLeft, Loader2, Key, AlertCircle, Trash2,
  Edit2, Check, X, Download, FileText, CheckSquare, LogOut
} from 'lucide-react';

// ── Edit A: Supabase initialized server-side with env vars ──────────────────
const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function App() {
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deepgramKey] = useState(process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY || '');

  const [transcriptions, setTranscriptions] = useState([]);
  const [currentView, setCurrentView] = useState('dashboard');
  const [activeTranscript, setActiveTranscript] = useState(null);

  // Handle Auth
  useEffect(() => {
    setIsLoading(true);

    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchTranscriptions();
      setIsLoading(false);
    });

    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchTranscriptions();
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchTranscriptions = async () => {
    const { data, error } = await supabaseClient
      .from('transcriptions')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setTranscriptions(data);
    if (error) console.error("Error fetching transcriptions:", error);
  };

  const handleLogout = async () => {
    await supabaseClient.auth.signOut();
    setTranscriptions([]);
    setCurrentView('dashboard');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  if (!session) {
    return <AuthScreen supabase={supabaseClient} />;
  }

  const navigateTo = (view, transcript = null) => {
    setCurrentView(view);
    if (transcript) setActiveTranscript(transcript);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 flex flex-col justify-between">
        <div>
          <div className="h-16 flex items-center px-6 border-b border-slate-100">
            <Headphones className="text-indigo-600 mr-2" size={24} />
            <span className="font-bold text-lg tracking-tight">TranscribeAI</span>
          </div>
          <nav className="p-4 space-y-2">
            <button 
              onClick={() => navigateTo('dashboard')}
              className={`w-full flex items-center px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${currentView === 'dashboard' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <FileAudio className="mr-3" size={18} /> My Transcripts
            </button>
            <button 
              onClick={() => navigateTo('upload')}
              className={`w-full flex items-center px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${currentView === 'upload' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <UploadCloud className="mr-3" size={18} /> New Upload
            </button>
          </nav>
        </div>
        
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold mr-3">
              {session.user.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="overflow-hidden text-sm">
              <p className="font-medium text-slate-900 truncate">{session.user.email}</p>
              <p className="text-slate-500 text-xs truncate">Authenticated</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            <LogOut className="mr-3" size={18} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-6 md:p-10">
          {currentView === 'dashboard' && (
            <Dashboard 
              supabase={supabaseClient}
              transcriptions={transcriptions} 
              onNew={() => navigateTo('upload')}
              onSelect={(t) => navigateTo('detail', t)}
              fetchTranscriptions={fetchTranscriptions}
            />
          )}
          {currentView === 'upload' && (
            <UploadScreen 
              supabase={supabaseClient}
              user={session?.user}
              onUploadComplete={(newTranscript) => {
                fetchTranscriptions();
                navigateTo('detail', newTranscript);
              }}
              onCancel={() => navigateTo('dashboard')}
            />
          )}
          {currentView === 'detail' && activeTranscript && (
            <TranscriptDetail 
              supabase={supabaseClient}
              transcript={activeTranscript} 
              onBack={() => {
                fetchTranscriptions();
                navigateTo('dashboard');
              }} 
            />
          )}
        </div>
      </main>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function Dashboard({ supabase, transcriptions, onNew, onSelect, fetchTranscriptions }) {
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteTranscript = async (e, id) => {
    e.stopPropagation(); 
    setIsDeleting(true);
    await supabase.from('transcriptions').delete().eq('id', id);
    await fetchTranscriptions();
    setIsDeleting(false);
  };

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Transcripts</h1>
          <p className="text-slate-500 text-sm mt-1">Manage and search your converted audio files.</p>
        </div>
        <button onClick={onNew} className="flex items-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors">
          <Plus size={18} className="mr-2" /> New Upload
        </button>
      </div>

      {transcriptions.length === 0 ? (
        <div className="bg-white border border-slate-200 border-dashed rounded-2xl p-12 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4"><FileAudio className="text-slate-400" size={32} /></div>
          <h3 className="text-lg font-semibold text-slate-900 mb-1">No transcripts yet</h3>
          <p className="text-slate-500 mb-6 max-w-sm">Upload your first audio or video file to generate an AI-powered text transcript.</p>
          <button onClick={onNew} className="px-5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-lg">Upload a file</button>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4 hidden sm:table-cell">Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transcriptions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => onSelect(t)}>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <FileAudio className="text-indigo-500 mr-3 shrink-0" size={20} />
                      <span className="font-medium text-slate-900 truncate max-w-[200px] md:max-w-xs">{t.title}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 hidden sm:table-cell">
                    {new Date(t.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      t.status === 'completed' ? 'bg-green-100 text-green-800' : 
                      t.status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {t.status === 'completed' && <CheckCircle size={12} className="mr-1" />}
                      {t.status === 'processing' && <Loader2 size={12} className="mr-1 animate-spin" />}
                      {t.status.charAt(0).toUpperCase() + t.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right flex justify-end items-center gap-3">
                    <button className="text-indigo-600 hover:text-indigo-900 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">View</button>
                    <button disabled={isDeleting} onClick={(e) => deleteTranscript(e, t.id)} className="text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function UploadScreen({ supabase, user, onUploadComplete, onCancel }) {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progressStatus, setProgressStatus] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected && (selected.type.startsWith('audio/') || selected.type.startsWith('video/'))) {
      setFile(selected);
      setErrorMsg('');
    } else {
      setErrorMsg("Please select a valid audio or video file.");
    }
  };

  const processUpload = async () => {
    if (!file || !user || !supabase) return;
    setIsUploading(true);
    setErrorMsg('');

    try {
      // 1. Upload to Supabase Storage
      setProgressStatus('Uploading to storage bucket...');
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('audio-uploads')
        .upload(fileName, file);

      if (uploadError) throw new Error(`Storage Upload Failed: ${uploadError.message}`);

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('audio-uploads')
        .getPublicUrl(fileName);

      // 3. Create initial database record
      setProgressStatus('Initiating transcription engine...');
      const { data: dbRecord, error: dbError } = await supabase
        .from('transcriptions')
        .insert([{ 
          user_id: user.id, 
          title: file.name, 
          audio_url: publicUrl, 
          status: 'processing' 
        }])
        .select()
        .single();

      if (dbError) throw new Error(`Database Insert Failed: ${dbError.message}`);

      // ── Edit B: Deepgram call routed through secure backend API route ──
      setProgressStatus('Deepgram AI is analyzing audio...');
      const myApiResponse = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioUrl: publicUrl })
      });

      if (!myApiResponse.ok) {
        const errData = await myApiResponse.json();
        throw new Error(errData.error || 'Transcription failed');
      }

      const dgResult = await myApiResponse.json();

      let finalTranscript = 'No text detected.';
      if (dgResult.results?.channels?.length > 0) {
        const paragraphs = dgResult.results.channels[0].alternatives[0].paragraphs;
        if (paragraphs) {
          finalTranscript = paragraphs.transcript; 
        } else {
          finalTranscript = dgResult.results.channels[0].alternatives[0].transcript;
        }
      }

      // 5. Update Database with Success
      setProgressStatus('Saving results...');
      const { data: finalRecord, error: updateError } = await supabase
        .from('transcriptions')
        .update({ transcript_text: finalTranscript, status: 'completed' })
        .eq('id', dbRecord.id)
        .select()
        .single();

      if (updateError) throw new Error(`Final Database Update Failed: ${updateError.message}`);

      onUploadComplete(finalRecord);

    } catch (err) {
      console.error(err);
      setErrorMsg(err.message);
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in duration-300">
      <div className="flex items-center mb-8">
        <button onClick={onCancel} className="mr-4 text-slate-400 hover:text-slate-600"><ChevronLeft size={24} /></button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Upload Audio</h1>
          <p className="text-slate-500 text-sm mt-1">Select an audio file to transcribe.</p>
        </div>
      </div>

      {!isUploading ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-8">
            {errorMsg && (
              <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100 flex items-start">
                <AlertCircle size={18} className="mr-2 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}
            
            <div 
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handleFileChange({ target: { files: e.dataTransfer.files } }); }}
              onClick={() => fileInputRef.current.click()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${file ? 'border-indigo-300 bg-indigo-50' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'}`}
            >
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="audio/*,video/*" className="hidden" />
              
              {file ? (
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4"><FileAudio className="text-indigo-600" size={32} /></div>
                  <h3 className="text-lg font-semibold text-slate-900">{file.name}</h3>
                  <p className="text-slate-500 mt-1">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                  <button className="mt-4 text-sm text-indigo-600 font-medium hover:underline">Change file</button>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4"><UploadCloud className="text-slate-500" size={32} /></div>
                  <h3 className="text-lg font-medium text-slate-900 mb-1">Click or drag file to this area to upload</h3>
                  <p className="text-slate-500 text-sm">MP3, WAV, FLAC, M4A up to 50MB</p>
                </div>
              )}
            </div>
          </div>
          <div className="bg-slate-50 px-8 py-4 border-t border-slate-200 flex justify-end gap-3">
            <button onClick={onCancel} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg">Cancel</button>
            <button onClick={processUpload} disabled={!file} className={`px-6 py-2 rounded-lg font-medium transition-colors ${file ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
              Transcribe Audio
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-6" />
          <h3 className="text-xl font-bold text-slate-900 mb-2">Processing Document</h3>
          <p className="text-slate-500 mb-8 font-medium text-indigo-600">{progressStatus}</p>
          <div className="w-full max-w-md mx-auto bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div className="bg-indigo-600 h-2.5 rounded-full w-full animate-pulse"></div>
          </div>
        </div>
      )}
    </div>
  );
}

function TranscriptDetail({ supabase, transcript: initialTranscript, onBack }) {
  const [transcript, setTranscript] = useState(initialTranscript);
  const [isPlaying, setIsPlaying] = useState(false);
  const [copyStatus, setCopyStatus] = useState('Copy Text');
  
  // Title Editing State
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState(initialTranscript.title);
  const [isSavingTitle, setIsSavingTitle] = useState(false);

  const audioRef = useRef(null);

  const togglePlay = () => {
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play();
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      const handleEnded = () => setIsPlaying(false);
      audio.addEventListener('ended', handleEnded);
      return () => audio.removeEventListener('ended', handleEnded);
    }
  }, []);

  const copyText = () => {
    const el = document.createElement('textarea');
    el.value = transcript.transcript_text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    setCopyStatus('Copied!');
    setTimeout(() => setCopyStatus('Copy Text'), 2000);
  };

  const handleSaveTitle = async () => {
    if (!editTitleValue.trim() || editTitleValue === transcript.title || !supabase) {
      setIsEditingTitle(false);
      return;
    }
    setIsSavingTitle(true);
    const { error } = await supabase
      .from('transcriptions')
      .update({ title: editTitleValue })
      .eq('id', transcript.id);
    if (!error) {
      setTranscript({ ...transcript, title: editTitleValue });
    }
    setIsSavingTitle(false);
    setIsEditingTitle(false);
  };

  const downloadPDF = () => {
    if (!window.jspdf) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(transcript.title, 15, 20);
    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);
    const lines = doc.splitTextToSize(transcript.transcript_text || 'No text.', 180);
    let yPos = 35;
    lines.forEach(line => {
      if (yPos > 280) { doc.addPage(); yPos = 20; }
      doc.text(line, 15, yPos);
      yPos += 7;
    });
    doc.save(`${transcript.title.replace(/\s+/g, '_')}.pdf`);
  };

  const downloadDOC = () => {
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export</title></head><body>";
    const footer = "</body></html>";
    const textHtml = (transcript.transcript_text || '').replace(/\n/g, '<br><br>');
    const html = `${header}<h1>${transcript.title}</h1><p>${textHtml}</p>${footer}`;
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${transcript.title.replace(/\s+/g, '_')}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex items-center mb-6">
        <button onClick={onBack} className="mr-4 text-slate-400 hover:text-slate-600 p-2 -ml-2 rounded-full hover:bg-slate-100"><ChevronLeft size={24} /></button>
        <div className="flex-1">
          {isEditingTitle ? (
            <div className="flex items-center max-w-md">
              <input 
                autoFocus
                type="text" 
                value={editTitleValue}
                onChange={(e) => setEditTitleValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                className="text-2xl font-bold text-slate-900 border-b-2 border-indigo-500 focus:outline-none bg-transparent w-full py-1"
              />
              <button disabled={isSavingTitle} onClick={handleSaveTitle} className="ml-2 text-green-600 hover:bg-green-50 p-1.5 rounded-lg"><Check size={20} /></button>
              <button disabled={isSavingTitle} onClick={() => { setIsEditingTitle(false); setEditTitleValue(transcript.title); }} className="ml-1 text-slate-400 hover:bg-slate-100 p-1.5 rounded-lg"><X size={20} /></button>
            </div>
          ) : (
            <div className="flex items-center group">
              <h1 className="text-2xl font-bold text-slate-900 truncate mr-3">{transcript.title}</h1>
              <button onClick={() => setIsEditingTitle(true)} className="text-slate-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                <Edit2 size={16} />
              </button>
            </div>
          )}
          <div className="flex items-center text-sm text-slate-500 mt-1">
            <Clock size={14} className="mr-1.5" />
            Transcribed on {new Date(transcript.created_at).toLocaleDateString()}
          </div>
        </div>
        
        {/* Export Buttons */}
        <div className="flex gap-2">
          <button onClick={downloadDOC} className="flex items-center px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg transition-colors">
            <FileText size={16} className="mr-2 text-blue-600" /> .DOC
          </button>
          <button onClick={downloadPDF} className="flex items-center px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg transition-colors">
            <Download size={16} className="mr-2 text-red-500" /> .PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-semibold text-slate-800">Transcript</h3>
            <button onClick={copyText} className={`text-sm font-medium flex items-center transition-colors ${copyStatus === 'Copied!' ? 'text-green-600' : 'text-indigo-600 hover:text-indigo-800'}`}>
              {copyStatus === 'Copied!' && <CheckSquare size={14} className="mr-1.5" />}
              {copyStatus}
            </button>
          </div>
          <div className="p-6 overflow-y-auto flex-1 prose prose-slate max-w-none">
            {transcript.transcript_text ? (
              transcript.transcript_text.split('\n').map((paragraph, idx) => (
                paragraph.trim() && <p key={idx} className="text-slate-700 leading-relaxed mb-4">{paragraph}</p>
              ))
            ) : (
              <p className="text-slate-400 italic">No text was extracted. The file might be empty or processing failed.</p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-semibold text-slate-800 mb-4">Original Audio</h3>
            <audio ref={audioRef} src={transcript.audio_url} className="hidden" />
            <div className="flex flex-col items-center p-6 bg-slate-50 rounded-xl border border-slate-100">
              <button onClick={togglePlay} className="w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow-md transition-transform hover:scale-105 mb-4">
                {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
              </button>
              <div className="w-full text-center">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  {isPlaying ? 'Playing Audio...' : 'Ready to play'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-semibold text-slate-800 mb-4">Details</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex justify-between items-center border-b border-slate-50 pb-3">
                <span className="text-slate-500">Status</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${transcript.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                  {transcript.status.charAt(0).toUpperCase() + transcript.status.slice(1)}
                </span>
              </li>
              <li className="flex justify-between items-center">
                <span className="text-slate-500">Words</span>
                <span className="font-medium text-slate-800">{transcript.transcript_text ? transcript.transcript_text.split(' ').length : 0}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthScreen({ supabase }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load jsPDF for PDF export (only needed client-side)
  useEffect(() => {
    if (!window.jspdf) {
      const pdfScript = document.createElement('script');
      pdfScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      document.head.appendChild(pdfScript);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <Headphones className="text-white" size={28} />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-center text-slate-900 mb-2">Welcome to TranscribeAI</h1>
        <p className="text-center text-slate-500 mb-8">Sign in to access the platform.</p>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-start">
            <AlertCircle size={16} className="mr-2 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition-colors mt-2 flex justify-center items-center">
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}