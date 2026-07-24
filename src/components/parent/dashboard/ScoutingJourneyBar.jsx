import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Compass } from 'lucide-react';

const STAGES = [
  { name: 'Squirrels', from: 4, to: 6, color: '#e22e12' },
  { name: 'Beavers', from: 6, to: 8, color: '#006ddf' },
  { name: 'Cubs', from: 8, to: 10.5, color: '#23a950' },
  { name: 'Scouts', from: 10.5, to: 14, color: '#004851' },
  { name: 'Explorers', from: 14, to: 18, color: '#003982' },
];

export default function ScoutingJourneyBar({ child }) {
  if (!child?.date_of_birth) return null;
  const age = (new Date() - new Date(child.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000);
  const stageIdx = STAGES.findIndex(s => age >= s.from && age < s.to);
  if (stageIdx === -1) return null;
  const stage = STAGES[stageIdx];
  const nextStage = STAGES[stageIdx + 1];
  const pct = Math.min(100, Math.max(0, ((age - stage.from) / (stage.to - stage.from)) * 100));

  const name = child.preferred_name || child.first_name;
  const monthsLeft = Math.max(0, Math.round((stage.to - age) * 12));
  const years = Math.floor(monthsLeft / 12);
  const months = monthsLeft % 12;
  const parts = [];
  if (years > 0) parts.push(`${years} year${years !== 1 ? 's' : ''}`);
  if (months > 0 || years === 0) parts.push(`${months} month${months !== 1 ? 's' : ''}`);
  const timeText = parts.join(' and ');

  return (
    <Card className="border border-[#7413dc]/10 bg-white/90 backdrop-blur-xl rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg" style={{ fontFamily: 'Outfit, sans-serif', color: '#1a1a2e' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${stage.color}18` }}>
            <Compass className="w-5 h-5" style={{ color: stage.color }} />
          </div>
          {stage.name} Journey
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-4">
          {nextStage
            ? <>{timeText} until <span className="font-bold">{name}</span> moves up to <span className="font-bold" style={{ color: nextStage.color }}>{nextStage.name}</span>.</>
            : <>{timeText} left for <span className="font-bold">{name}</span> in <span className="font-bold" style={{ color: stage.color }}>{stage.name}</span>.</>}
        </p>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: stage.color }} />
          </div>
          <span className="text-sm font-bold whitespace-nowrap" style={{ color: stage.color }}>{Math.round(pct)}%</span>
        </div>
        <div className="flex justify-between mt-1.5">
          <p className="text-[11px] text-gray-400 font-medium">Joined {stage.name} age {stage.from}</p>
          <p className="text-[11px] text-gray-400 font-medium">{nextStage ? `Moves to ${nextStage.name} age ${stage.to}` : `Finishes age ${stage.to}`}</p>
        </div>
      </CardContent>
    </Card>
  );
}