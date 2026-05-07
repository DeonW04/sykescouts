import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import LeaderNav from '../components/leader/LeaderNav';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, BookOpen, MessageCircle, Send, ChevronRight, ExternalLink, Loader2, X, Bot, User } from 'lucide-react';

const POR_URL = 'https://prod-cms.scouts.org.uk//media/kqdiksgz/spring-2026-por-unmarked.pdf';

const CHAPTERS = [
  { id: 'intro', title: 'Introduction', subtitle: 'Purpose and structure of POR', tags: ['overview', 'introduction'] },
  { id: 'ch1', title: 'Chapter 1 – Our Fundamentals', subtitle: 'Core principles, Purpose, Method, Promise and Law', tags: ['promise', 'law', 'fundamentals', 'values'] },
  { id: 'ch2a', title: 'Chapter 2a – Key Policies', subtitle: 'Policies applying to all members and Scout units', tags: ['policy', 'safeguarding', 'equality', 'inclusion'] },
  { id: 'ch2b', title: 'Chapter 2b – Resolving Concerns', subtitle: 'Complaints, safeguarding, bullying, harassment and whistleblowing', tags: ['complaints', 'safeguarding', 'bullying', 'harassment', 'whistleblowing'] },
  { id: 'ch2c', title: 'Chapter 2c – Our Volunteering Culture', subtitle: 'Volunteering culture and expectations', tags: ['volunteering', 'culture', 'adult'] },
  { id: 'ch2d', title: 'Chapter 2d – Citizenship', subtitle: 'Citizenship policy matters', tags: ['citizenship', 'policy'] },
  { id: 'ch2e', title: 'Chapter 2e – Names and Marks', subtitle: 'Copyright, Scout logos, names, badges and awards', tags: ['logo', 'trademark', 'copyright', 'branding'] },
  { id: 'ch3', title: 'Chapter 3 – Membership', subtitle: 'Obligations and expectations of membership', tags: ['membership', 'joining', 'young people', 'adults'] },
  { id: 'ch4a', title: 'Chapter 4a – Local Structure', subtitle: 'Section, Group, District and County structure', tags: ['structure', 'group', 'district', 'county', 'section'] },
  { id: 'ch4b', title: 'Chapter 4b – Delivery Sections', subtitle: 'Group, District and County teams and sections', tags: ['sections', 'delivery', 'squirrels', 'beavers', 'cubs', 'scouts', 'explorers'] },
  { id: 'ch5a', title: 'Chapter 5a – Charity Obligations', subtitle: 'Charity law framework for Groups, Districts, Counties', tags: ['charity', 'law', 'trustees', 'governance'] },
  { id: 'ch5b', title: 'Chapter 5b – Local Governance', subtitle: 'Governance rules for local members', tags: ['governance', 'trustee board', 'AGM', 'meetings'] },
  { id: 'ch5c', title: 'Chapter 5c – Constitutions (England/Wales/NI)', subtitle: 'Model constitutions for England, Northern Ireland, Wales and overseas', tags: ['constitution', 'england', 'wales', 'northern ireland'] },
  { id: 'ch5d', title: 'Chapter 5d – Constitutions (Scotland)', subtitle: 'Model constitutions for Scottish Groups, Districts, Regions', tags: ['constitution', 'scotland'] },
  { id: 'ch5e', title: 'Chapter 5e – Local Finance', subtitle: 'Financial management rules for local units', tags: ['finance', 'money', 'accounts', 'financial management'] },
  { id: 'ch5f', title: 'Chapter 5f – Fundraising & Grants', subtitle: 'Fundraising, grants and loans rules', tags: ['fundraising', 'grants', 'loans', 'charity'] },
  { id: 'ch5g', title: 'Chapter 5g – Insurance', subtitle: 'Insurance cover for members and units', tags: ['insurance', 'cover', 'liability'] },
  { id: 'ch6', title: 'Chapter 6 – UK Headquarters', subtitle: 'Rules governing Nations and UK HQ', tags: ['headquarters', 'HQ', 'national', 'governance'] },
  { id: 'ch7', title: 'Chapter 7 – Emergency Procedures', subtitle: 'Steps to take in emergency incidents', tags: ['emergency', 'incident', 'accident', 'safety', 'crisis'] },
  { id: 'ch9a', title: 'Chapter 9a – Activities', subtitle: 'Rules and guidance for Scout activities', tags: ['activities', 'permits', 'adventure', 'outdoor', 'activity'] },
  { id: 'ch9b', title: 'Chapter 9b – Specific Activities', subtitle: 'Requirements for specific activities', tags: ['specific activities', 'nights away', 'water', 'climbing', 'shooting'] },
  { id: 'ch10', title: 'Chapter 10 – Uniform & Badges', subtitle: 'Uniform, badges and emblems rules', tags: ['uniform', 'badges', 'dress', 'emblems'] },
  { id: 'ch11', title: 'Chapter 11 – Awards', subtitle: 'Meritorious conduct, gallantry, length of service awards', tags: ['awards', 'recognition', 'service', 'good service', 'gallantry'] },
  { id: 'ch12', title: 'Chapter 12 – Flags & Ceremonial', subtitle: 'Use of flags and conduct of ceremonies', tags: ['flags', 'ceremony', 'ceremonial', 'colours'] },
  { id: 'ch16', title: 'Chapter 16 – Adult Roles', subtitle: 'Appointment, learning, review and support of adult volunteers', tags: ['adults', 'appointment', 'training', 'DBS', 'vetting', 'roles', 'wood badge'] },
  { id: 'defs', title: 'Definitions', subtitle: 'Definitions of terms used throughout POR', tags: ['definitions', 'glossary', 'terms'] },
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

export default function PORHelper() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('browse'); // 'browse' | 'ask'
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hello! I'm your POR Assistant. Ask me anything about Scouts' Policy, Organisation and Rules — from adult appointments to activity permits, membership rules to governance. I'll find the relevant guidance for you.",
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const filteredChapters = CHAPTERS.filter(ch => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      ch.title.toLowerCase().includes(q) ||
      ch.subtitle.toLowerCase().includes(q) ||
      ch.tags.some(t => t.toLowerCase().includes(q))
    );
  });

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        model: 'claude_sonnet_4_6',
        prompt: `You are an expert on The Scout Association's Policy, Organisation and Rules (POR) document (Spring 2026 edition). The full POR document is available at: ${POR_URL}

Your job is to help Scout leaders in the UK understand and apply POR rules. You have deep knowledge of POR's content.

When answering:
- Be clear and practical — leaders need actionable answers
- Reference the specific chapter(s) and rule numbers where relevant (e.g. "Chapter 16.4" or "Rule 9a.3")
- If a question is about a grey area, acknowledge it and suggest the most reasonable interpretation
- Keep answers concise but thorough
- Use bullet points where helpful
- If you're unsure about a specific rule, say so and suggest they consult their District Commissioner or UK HQ

User question: ${userMsg}`,
      });

      setMessages(prev => [...prev, { role: 'assistant', content: result }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const askAboutChapter = (chapter) => {
    setActiveTab('ask');
    setInput(`Tell me about ${chapter.title} — what are the key rules and things I need to know?`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50">
      <LeaderNav />

      {/* Header */}
      <div className="bg-gradient-to-br from-[#004851] to-[#7413dc] text-white py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">POR Helper</h1>
              <p className="text-white/70 text-sm">Policy, Organisation and Rules — Spring 2026</p>
            </div>
          </div>
          <p className="text-white/80 mt-2 max-w-2xl">
            Browse POR chapters or ask the AI assistant any question about Scout rules, policies and procedures.
          </p>
          <a
            href={POR_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/30 rounded-lg text-sm font-medium transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Open Full POR Document (PDF)
          </a>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="flex gap-2 bg-white border border-gray-200 rounded-xl p-1 w-fit shadow-sm">
          <button
            onClick={() => setActiveTab('browse')}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'browse' ? 'bg-[#004851] text-white shadow' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Browse Chapters
          </button>
          <button
            onClick={() => setActiveTab('ask')}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'ask' ? 'bg-[#7413dc] text-white shadow' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            Ask AI Assistant
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* BROWSE TAB */}
        {activeTab === 'browse' && (
          <div>
            {/* Search */}
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search chapters, topics, keywords… (e.g. safeguarding, uniform, nights away)"
                className="pl-12 h-12 text-base shadow-sm border-gray-200"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>

            {filteredChapters.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No chapters match your search</p>
                <p className="text-sm mt-1">Try different keywords, or ask the AI assistant instead</p>
                <Button onClick={() => setActiveTab('ask')} className="mt-4 bg-[#7413dc] hover:bg-[#5c0fb0]">
                  Ask AI Assistant
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredChapters.map((ch) => (
                  <Card
                    key={ch.id}
                    className="group hover:shadow-lg transition-all duration-200 border-gray-200 cursor-pointer hover:border-[#004851]/30"
                    onClick={() => askAboutChapter(ch)}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900 group-hover:text-[#004851] transition-colors leading-tight">
                            {ch.title}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1 leading-snug">{ch.subtitle}</p>
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {ch.tags.slice(0, 4).map(tag => (
                              <span key={tag} className={`text-xs px-2 py-0.5 rounded-full font-medium ${getTagColour(tag)}`}>
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#7413dc] group-hover:translate-x-1 transition-all flex-shrink-0 mt-1" />
                      </div>
                      <p className="text-xs text-[#7413dc] font-medium mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        Click to ask AI about this chapter →
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ASK TAB */}
        {activeTab === 'ask' && (
          <div className="flex flex-col" style={{ height: 'calc(100vh - 340px)', minHeight: '500px' }}>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-lg bg-[#7413dc]/10 flex items-center justify-center flex-shrink-0 mt-1">
                      <Bot className="w-4 h-4 text-[#7413dc]" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-[#004851] text-white rounded-br-md'
                        : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md shadow-sm'
                    }`}
                  >
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
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Checking POR…
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggested questions */}
            {messages.length === 1 && (
              <div className="mb-4">
                <p className="text-xs text-gray-400 font-medium mb-2 uppercase tracking-wide">Suggested questions</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    'What are the rules around nights away permits?',
                    'What is the process to appoint a new leader?',
                    'What safeguarding checks are required for adults?',
                    'How should a complaint be handled?',
                    'What are the rules about uniform?',
                    'When does a trustee board need to meet?',
                  ].map(q => (
                    <button
                      key={q}
                      onClick={() => { setInput(q); }}
                      className="text-xs px-3 py-1.5 bg-white border border-gray-200 hover:border-[#7413dc] hover:text-[#7413dc] rounded-full transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="flex gap-2 bg-white border border-gray-200 rounded-xl p-2 shadow-sm">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about POR… e.g. 'Can a leader run a camp alone?'"
                className="flex-1 resize-none bg-transparent text-sm px-2 py-1.5 focus:outline-none placeholder:text-gray-400"
                rows={2}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="self-end bg-[#7413dc] hover:bg-[#5c0fb0] text-white rounded-lg px-4"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-gray-400 text-center mt-2">
              AI answers are based on POR knowledge. Always verify critical decisions with your DC or UK HQ. Uses more integration credits.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}