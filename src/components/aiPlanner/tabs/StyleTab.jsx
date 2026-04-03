import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';

const PRESETS = [
  { label: '🏔️ High Adventure', values: { adventure: 85, competition: 50, outdoor: 80, badgeFocus: 40 } },
  { label: '🎨 Creative & Crafty', values: { adventure: 30, competition: 20, outdoor: 30, badgeFocus: 55 } },
  { label: '👑 Leadership Heavy', values: { adventure: 55, competition: 40, outdoor: 50, badgeFocus: 65 } },
  { label: '🏆 Patrol Competitions', values: { adventure: 65, competition: 85, outdoor: 60, badgeFocus: 45 } },
  { label: '🤝 Community Impact', values: { adventure: 35, competition: 20, outdoor: 45, badgeFocus: 60 } },
  { label: '🌿 Eco Heroes', values: { adventure: 60, competition: 30, outdoor: 80, badgeFocus: 50 } },
];

const THEMES = [
  'None', 'Survival', 'Space & Science', 'Medieval', 'Eco Heroes', 'Spies & Espionage',
  'Around the World', 'Time Travellers', 'Pirates', 'Superheroes', 'Wilderness',
  'Technology & Innovation', 'Myths & Legends', 'Sports & Athletics',
];

function Slider({ label, leftLabel, rightLabel, value, onChange, termBias }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="font-semibold text-gray-800">{label}</Label>
        {termBias && <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">🌦️ Season-adjusted</span>}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500 w-20 text-right shrink-0">{leftLabel}</span>
        <div className="relative flex-1">
          <input
            type="range"
            min={0}
            max={100}
            value={value}
            onChange={e => onChange(parseInt(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #7413dc ${value}%, #e5e7eb ${value}%)`,
            }}
          />
        </div>
        <span className="text-xs text-gray-500 w-20 shrink-0">{rightLabel}</span>
      </div>
      <div className="text-center">
        <span className="text-xs font-bold text-[#7413dc] bg-purple-50 px-2 py-0.5 rounded-full">{value}%</span>
      </div>
    </div>
  );
}

export default function StyleTab({ sliders, onSlidersChange, notes, onNotesChange, youthVoice, onYouthVoiceChange, theme, onThemeChange, term }) {
  const termMonth = term ? new Date(term.start_date).getMonth() : 0;
  const isSummer = termMonth >= 5 && termMonth <= 7;

  const applyPreset = (preset) => {
    onSlidersChange({ ...sliders, ...preset.values });
  };

  const updateSlider = (key, val) => onSlidersChange({ ...sliders, [key]: val });

  return (
    <div className="p-6 space-y-8 max-w-2xl mx-auto">
      {/* Quick Presets */}
      <div>
        <h3 className="font-bold text-gray-800 mb-3">Quick Presets</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {PRESETS.map(p => (
            <motion.button
              key={p.label}
              onClick={() => applyPreset(p)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="p-3 rounded-xl border-2 border-gray-200 bg-white hover:border-[#7413dc] hover:bg-purple-50 transition-all text-sm font-medium text-gray-700 text-left"
            >
              {p.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Sliders */}
      <div className="space-y-6">
        <h3 className="font-bold text-gray-800">Programme Personality</h3>
        <Slider
          label="Adventure ↔ Comfort"
          leftLabel="🏕️ Adventure"
          rightLabel="🛋️ Comfort"
          value={sliders.adventure}
          onChange={v => updateSlider('adventure', v)}
        />
        <Slider
          label="Competition ↔ Collaboration"
          leftLabel="🏆 Competition"
          rightLabel="🤝 Collaboration"
          value={sliders.competition}
          onChange={v => updateSlider('competition', v)}
        />
        <Slider
          label="Outdoor ↔ Indoor"
          leftLabel="🌲 Outdoor"
          rightLabel="🏠 Indoor"
          value={sliders.outdoor}
          onChange={v => updateSlider('outdoor', v)}
          termBias={true}
        />
        {isSummer && <p className="text-xs text-blue-600 -mt-4 ml-1">☀️ AI will bias outdoor for this summer term</p>}
        <Slider
          label="Badge-Focused ↔ Pure Fun"
          leftLabel="🏅 Badge focus"
          rightLabel="🎉 Pure fun"
          value={sliders.badgeFocus}
          onChange={v => updateSlider('badgeFocus', v)}
        />
      </div>

      {/* Theme */}
      <div>
        <Label className="font-bold text-gray-800 block mb-2">Term Theme (optional)</Label>
        <select
          value={theme || 'None'}
          onChange={e => onThemeChange(e.target.value === 'None' ? '' : e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:ring-2 focus:ring-[#7413dc] focus:outline-none"
        >
          {THEMES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Notes */}
      <div>
        <Label className="font-bold text-gray-800 block mb-2">Describe what you want...</Label>
        <Textarea
          placeholder="e.g. 'We want to do a big camp at the end of term. Avoid anything too expensive. The Scouts love fire and outdoor cooking. Mix in some community service.'"
          value={notes}
          onChange={e => onNotesChange(e.target.value)}
          className="min-h-28 resize-none"
        />
      </div>

      {/* Youth Voice */}
      <div>
        <Label className="font-bold text-gray-800 block mb-1">🗣️ Youth Voice</Label>
        <p className="text-xs text-gray-500 mb-2">Paste in patrol survey results or what Scouts have asked for</p>
        <Textarea
          placeholder="e.g. 'Scouts voted for more outdoor nights, cooking challenges, and at least one night hike this term'"
          value={youthVoice}
          onChange={e => onYouthVoiceChange(e.target.value)}
          className="min-h-20 resize-none"
        />
      </div>
    </div>
  );
}