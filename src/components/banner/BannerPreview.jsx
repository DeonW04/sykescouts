import React from 'react';
import { Users } from 'lucide-react';

export default function BannerPreview({ imageUrl, position, memberName, sectionLabel }) {
  return (
    <div className="relative h-48 rounded-xl overflow-hidden text-white">
      {imageUrl ? (
        <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: position || '50% 50%' }} />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#7413dc] via-[#8b32eb] to-[#5c0fb0]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/40 to-black/20" />
      <div className="relative h-full flex flex-col justify-end p-4">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/15 backdrop-blur-sm rounded-full border border-white/25 w-fit text-[10px] font-semibold mb-2">
          <Users className="w-3 h-3" /> Parent Portal
        </span>
        <p className="text-lg font-bold drop-shadow">Welcome back!</p>
        {memberName && <p className="text-xs text-white/85">{memberName}{sectionLabel ? ` · ${sectionLabel}` : ''}</p>}
      </div>
    </div>
  );
}