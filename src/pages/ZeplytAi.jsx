// src/pages/ZeplytAi.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import FontFamily from '@tiptap/extension-font-family';
import { saveAs } from 'file-saver';
import logo from '/logo.webp';

// 🔒 LOCK THE FEATURE – set to true to lock, false to unlock
const FEATURE_LOCKED = true;

// ==========================================
// 1. API CONFIGURATION
// ==========================================
const aiApi = axios.create({ 
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/ai` : 'http://localhost:5000/api/ai',
  headers: { 'Content-Type': 'application/json' }
});

aiApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ==========================================
// 2. ALL HELPERS (unchanged)
// ==========================================
function formatDraftToHtml(rawText) {
  if (!rawText) return '<p>No content</p>';
  const escapeHtml = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const convertMarkup = (text) => escapeHtml(text).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>');

  const lines = rawText.split('\n');
  const elements = [];
  let inList = false;
  let listItems = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (line === '') {
      if (inList) { elements.push(`<ul>${listItems.join('')}</ul>`); listItems = []; inList = false; }
      elements.push('<br/>'); continue;
    }
    
    const headingMatch = line.match(/^\*\*(.+?)\*\*$/);
    if (headingMatch) {
      if (inList) { elements.push(`<ul>${listItems.join('')}</ul>`); listItems = []; inList = false; }
      elements.push(`<h2 style="font-weight: bold; margin-top: 1em;">${convertMarkup(headingMatch[1])}</h2>`); continue;
    }
    
    const numberedBold = line.match(/^(\d+\.)\s+\*\*(.+?)\*\*(?::\s*(.*))?$/);
    if (numberedBold) {
      if (inList) { elements.push(`<ul>${listItems.join('')}</ul>`); listItems = []; inList = false; }
      elements.push(`<h3 style="font-weight: bold;">${numberedBold[1]} ${convertMarkup(numberedBold[2])}</h3>`);
      if (numberedBold[3]) elements.push(`<p>${convertMarkup(numberedBold[3])}</p>`); continue;
    }
    
    const numbered = line.match(/^(\d+\.)\s+(.*?)(?::\s*(.*))?$/);
    if (numbered) {
      if (inList) { elements.push(`<ul>${listItems.join('')}</ul>`); listItems = []; inList = false; }
      elements.push(`<h3 style="font-weight: bold;">${numbered[1]} ${convertMarkup(numbered[2])}</h3>`);
      if (numbered[3]) elements.push(`<p>${convertMarkup(numbered[3])}</p>`); continue;
    }
    
    if (line.startsWith('- ') || line.startsWith('* ')) {
      if (!inList) inList = true;
      listItems.push(`<li>${convertMarkup(line.substring(2))}</li>`); continue;
    }
    
    if (inList) { elements.push(`<ul>${listItems.join('')}</ul>`); listItems = []; inList = false; }
    elements.push(`<p style="margin-bottom: 0.5em;">${convertMarkup(line)}</p>`);
  }
  if (inList) elements.push(`<ul>${listItems.join('')}</ul>`);
  return elements.join('');
}

function renderInline(text) {
  if (!text) return text;
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>;
    const subParts = part.split(/(\*.*?\*)/g);
    return subParts.map((sub, j) => {
      if (sub.startsWith('*') && sub.endsWith('*')) return <em key={`${i}-${j}`} className="italic">{sub.slice(1, -1)}</em>;
      return sub;
    });
  });
}

function flushList(elements, listItems, key) {
  if (listItems.length === 0) return;
  elements.push(
    <div key={`list-${key}`} className="ml-4 mb-2 space-y-1">
      {listItems.map((item, i) => <div key={i} className="flex items-start"><span className="font-medium mr-2">•</span><span>{item}</span></div>)}
    </div>
  );
  listItems.length = 0;
}

function formatAIResponse(text, isDraft = false) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let inList = false;
  let listItems = [];

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed === '') { if (inList) flushList(elements, listItems, idx); elements.push(<br key={`br-${idx}`} />); return; }
    
    const hashHeadingMatch = trimmed.match(/^(#+)\s+(.*)$/);
    if (hashHeadingMatch) {
      if (inList) flushList(elements, listItems, idx);
      elements.push(
        <h2 key={idx} className="text-xl md:text-2xl font-bold mt-8 mb-4 text-white tracking-tight">
          {renderInline(hashHeadingMatch[2])}
        </h2>
      );
      return;
    }

    const numberedBoldMatch = trimmed.match(/^(\d+\.)\s+\*\*(.+?)\*\*(?::\s*(.*))?$/);
    if (numberedBoldMatch) {
      if (inList) flushList(elements, listItems, idx);
      elements.push(<div key={idx} className="mt-4 mb-1"><h3 className="text-lg font-bold text-blue-400">{numberedBoldMatch[1]} {numberedBoldMatch[2]}</h3>{numberedBoldMatch[3] && <p className="mt-1">{renderInline(numberedBoldMatch[3])}</p>}</div>); return;
    }
    
    const numberedMatch = trimmed.match(/^(\d+\.)\s+(.*?)(?::\s*(.*))?$/);
    if (numberedMatch) {
      if (inList) flushList(elements, listItems, idx);
      elements.push(<div key={idx} className="mt-4 mb-1"><h3 className="text-lg font-bold text-blue-400">{numberedMatch[1]} {numberedMatch[2]}</h3>{numberedMatch[3] && <p className="mt-1">{renderInline(numberedMatch[3])}</p>}</div>); return;
    }
    
    const headingMatch = trimmed.match(/^\*\*(.+?)\*\*$/);
    if (headingMatch) { if (inList) flushList(elements, listItems, idx); elements.push(<h3 key={idx} className="text-xl font-bold mt-4 mb-2 text-white">{headingMatch[1]}</h3>); return; }
    
    const numberedListItem = trimmed.match(/^(\d+\.)\s+(.*)/);
    if (numberedListItem) { if (inList) flushList(elements, listItems, idx); elements.push(<div key={idx} className="flex ml-4 mb-1"><span className="font-bold mr-2 w-6 text-blue-500">{numberedListItem[1]}</span><span className="flex-1">{renderInline(numberedListItem[2])}</span></div>); return; }
    
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) { if (!inList) inList = true; listItems.push(renderInline(trimmed.substring(2))); return; }
    
    if (inList) flushList(elements, listItems, idx);
    elements.push(<p key={idx} className="mb-2 text-zinc-300">{renderInline(trimmed)}</p>);
  });

  if (inList) flushList(elements, listItems, lines.length);
  return elements;
}

// ==========================================
// 3. EDITOR COMPONENTS
// ==========================================
const MenuBar = ({ editor }) => {
  if (!editor) return null;
  return (
    <div className="border-b border-gray-200 p-2 flex flex-wrap gap-1 bg-gray-50 text-black">
      <select onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()} className="px-2 py-1 text-sm border rounded">
        <option value="Times New Roman">Times New Roman</option><option value="Arial">Arial</option><option value="Georgia">Georgia</option>
      </select>
      <select onChange={(e) => { const level = parseInt(e.target.value, 10); if (level === 0) editor.chain().focus().setParagraph().run(); else editor.chain().focus().toggleHeading({ level }).run(); }} className="px-2 py-1 text-sm border rounded">
        <option value="0">Paragraph</option><option value="1">Heading 1</option><option value="2">Heading 2</option><option value="3">Heading 3</option>
      </select>
      <button onClick={() => editor.chain().focus().toggleBold().run()} className={`px-2 py-1 rounded text-sm ${editor.isActive('bold') ? 'bg-gray-300' : 'hover:bg-gray-200'}`}>Bold</button>
      <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`px-2 py-1 rounded text-sm ${editor.isActive('italic') ? 'bg-gray-300' : 'hover:bg-gray-200'}`}>Italic</button>
      <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={`px-2 py-1 rounded text-sm ${editor.isActive('underline') ? 'bg-gray-300' : 'hover:bg-gray-200'}`}>Underline</button>
      <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={`px-2 py-1 rounded text-sm ${editor.isActive('bulletList') ? 'bg-gray-300' : 'hover:bg-gray-200'}`}>Bullet List</button>
      <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`px-2 py-1 rounded text-sm ${editor.isActive('orderedList') ? 'bg-gray-300' : 'hover:bg-gray-200'}`}>Numbered List</button>
      <button onClick={() => editor.chain().focus().setTextAlign('left').run()} className={`px-2 py-1 rounded text-sm ${editor.isActive({ textAlign: 'left' }) ? 'bg-gray-300' : 'hover:bg-gray-200'}`}>Left</button>
      <button onClick={() => editor.chain().focus().setTextAlign('center').run()} className={`px-2 py-1 rounded text-sm ${editor.isActive({ textAlign: 'center' }) ? 'bg-gray-300' : 'hover:bg-gray-200'}`}>Center</button>
      <button onClick={() => editor.chain().focus().setTextAlign('right').run()} className={`px-2 py-1 rounded text-sm ${editor.isActive({ textAlign: 'right' }) ? 'bg-gray-300' : 'hover:bg-gray-200'}`}>Right</button>
      <button onClick={() => editor.chain().focus().setTextAlign('justify').run()} className={`px-2 py-1 rounded text-sm ${editor.isActive({ textAlign: 'justify' }) ? 'bg-gray-300' : 'hover:bg-gray-200'}`}>Justify</button>
    </div>
  );
};

function DraftEditor({ initialContent }) {
  const [htmlContent, setHtmlContent] = useState('');
  useEffect(() => { setHtmlContent(formatDraftToHtml(initialContent)); }, [initialContent]);

  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [1, 2, 3] } }), TextAlign.configure({ types: ['heading', 'paragraph'] }), Underline, FontFamily],
    content: htmlContent,
    editable: true,
    editorProps: { attributes: { style: 'font-family: "Times New Roman", Times, serif; font-size: 12pt; line-height: 1.5; outline:none; color: black;', class: 'legal-editor' } },
  });

  useEffect(() => { if (editor && htmlContent) editor.commands.setContent(htmlContent); }, [editor, htmlContent]);

  const handleExport = () => {
    if (!editor) return;
    const fullHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Document Draft</title><style>body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; margin: 0.5cm; line-height: 1.5; } strong { font-weight: bold; } h1 { font-size: 18pt; text-align: center; margin-bottom: 1em; } h2 { font-size: 16pt; margin-top: 1em; margin-bottom: 0.5em; } h3 { font-size: 14pt; margin-top: 0.8em; margin-bottom: 0.3em; } p, li { margin-bottom: 0.2em; text-align: justify; } ul, ol { padding-left: 1.5em; }</style></head><body>${editor.getHTML()}</body></html>`;
    saveAs(new Blob([fullHtml], { type: 'application/msword' }), 'document_draft.doc');
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
      <MenuBar editor={editor} />
      <div className="p-3 text-gray-800" style={{ minHeight: '400px', fontSize: '13px' }}><EditorContent editor={editor} /></div>
      <div className="border-t border-gray-200 p-3 bg-gray-50 flex justify-end">
        <button onClick={handleExport} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded flex items-center gap-1.5 text-xs font-bold">
          Export as Word
        </button>
      </div>
    </div>
  );
}

