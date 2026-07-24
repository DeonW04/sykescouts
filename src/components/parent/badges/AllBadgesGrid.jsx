import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Award, CheckCircle, Filter } from 'lucide-react';

const CATEGORY_ORDER = ['challenge', 'staged', 'core', 'activity'];

export default function AllBadgesGrid({ items }) {
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = items
    .filter(i => statusFilter === 'all' || i.status === statusFilter)
    .sort((a, b) => {
      const cat = CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
      if (cat !== 0) return cat;
      return b.percentage - a.percentage || a.name.localeCompare(b.name);
    });

  return (
    <Card className="border border-[#7413dc]/10 shadow-[0_4px_20px_rgba(0,0,0,0.05)] bg-white/90 backdrop-blur-xl rounded-[20px]">
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3 pb-3">
        <CardTitle className="flex items-center gap-2 text-lg" style={{ fontFamily: 'Outfit, sans-serif', color: '#1a1a2e' }}>
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <Award className="w-5 h-5 text-[#7413dc]" />
          </div>
          All Badges
        </CardTitle>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="not_started">Not Started</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No badges match this filter.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filtered.map(item => (
              <div key={item.key} className="flex flex-col items-center text-center p-3 rounded-xl border border-gray-100 bg-white hover:shadow-md transition-shadow">
                <div className="relative">
                  <img
                    src={item.image}
                    alt={item.name}
                    className={`w-16 h-16 object-contain ${item.status === 'not_started' ? 'opacity-45 grayscale' : ''}`}
                  />
                  {item.status === 'completed' && (
                    <div className="absolute -top-1 -right-1 bg-green-600 rounded-full p-0.5">
                      <CheckCircle className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                </div>
                <p className="text-xs font-semibold text-gray-800 leading-tight mt-2 line-clamp-2 min-h-[2rem]">{item.name}</p>
                <p className="text-[9px] uppercase tracking-wide text-gray-400 font-bold">{item.category}{item.stageCount ? ` · ${item.stageCount} stages` : ''}</p>
                <div className="w-full mt-2">
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${item.status === 'completed' ? 'bg-green-500' : 'bg-orange-400'}`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                  <p className={`text-[10px] font-medium mt-1 ${item.status === 'completed' ? 'text-green-600' : item.status === 'in_progress' ? 'text-orange-500' : 'text-gray-400'}`}>
                    {item.status === 'completed' ? 'Completed' : `${item.percentage}%`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}