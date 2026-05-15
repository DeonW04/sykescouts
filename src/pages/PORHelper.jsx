import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import FloatingNav from '../components/public/FloatingNav';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Search, BookOpen, MessageCircle, Send, ChevronRight, ChevronDown,
  ExternalLink, Loader2, X, Bot, User, ArrowLeft, AlertCircle
} from 'lucide-react';

const POR_URL = 'https://prod-cms.scouts.org.uk//media/kqdiksgz/spring-2026-por-unmarked.pdf';

const CHAPTERS = [
  { id: 'intro', title: 'Introduction', subtitle: 'Purpose and structure of POR', tags: ['overview', 'introduction', 'purpose', 'scope'] },
  { id: 'ch1', title: 'Chapter 1', subtitle: 'Our Fundamentals — Purpose, Method, Promise and Law', tags: ['promise', 'law', 'fundamentals', 'values', 'scout method'] },
  { id: 'ch2a', title: 'Chapter 2a', subtitle: 'Key Policies', tags: ['policy', 'safeguarding', 'equality', 'inclusion', 'key policies'] },
  { id: 'ch2b', title: 'Chapter 2b', subtitle: 'Resolving Concerns', tags: ['complaints', 'safeguarding', 'bullying', 'harassment', 'whistleblowing', 'concerns'] },
  { id: 'ch2c', title: 'Chapter 2c', subtitle: 'Our Volunteering Culture', tags: ['volunteering', 'culture', 'adult', 'volunteer'] },
  { id: 'ch2d', title: 'Chapter 2d', subtitle: 'Citizenship', tags: ['citizenship', 'policy'] },
  { id: 'ch2e', title: 'Chapter 2e', subtitle: "Use of the Scouts' Name and Marks", tags: ['logo', 'trademark', 'copyright', 'branding', 'name', 'marks'] },
  { id: 'ch3', title: 'Chapter 3', subtitle: 'Membership', tags: ['membership', 'joining', 'young people', 'adults', 'members'] },
  { id: 'ch4a', title: 'Chapter 4a', subtitle: 'Structure of Local Scouting', tags: ['structure', 'group', 'district', 'county', 'section', 'local'] },
  { id: 'ch4b', title: 'Chapter 4b', subtitle: 'Our Delivery Sections', tags: ['sections', 'delivery', 'squirrels', 'beavers', 'cubs', 'scouts', 'explorers'] },
  { id: 'ch5a', title: 'Chapter 5a', subtitle: 'Charity Obligations — Groups, Districts, Counties', tags: ['charity', 'law', 'trustees', 'governance', 'charity law'] },
  { id: 'ch5b', title: 'Chapter 5b', subtitle: 'Local Governance', tags: ['governance', 'trustee board', 'AGM', 'meetings', 'local governance'] },
  { id: 'ch5c', title: 'Chapter 5c', subtitle: 'Constitutions (England, Wales, NI)', tags: ['constitution', 'england', 'wales', 'northern ireland', 'model constitution'] },
  { id: 'ch5d', title: 'Chapter 5d', subtitle: 'Constitutions (Scotland)', tags: ['constitution', 'scotland', 'scottish'] },
  { id: 'ch5e', title: 'Chapter 5e', subtitle: 'Local Finance', tags: ['finance', 'money', 'accounts', 'financial management', 'treasurer'] },
  { id: 'ch5f', title: 'Chapter 5f', subtitle: 'Fundraising, Grants and Loans', tags: ['fundraising', 'grants', 'loans', 'charity', 'fund'] },
  { id: 'ch5g', title: 'Chapter 5g', subtitle: 'Insurance', tags: ['insurance', 'cover', 'liability', 'public liability'] },
  { id: 'ch6', title: 'Chapter 6', subtitle: 'UK Headquarters Structure', tags: ['headquarters', 'HQ', 'national', 'governance', 'UK HQ'] },
  { id: 'ch7', title: 'Chapter 7', subtitle: 'Emergency Procedures', tags: ['emergency', 'incident', 'accident', 'safety', 'crisis', 'emergency procedures'] },
  { id: 'ch9a', title: 'Chapter 9a', subtitle: 'Activities', tags: ['activities', 'permits', 'adventure', 'outdoor', 'activity', 'adventurous'] },
  { id: 'ch9b', title: 'Chapter 9b', subtitle: 'Requirements for Specific Activities', tags: ['specific activities', 'nights away', 'water', 'climbing', 'shooting', 'specific'] },
  { id: 'ch10', title: 'Chapter 10', subtitle: 'Uniform, Badges and Emblems', tags: ['uniform', 'badges', 'dress', 'emblems', 'insignia'] },
  { id: 'ch11', title: 'Chapter 11', subtitle: 'Awards and Recognition of Service', tags: ['awards', 'recognition', 'service', 'good service', 'gallantry', 'meritorious'] },
  { id: 'ch12', title: 'Chapter 12', subtitle: 'Flags and Ceremonial', tags: ['flags', 'ceremony', 'ceremonial', 'colours', 'parade'] },
  { id: 'ch16', title: 'Chapter 16', subtitle: 'Adult Roles — Appointments, Training, Vetting', tags: ['adults', 'appointment', 'training', 'DBS', 'vetting', 'roles', 'wood badge', 'leader'] },
  { id: 'defs', title: 'Definitions', subtitle: 'Glossary of terms used throughout POR', tags: ['definitions', 'glossary', 'terms', 'meaning'] },
];