// ==========================================
// 4. CHAT MESSAGE BUBBLE COMPONENT
// ==========================================
function Message({ role, content, references, fresh, intent }) {
  const [copied, setCopied] = useState(null);
  const [displayedContent, setDisplayedContent] = useState(fresh ? '' : content);
  const [typing, setTyping] = useState(fresh);
  const [showReferences, setShowReferences] = useState(!fresh);
  const [formattedContent, setFormattedContent] = useState(null);

  useEffect(() => { if (!fresh) setFormattedContent(formatAIResponse(content, intent === 'report')); }, [content, fresh, intent]);

  useEffect(() => {
    if (fresh) {
      setTyping(true);
      let i = 0;
      const interval = setInterval(() => {
        if (i < content.length) { setDisplayedContent(content.substring(0, i + 1)); i++; } 
        else { clearInterval(interval); setTyping(false); setFormattedContent(formatAIResponse(content, intent === 'report')); setTimeout(() => setShowReferences(true), 100); }
      }, 5);
      return () => clearInterval(interval);
    }
  }, [content, fresh, intent]);

  const copyToClipboard = (text, index) => { navigator.clipboard.writeText(text); setCopied(index); setTimeout(() => setCopied(null), 2000); };

  if (role === 'user') {
    return (
      <div className="flex justify-end mb-3">
        <div className="bg-blue-500 text-white font-medium p-3 rounded-xl rounded-tr-sm max-w-2xl shadow-sm text-sm">
          <p>{content}</p>
        </div>
      </div>
    );
  }

  if (intent === 'report' || intent === 'draft') {
    return (
      <div className="mb-4">
        <div className="bg-white text-gray-800 rounded-lg max-w-5xl border border-gray-200 shadow-sm">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
            <h2 className="text-sm font-bold text-gray-700">✦ AI Generated Report</h2>
            <p className="text-xs text-gray-400">Edit and format your report before exporting</p>
          </div>
          <div className="p-3"><DraftEditor initialContent={content} /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 flex">
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 max-w-4xl shadow-sm w-full">
        <div className="text-gray-700 text-sm leading-relaxed">
          {typing ? (
            <><span className="whitespace-pre-wrap">{displayedContent}</span><span className="animate-pulse ml-1 text-blue-500 font-bold">|</span></>
          ) : <div>{formattedContent}</div>}
        </div>
        
        {showReferences && references?.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-200">
            <h3 className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-2">Data Sources</h3>
            <div className="space-y-1.5">
              {references.map((ref, idx) => (
                <div key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-200 border-l-4 border-l-blue-500 shadow-sm">
                  <p className="text-xs text-gray-600 leading-relaxed">{ref.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 5. MAIN COMPONENT
// ==========================================
export default function ZeplytAi() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [asking, setAsking] = useState(false);
  const messagesEndRef = useRef(null);

  // Skip API calls if locked
  const fetchSessions = async () => {
    if (FEATURE_LOCKED) return;
    try {
      setLoading(true);
      const res = await aiApi.get('/sessions');
      setSessions(res.data);
    } catch (err) { console.error('Failed to fetch sessions:', err); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSessions(); }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const loadSession = async (sessionId) => {
    if (FEATURE_LOCKED) return;
    try {
      const res = await aiApi.get(`/sessions/${sessionId}`);
      setMessages(res.data);
      setCurrentSession(sessionId);
    } catch (err) { console.error(err); }
  };

  const startNewSession = () => { setCurrentSession(null); setMessages([]); };

  const deleteSession = async (e, sessionId) => {
    if (FEATURE_LOCKED) return;
    e.stopPropagation(); 
    if (!window.confirm("Are you sure you want to delete this chat history?")) return;
    
    try {
      await aiApi.delete(`/sessions/${sessionId}`);
      if (currentSession === sessionId) {
        setCurrentSession(null);
        setMessages([]);
      }
      fetchSessions();
    } catch (err) {
      console.error("Failed to delete session", err);
    }
  };

  const handleSubmit = async (e) => {
    if (FEATURE_LOCKED) return;
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = { role: 'user', content: input, _id: Date.now().toString(), fresh: false };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setAsking(true);

    try {
      const res = await aiApi.post('/ask', { question: userMsg.content, sessionId: currentSession });
      const assistantMsg = { role: 'assistant', content: res.data.answer, references: res.data.references, intent: res.data.intent, _id: Date.now().toString() + 'a', fresh: true };
      
      if (!currentSession) {
        setCurrentSession(res.data.sessionId);
      }

      setMessages(prev => [...prev, assistantMsg]);
      fetchSessions();
    } catch (err) { 
      console.error(err); 
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "⚠️ **Connection Error:** Failed to fetch financial report. Please ensure your backend is running and the Daily Sync has been generated.", 
        _id: Date.now().toString() + 'err', 
        fresh: true 
      }]);
    } finally { 
      setAsking(false); 
    }
  };

  // —— Normal UI ——
  return (
    <div className="fixed inset-0 z-40 bg-gray-50 text-gray-800 font-sans flex flex-col overflow-hidden">
      
      {/* TOP NAVBAR */}
      <div className="border-b border-gray-200 p-2.5 flex justify-between items-center bg-white shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="text-gray-500 hover:text-gray-700 font-bold text-[10px] bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-lg transition-colors">
            ← Dashboard
          </button>
          <h1 className="text-base font-bold tracking-tight text-gray-800 flex items-center gap-2">
            <span><img src={logo} alt="Zeplyt" className="h-10 w-auto" /></span> ZEPLYT AI
          </h1>
        </div>
        <button onClick={() => document.documentElement.requestFullscreen()} className="text-gray-500 hover:text-gray-700 bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-lg text-[10px] font-bold">
          ⛶ Fullscreen
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        
        {/* SIDEBAR */}
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0">
          <div className="p-3 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Financial Strategy</h2>
            <button onClick={startNewSession} className="bg-gray-100 border border-gray-200 hover:bg-gray-200 text-gray-700 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors">
              + New Chat
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 hide-scrollbar">
            {loading ? (
              <div className="text-center text-gray-400 text-[10px] font-bold uppercase tracking-wider p-3 mt-6">Loading Memory...</div>
            ) : sessions.length === 0 ? (
              <div className="text-center text-gray-400 text-[10px] font-bold uppercase tracking-wider p-3 mt-6">No History Found</div>
            ) : (
              sessions.map((session) => (
                <div key={session._id} onClick={() => loadSession(session._id)} className={`group relative p-2.5 rounded-lg cursor-pointer border transition-colors ${currentSession === session._id ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'}`}>
                  <div className="pr-5">
                    <p className="text-xs truncate text-gray-700 font-medium mb-0.5">
                      {session.lastMessage?.content?.substring(0, 35) || 'Empty Session'}...
                    </p>
                    <span className="text-[9px] font-mono text-gray-400">
                      {new Date(session.lastMessage?.createdAt || Date.now()).toLocaleDateString()}
                    </span>
                  </div>
                  <button 
                    onClick={(e) => deleteSession(e, session._id)} 
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 p-1.5 transition-opacity text-xs"
                    title="Delete Chat"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* CHAT WINDOW */}
        <div className="flex-1 flex flex-col bg-white relative">
          <div className="flex-1 overflow-y-auto p-6 lg:p-10 hide-scrollbar">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <img src={logo} alt="Zeplyt" className="h-12 w-auto" />
                <h2 className="text-lg font-bold mb-1 text-gray-600 opacity-60">How can I assist your business today?</h2>
                <p className="text-gray-400 max-w-md text-sm mt-1 opacity-60">I am securely connected to your POS Database Data Warehouse. I can analyze profit margins, evaluate menu engineering, and help you find new revenue strategies based on your real history.</p>
              </div>
            )}
            
            {messages.map((msg, idx) => (
              <Message key={msg._id || idx} role={msg.role} content={msg.content} references={msg.references} fresh={msg.fresh} intent={msg.intent} />
            ))}
            
            {asking && (
              <div className="flex items-center space-x-1.5 text-blue-500 p-3 bg-blue-50 border border-blue-200 rounded-xl max-w-[160px]">
                <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce"></div>
                <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce delay-75"></div>
                <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce delay-150"></div>
                <span className="text-[10px] font-bold uppercase tracking-wider ml-1.5">Analyzing...</span>
              </div>
            )}
            <div ref={messagesEndRef} className="h-4" />
          </div>

          <div className="p-4 bg-white border-t border-gray-200">
            <form onSubmit={handleSubmit} className="max-w-5xl mx-auto relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask your CFO AI (e.g. 'What were my highest profit items last month?')..."
                disabled={asking}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 pl-4 pr-28 text-sm text-gray-700 focus:outline-none focus:border-blue-400 shadow-sm disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={asking || !input.trim()}
                className="absolute right-1.5 top-1.5 bottom-1.5 bg-blue-500 hover:bg-blue-400 text-white font-bold px-4 rounded-lg text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </form>
            <p className="text-center text-[8px] text-gray-400 uppercase tracking-wider font-bold mt-2">
              AI models can make mistakes. Always verify critical business data.
            </p>
          </div>
        </div>

      </div>

      {/* 🔒 LOCK OVERLAY (only shown when FEATURE_LOCKED === true) */}
      {FEATURE_LOCKED && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white/10 backdrop-blur-md border border-white/30 rounded-2xl p-8 text-center shadow-2xl max-w-sm w-full">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold text-white mb-2">Feature Unavailable</h2>
            <p className="text-gray-200 text-sm">
              Zeplyt AI is currently locked and not available for use.
            </p>
            <p className="text-gray-300 text-xs mt-4">Please contact your administrator for more information.</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="mt-6 bg-white/20 hover:bg-white/30 text-white font-bold py-2 px-6 rounded-lg transition-colors text-sm"
            >
              ← Go Back to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}