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
const START = 4, END = 18;

export default function ScoutingJourneyBar({ child }) {
  if (!child?.date_of_birth) return null;
  const age = (new Date() - new Date(child.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000);
  const pct = Math.min(100, Math.max(0, ((age - START) / (END - START)) * 100));
  const currentStage = STAGES.find(s => age >= s.from && age < s.to);

  return (
    <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7413dc] to-[#5c0fb0] flex items-center justify-center">
            <Compass className="w-5 h-5 text-white" />
          </div>
          Scouting Journey
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-4">
          {child.preferred_name || child.first_name} is <span className="font-bold">{Math.round(pct)}%</span> of the way through the scouting journey
          {currentStage ? <> — currently in <span className="font-bold" style={{ color: currentStage.color }}>{currentStage.name}</span></> : ''}.
        </p>
        <div className="relative">
          <div className="flex h-5 rounded-full overflow-hidden">
            {STAGES.map(s => (
              <div
                key={s.name}
                style={{ width: `${((s.to - s.from) / (END - START)) * 100}%`, background: s.color, opacity: age >= s.from ? 1 : 0.25 }}
              />
            ))}
          </div>
          {/* Position marker */}
          <div className="absolute -top-1.5" style={{ left: `calc(${pct}% - 8px)` }}>
            <div className="w-4 h-8 rounded-full bg-white border-4 border-gray-900 shadow-lg" />
          </div>
        </div>
        <div className="flex mt-2">
          {STAGES.map(s => (
            <div key={s.name} className="text-center" style={{ width: `${((s.to - s.from) / (END - START)) * 100}%` }}>
              <p className={`text-[10px] sm:text-xs font-semibold truncate ${currentStage?.name === s.name ? 'text-gray-900' : 'text-gray-400'}`}>{s.name}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}