import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const PRESET_DATES = (year) => [
  { date: `${year}-01-01`, label: "New Year's Day", action: 'avoid' },
  { date: `${year}-01-25`, label: "Burns Night", action: 'theme' },
  { date: `${year}-02-14`, label: "Valentine's Day", action: 'theme' },
  { date: `${year}-03-01`, label: "St David's Day", action: 'theme' },
  { date: `${year}-03-17`, label: "St Patrick's Day", action: 'theme' },
  { date: `${year}-04-22`, label: "Earth Day", action: 'theme' },
  { date: `${year}-04-23`, label: "St George's Day / Scout Sunday", action: 'theme' },
  { date: `${year}-05-05`, label: "VE Day", action: 'theme' },
  { date: `${year}-10-31`, label: "Halloween", action: 'theme' },
  { date: `${year}-11-05`, label: "Bonfire Night", action: 'theme' },
  { date: `${year}-11-11`, label: "Remembrance Day", action: 'theme' },
  { date: `${year}-12-25`, label: "Christmas Day", action: 'avoid' },
];

export default function NotableDatesTab({ term, notableDates, onChange }) {
  const [newLabel, setNewLabel] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newAction, setNewAction] = useState('theme');

  const termYear = term ? new Date(term.start_date).getFullYear() : new Date().getFullYear();
  const presets = PRESET_DATES(termYear);

  const relevantPresets = presets.filter(p => {
    if (!term) return true;
    const d = new Date(p.date);
    return d >= new Date(term.start_date) && d <= new Date(term.end_date);
  });

  const isAdded = (dateStr) => notableDates.some(d => d.date === dateStr);

  const addPreset = (preset) => {
    if (!isAdded(preset.date)) {
      onChange([...notableDates, { ...preset, isPreset: true }]);
    }
  };

  const addCustom = () => {
    if (!newDate || !newLabel) return;
    onChange([...notableDates, { date: newDate, label: newLabel, action: newAction, isCustom: true }]);
    setNewDate('');
    setNewLabel('');
  };

  const toggleAction = (dateStr) => {
    onChange(notableDates.map(d =>
      d.date === dateStr ? { ...d, action: d.action === 'theme' ? 'avoid' : 'theme' } : d
    ));
  };

  const remove = (dateStr) => onChange(notableDates.filter(d => d.date !== dateStr));

  return (
    <div className="p-6 space-y-6">
      {relevantPresets.length > 0 && (
        <div>
          <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#7413dc]" />
            Dates during this term
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {relevantPresets.map((preset) => {
              const added = isAdded(preset.date);
              return (
                <motion.button
                  key={preset.date}
                  onClick={() => added ? remove(preset.date) : addPreset(preset)}
                  whileHover={{ scale: 1.01 }}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                    added ? 'border-[#7413dc] bg-purple-50' : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <span className="text-xl">{preset.action === 'theme' ? '🎨' : '⛔'}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-gray-900">{preset.label}</p>
                    <p className="text-xs text-gray-500">{new Date(preset.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}</p>
                  </div>
                  {added && <div className="w-5 h-5 bg-[#7413dc] rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>}
                </motion.button>
              );
            })}
          </div>
          {relevantPresets.length === 0 && (
            <p className="text-sm text-gray-500 italic">No preset dates fall within this term.</p>
          )}
        </div>
      )}

      {relevantPresets.length === 0 && !term && (
        <p className="text-sm text-gray-500 italic">No term selected.</p>
      )}

      {/* Custom date */}
      <div>
        <h3 className="font-bold text-gray-800 mb-3">Add Custom Date</h3>
        <div className="flex gap-2 flex-wrap">
          <Input
            type="date"
            value={newDate}
            onChange={e => setNewDate(e.target.value)}
            min={term?.start_date}
            max={term?.end_date}
            className="w-44"
          />
          <Input
            placeholder="e.g. Group Anniversary"
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            className="flex-1 min-w-36"
          />
          <select
            value={newAction}
            onChange={e => setNewAction(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="theme">🎨 Theme around</option>
            <option value="avoid">⛔ Avoid</option>
          </select>
          <Button onClick={addCustom} disabled={!newDate || !newLabel} className="bg-[#7413dc] hover:bg-[#5c0fb0] gap-1">
            <Plus className="w-4 h-4" /> Add
          </Button>
        </div>
      </div>

      {/* Selected dates */}
      {notableDates.length > 0 && (
        <div>
          <h3 className="font-bold text-gray-800 mb-3">Selected Notable Dates ({notableDates.length})</h3>
          <div className="space-y-2">
            <AnimatePresence>
              {notableDates.map((d) => (
                <motion.div
                  key={d.date}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200 shadow-sm"
                >
                  <span className="text-xl">{d.action === 'theme' ? '🎨' : '⛔'}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-gray-900">{d.label}</p>
                    <p className="text-xs text-gray-500">{new Date(d.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' })}</p>
                  </div>
                  <button
                    onClick={() => toggleAction(d.date)}
                    className={`text-xs px-2 py-1 rounded-full font-medium transition-colors ${
                      d.action === 'theme'
                        ? 'bg-purple-100 text-purple-700 hover:bg-red-100 hover:text-red-700'
                        : 'bg-red-100 text-red-700 hover:bg-purple-100 hover:text-purple-700'
                    }`}
                  >
                    {d.action === 'theme' ? 'Theme around' : 'Avoid'} ↔
                  </button>
                  <button onClick={() => remove(d.date)} className="text-gray-400 hover:text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}