const TAG_COLOURS = [
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
  'bg-green-100 text-green-700',
  'bg-orange-100 text-orange-700',
  'bg-teal-100 text-teal-700',
];

function getTagColour(tag) {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  return TAG_COLOURS[Math.abs(hash) % TAG_COLOURS.length];
}

function highlight(text, query) {
  if (!query || !text) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <mark key={i} className="bg-yellow-200 text-yellow-900 rounded px-0.5">{part}</mark>
      : part
  );
}

function SectionDropdown({ section, searchQuery }) {
  const [open, setOpen] = useState(false);

  const hasSubsections = section.subsections && section.subsections.length > 0;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors text-left gap-3"
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="text-xs font-bold text-[#7413dc] bg-purple-50 border border-purple-200 rounded px-2 py-1 flex-shrink-0 mt-0.5 font-mono">
            {section.number}
          </span>
          <span className="font-semibold text-gray-900 text-sm leading-snug">
            {searchQuery ? highlight(section.title, searchQuery) : section.title}
          </span>
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
      </button>

      {open && (
        <div className="px-4 pb-4 pt-2 bg-gray-50 border-t border-gray-200 space-y-3">
          {section.content && (
            <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {searchQuery ? highlight(section.content, searchQuery) : section.content}
            </div>
          )}
          {hasSubsections && (
            <div className="space-y-2 mt-3">
              {section.subsections.map((sub, si) => (
                <SubsectionDropdown key={si} sub={sub} searchQuery={searchQuery} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SubsectionDropdown({ sub, searchQuery }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 transition-colors text-left gap-3"
      >
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <span className="text-xs font-bold text-[#004851] bg-teal-50 border border-teal-200 rounded px-1.5 py-0.5 flex-shrink-0 mt-0.5 font-mono">
            {sub.number}
          </span>
          <span className="text-sm text-gray-800 font-medium leading-snug">
            {searchQuery ? highlight(sub.title, searchQuery) : sub.title}
          </span>
        </div>
        {open ? <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
      </button>
      {open && sub.content && (
        <div className="px-3 pb-3 pt-1 border-t border-gray-100">
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {searchQuery ? highlight(sub.content, searchQuery) : sub.content}
          </p>
        </div>
      )}
    </div>
  );
}

export default function PORHelper() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('browse');
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [chapterData, setChapterData] = useState(null);
  const [chapterLoading, setChapterLoading] = useState(false);
  const [chapterError, setChapterError] = useState(null);

  // Full-text search state
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [lastSearched, setLastSearched] = useState('');
  const searchTimeout = useRef(null);

  // AI chat
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hello! I'm your POR Assistant. Ask me anything about Scouts' Policy, Organisation and Rules — from adult appointments to activity permits, membership rules to governance." },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Full-text search across POR via AI
  const doSearch = async (query) => {
    if (!query || query.trim().length < 3) {
      setSearchResults(null);
      return;
    }
    setSearchLoading(true);
    setLastSearched(query);
    try {
      const res = await base44.functions.invoke('getPORChapter', { searchQuery: query });
      setSearchResults(res.data?.data?.results || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearchChange = (val) => {
    setSearch(val);
    if (selectedChapter) return; // don't do global search while in chapter view
    clearTimeout(searchTimeout.current);
    if (val.trim().length >= 3) {
      searchTimeout.current = setTimeout(() => doSearch(val), 800);
    } else {
      setSearchResults(null);
    }
  };

  const loadChapter = async (chapter) => {
    setSelectedChapter(chapter);
    setChapterData(null);
    setChapterError(null);
    setChapterLoading(true);
    try {
      const res = await base44.functions.invoke('getPORChapter', { chapterId: chapter.id });
      if (res.data?.success) {
        setChapterData(res.data.data);
      } else {
        setChapterError('Failed to load chapter content.');
      }
    } catch (e) {
      setChapterError('Failed to load chapter content: ' + e.message);
    } finally {
      setChapterLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        model: 'claude_sonnet_4_6',
        prompt: `You are an expert on The Scout Association's Policy, Organisation and Rules (POR) document (Spring 2026 edition). The full POR document is at: ${POR_URL}

Your job is to help Scout leaders in the UK understand and apply POR rules. When answering:
- Be clear and practical — leaders need actionable answers
- Reference the specific chapter(s) and rule numbers (e.g. "Chapter 16.4" or "Rule 9a.3")
- If a question is about a grey area, acknowledge it and suggest the most reasonable interpretation
- Keep answers concise but thorough; use bullet points where helpful
- If unsure about a specific rule, say so and suggest consulting their District Commissioner or UK HQ

User question: ${userMsg}`,
      });
      setMessages(prev => [...prev, { role: 'assistant', content: result }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // Filter chapters by search (local filter for chapter cards)
  const filteredChapters = CHAPTERS.filter(ch => {
    if (searchResults) return true; // show all when we have AI search results
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return ch.title.toLowerCase().includes(q) || ch.subtitle.toLowerCase().includes(q) || ch.tags.some(t => t.includes(q));
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50">
      <FloatingNav />

      {/* Header */}
      <div className="bg-gradient-to-br from-[#004851] to-[#7413dc] text-white py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">POR Helper</h1>
              <p className="text-white/70 text-sm">Policy, Organisation and Rules — Spring 2026</p>
            </div>
          </div>
          <p className="text-white/80 mt-2 max-w-2xl text-sm">
            Browse and read every chapter of POR, search the full document, or ask the AI assistant any question.
          </p>
          <a href={POR_URL} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/30 rounded-lg text-sm font-medium transition-colors">
            <ExternalLink className="w-4 h-4" />
            Open Full PDF Document
          </a>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="flex gap-2 bg-white border border-gray-200 rounded-xl p-1 w-fit shadow-sm">
          <button onClick={() => { setActiveTab('browse'); setSelectedChapter(null); setSearch(''); setSearchResults(null); }}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'browse' ? 'bg-[#004851] text-white shadow' : 'text-gray-600 hover:text-gray-900'}`}>
            <BookOpen className="w-4 h-4" />Browse & Read
          </button>
          <button onClick={() => setActiveTab('ask')}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'ask' ? 'bg-[#7413dc] text-white shadow' : 'text-gray-600 hover:text-gray-900'}`}>
            <MessageCircle className="w-4 h-4" />Ask AI Assistant
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* BROWSE TAB */}
        {activeTab === 'browse' && (
          <div>
            {/* Chapter detail view */}
            {selectedChapter ? (
              <div>
                <button onClick={() => { setSelectedChapter(null); setChapterData(null); setSearch(''); }}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4 group">
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  Back to chapters
                </button>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedChapter.title}</h2>
                    <p className="text-gray-500 text-sm mt-0.5">{selectedChapter.subtitle}</p>
                  </div>
                  <div className="relative flex-shrink-0 w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                      placeholder="Search within this chapter…"
                      className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300" />
                    {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-3.5 h-3.5 text-gray-400" /></button>}
                  </div>
                </div>

                {chapterLoading && (
                  <div className="flex flex-col items-center justify-center py-24">
                    <Loader2 className="w-10 h-10 animate-spin text-[#7413dc] mb-4" />
                    <p className="text-gray-600 font-medium">Loading chapter from POR…</p>
                    <p className="text-gray-400 text-sm mt-1">This may take up to 30 seconds</p>
                  </div>
                )}

                {chapterError && (
                  <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm">{chapterError}</p>
                  </div>
                )}

                {chapterData && !chapterLoading && (
                  <div>
                    {chapterData.chapterIntro && (
                      <div className="mb-5 p-4 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-900 leading-relaxed">
                        {chapterData.chapterIntro}
                      </div>
                    )}
                    <div className="space-y-2">
                      {(chapterData.sections || [])
                        .filter(s => {
                          if (!search.trim()) return true;
                          const q = search.toLowerCase();
                          return s.title?.toLowerCase().includes(q) ||
                            s.content?.toLowerCase().includes(q) ||
                            s.number?.toLowerCase().includes(q) ||
                            s.subsections?.some(sub => sub.title?.toLowerCase().includes(q) || sub.content?.toLowerCase().includes(q));
                        })
                        .map((section, i) => (
                          <SectionDropdown key={i} section={section} searchQuery={search} />
                        ))}
                    </div>
                    {chapterData.sections?.length === 0 && (
                      <p className="text-center text-gray-400 py-12">No sections found in this chapter.</p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Chapter list / search view */
              <div>
                <div className="relative mb-4">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input value={search} onChange={e => handleSearchChange(e.target.value)}
                    placeholder="Search the full POR document… (e.g. nights away, uniform, DBS)"
                    className="pl-12 h-12 text-base shadow-sm border-gray-200" />
                  {search && <button onClick={() => { setSearch(''); setSearchResults(null); }} className="absolute right-4 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-gray-400 hover:text-gray-600" /></button>}
                </div>

                {/* Full-text AI search results */}
                {search.trim().length >= 3 && (
                  <div className="mb-6">
                    {searchLoading && (
                      <div className="flex items-center gap-3 text-sm text-gray-500 py-3">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Searching the full POR document…
                      </div>
                    )}
                    {searchResults && !searchLoading && (
                      <div className="mb-6">
                        <p className="text-sm font-semibold text-gray-700 mb-3">
                          {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found in POR for "{lastSearched}"
                        </p>
                        <div className="space-y-3">
                          {searchResults.map((r, i) => (
                            <Card key={i} className="border-yellow-200 bg-yellow-50/50">
                              <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                  <span className="text-xs font-bold text-[#7413dc] bg-purple-100 rounded px-2 py-1 font-mono flex-shrink-0 mt-0.5">{r.section}</span>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm text-gray-900">{r.chapter} — {r.sectionTitle}</p>
                                    <p className="text-sm text-gray-700 mt-1 leading-relaxed">{highlight(r.excerpt, search)}</p>
                                    {r.context && <p className="text-xs text-gray-400 mt-1 italic">{r.context}</p>}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                          {searchResults.length === 0 && (
                            <p className="text-sm text-gray-500 py-4 text-center">No results found. Try different keywords or ask the AI assistant.</p>
                          )}
                        </div>
                        <div className="border-t border-gray-200 mt-6 pt-4">
                          <p className="text-sm font-semibold text-gray-700 mb-3">Or browse chapters directly:</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Chapter grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredChapters.map((ch) => (
                    <Card key={ch.id}
                      className="group hover:shadow-lg transition-all duration-200 border-gray-200 cursor-pointer hover:border-[#004851]/30"
                      onClick={() => loadChapter(ch)}>
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-900 group-hover:text-[#004851] transition-colors">{ch.title}</h3>
                            <p className="text-sm text-gray-500 mt-1 leading-snug">{ch.subtitle}</p>
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {ch.tags.slice(0, 4).map(tag => (
                                <span key={tag} className={`text-xs px-2 py-0.5 rounded-full font-medium ${getTagColour(tag)}`}>{tag}</span>
                              ))}
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#7413dc] group-hover:translate-x-1 transition-all flex-shrink-0 mt-1" />
                        </div>
                        <p className="text-xs text-[#7413dc] font-medium mt-3 opacity-0 group-hover:opacity-100 transition-opacity">Click to read this chapter →</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ASK TAB */}
        {activeTab === 'ask' && (
          <div className="flex flex-col" style={{ height: 'calc(100vh - 340px)', minHeight: '500px' }}>
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-lg bg-[#7413dc]/10 flex items-center justify-center flex-shrink-0 mt-1">
                      <Bot className="w-4 h-4 text-[#7413dc]" />
                    </div>
                  )}
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user' ? 'bg-[#004851] text-white rounded-br-md' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md shadow-sm'
                  }`}>
                    {msg.content}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-lg bg-[#004851]/10 flex items-center justify-center flex-shrink-0 mt-1">
                      <User className="w-4 h-4 text-[#004851]" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-lg bg-[#7413dc]/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-[#7413dc]" />
                  </div>
                  <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm flex items-center gap-2 text-gray-500 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />Checking POR…
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {messages.length === 1 && (
              <div className="mb-4">
                <p className="text-xs text-gray-400 font-medium mb-2 uppercase tracking-wide">Suggested questions</p>
                <div className="flex flex-wrap gap-2">
                  {['What are the rules around nights away permits?', 'How do I appoint a new leader?', 'What safeguarding checks are required?', 'How should a complaint be handled?', 'What are the rules about uniform?', 'When does a trustee board need to meet?'].map(q => (
                    <button key={q} onClick={() => setInput(q)}
                      className="text-xs px-3 py-1.5 bg-white border border-gray-200 hover:border-[#7413dc] hover:text-[#7413dc] rounded-full transition-colors">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 bg-white border border-gray-200 rounded-xl p-2 shadow-sm">
              <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
                placeholder="Ask anything about POR… e.g. 'Can a leader run a camp alone?'"
                className="flex-1 resize-none bg-transparent text-sm px-2 py-1.5 focus:outline-none placeholder:text-gray-400" rows={2} />
              <Button onClick={handleSend} disabled={!input.trim() || isLoading}
                className="self-end bg-[#7413dc] hover:bg-[#5c0fb0] text-white rounded-lg px-4">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-gray-400 text-center mt-2">AI answers are based on POR knowledge. Always verify critical decisions with your DC or UK HQ. Uses more integration credits.</p>
          </div>
        )}
      </div>
    </div>
  );
}