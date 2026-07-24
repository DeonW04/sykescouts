import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Award, CheckCircle, Moon, Footprints, Star } from 'lucide-react';

const ICONS = { nights: Moon, hikes: Footprints, joining: Star };
const COLORS = { nights: 'from-indigo-500 to-blue-500', hikes: 'from-emerald-500 to-green-500', joining: 'from-purple-500 to-fuchsia-500' };

export default function TestActivityAwards({ groups }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {groups.map(({ key, label, highest, statText }) => {
        const Icon = ICONS[key];
        return (
          <Card key={key} className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
            <CardContent className="p-5 text-center">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${COLORS[key]} flex items-center justify-center mx-auto mb-3`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 mb-3">{label}</h3>
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