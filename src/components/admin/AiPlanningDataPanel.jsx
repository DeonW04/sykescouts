import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Sparkles, Copy, Check, Loader2 } from 'lucide-react';

const SECTION_BUTTONS = [
  { name: 'beavers', label: 'Beavers', color: 'bg-blue-600 hover:bg-blue-700' },
  { name: 'cubs',    label: 'Cubs',    color: 'bg-green-600 hover:bg-green-700' },
  { name: 'scouts',  label: 'Scouts',  color: 'bg-[#7413dc] hover:bg-[#5c0fb0]' },
];

export default function AiPlanningDataPanel() {
  const [loadingSection, setLoadingSection] = useState(null);
  const [activeLabel, setActiveLabel] = useState(null);
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);

  const { data: sections = [] } = useQuery({
    queryKey: ['ai-planning-sections'],
    queryFn: () => base44.entities.Section.filter({}),
  });

  const runForSection = async (sectionName, label) => {
    const section = sections.find(s => s.name === sectionName);
    if (!section) {
      toast.error(`No "${label}" section found`);
      return;
    }
    setLoadingSection(sectionName);
    setActiveLabel(label);
    setOutput('');
    setCopied(false);
    try {
      const res = await base44.functions.invoke('getAiPlanningDataAdmin', { sectionId: section.id });
      const data = res.data;
      if (data?.error) throw new Error(data.error);
      setOutput(JSON.stringify(data, null, 2));
    } catch (err) {
      toast.error('Failed to load data: ' + err.message);
      setActiveLabel(null);
    } finally {
      setLoadingSection(null);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-pink-600" />
          AI Planning Data
        </CardTitle>
        <p className="text-sm text-gray-500">
          Pull a full data snapshot for a section to paste into your AI planning tool.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          {SECTION_BUTTONS.map(btn => (
            <Button
              key={btn.name}
              onClick={() => runForSection(btn.name, btn.label)}
              disabled={loadingSection !== null}
              className={`${btn.color} text-white`}
            >
              {loadingSection === btn.name
                ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                : <Sparkles className="w-4 h-4 mr-2" />}
              {btn.label}
            </Button>
          ))}
        </div>

        {output && (
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
              <span className="text-sm font-semibold text-gray-700">
                {activeLabel} data
              </span>
              <Button size="sm" variant="outline" onClick={handleCopy}>
                {copied
                  ? <><Check className="w-3.5 h-3.5 mr-1.5 text-green-600" />Copied</>
                  : <><Copy className="w-3.5 h-3.5 mr-1.5" />Copy all</>}
              </Button>
            </div>
            <textarea
              readOnly
              value={output}
              className="w-full h-96 p-4 text-xs font-mono text-gray-800 bg-white resize-y focus:outline-none"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}