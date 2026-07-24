import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Award, CheckCircle, Moon, Footprints, Star } from 'lucide-react';

const ICONS = { nights: Moon, hikes: Footprints, joining: Star };
const COLORS = { nights: '#3b82f6', hikes: '#22c55e', joining: '#a855f7' };

export default function ActivityAwardsRow({ groups }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {groups.map(({ key, label, highest, statText }) => {
        const Icon = ICONS[key];
        const accent = COLORS[key];
        return (
          <Card key={key} className="border border-[#7413dc]/10 shadow-[0_4px_20px_rgba(0,0,0,0.05)] bg-white/90 backdrop-blur-xl rounded-[20px]">
            <CardContent className="p-5 text-center">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: `${accent}18` }}>
                <Icon className="w-5 h-5" style={{ color: accent }} />
              </div>
              <h3 className="font-bold mb-3" style={{ fontFamily: 'Outfit, sans-serif', color: '#1a1a2e' }}>{label}</h3>
              {highest ? (
                <div className="space-y-2">
                  <img src={highest.image_url} alt={highest.name} className="w-20 h-20 mx-auto object-contain" />
                  <p className="text-xs font-semibold text-gray-700 leading-tight">{highest.name}</p>
                  <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium">
                    <CheckCircle className="w-3 h-3" /> Highest earned
                  </span>
                </div>
              ) : (
                <div className="py-3">
                  <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Award className="w-7 h-7 text-gray-300" />
                  </div>
                  <p className="text-xs text-gray-400">Not earned yet</p>
                </div>
              )}
              {statText && <p className="text-xs text-gray-500 mt-2 font-medium">{statText}</p>}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}