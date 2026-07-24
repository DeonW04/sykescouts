import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Layers, Award } from 'lucide-react';

function BadgeTile({ image, name, sub }) {
  return (
    <div className="flex flex-col items-center text-center w-20" title={name}>
      <div className="w-16 h-16 rounded-xl bg-white border border-gray-100 shadow-sm p-1.5 hover:scale-110 transition-transform">
        <img src={image} alt={name} className="w-full h-full object-contain" />
      </div>
      <p className="text-[10px] font-semibold text-gray-700 leading-tight mt-1.5 line-clamp-2">{name}</p>
      {sub && <p className="text-[9px] text-gray-400">{sub}</p>}
    </div>
  );
}

export default function EarnedPanel({ earnedChallenge, earnedStaged }) {
  return (
    <Card className="border border-[#7413dc]/10 shadow-[0_4px_20px_rgba(0,0,0,0.05)] bg-white/90 backdrop-blur-xl rounded-[20px] h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg" style={{ fontFamily: 'Outfit, sans-serif', color: '#1a1a2e' }}>
          <div className="w-9 h-9 rounded-xl bg-green-500/10 flex items-center justify-center">
            <Award className="w-5 h-5 text-green-600" />
          </div>
          Earned Badges
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-4 h-4 text-amber-600" />
            <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide">Challenge Badges</h3>
            <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{earnedChallenge.length}</span>
          </div>
          {earnedChallenge.length === 0 ? (
            <p className="text-sm text-gray-400">No challenge badges earned yet — keep going!</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {earnedChallenge.map(b => <BadgeTile key={b.id} image={b.image_url} name={b.name} />)}
            </div>
          )}
        </div>
        <div className="border-t pt-5">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide">Staged Badges</h3>
            <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{earnedStaged.length}</span>
          </div>
          {earnedStaged.length === 0 ? (
            <p className="text-sm text-gray-400">No staged badges earned yet.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {earnedStaged.map(({ family, highest }) => (
                <BadgeTile key={family.familyId} image={highest.image_url} name={family.name} sub={`Stage ${highest.stage_number}`} />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}