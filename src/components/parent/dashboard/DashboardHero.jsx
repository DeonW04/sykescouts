import React from 'react';
import { Users, ImagePlus } from 'lucide-react';
import { childInitials, childColor } from '@/hooks/useSelectedChild';

const SECTION_COLORS = {
  squirrels: '#e22e12', beavers: '#006ddf', cubs: '#23a950',
  scouts: '#004851', explorers: '#003982',
};

export default function DashboardHero({ user, children, selectedChild, onSelectChild, heroImage, heroPosition, sectionName, sectionDisplayName, onChangeImage }) {
  const accent = SECTION_COLORS[sectionName] || '#7413dc';

  return (
    <div className="relative overflow-hidden text-white" style={{ minHeight: 320 }}>
      {/* Background: configurable section image, falls back to brand gradient */}
      {heroImage ? (
        <img src={heroImage} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: heroPosition || '50% 50%' }} />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#7413dc] via-[#8b32eb] to-[#5c0fb0]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/40 to-black/20" />
      {onChangeImage && (
        <button
          onClick={onChangeImage}
          className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-3 py-1.5 bg-black/30 hover:bg-black/50 backdrop-blur-sm border border-white/30 rounded-full text-xs font-semibold text-white transition-colors"
        >
          <ImagePlus className="w-3.5 h-3.5" /> Change image
        </button>
      )}

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col justify-end" style={{ minHeight: 320 }}>
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/15 backdrop-blur-sm rounded-full mb-4 border border-white/25 w-fit">
          <Users className="w-4 h-4" />
          <p className="text-sm font-semibold">Parent Portal</p>
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold mb-2 drop-shadow-lg">
          Welcome back, {user.display_name || user.full_name}!
        </h1>
        <p className="text-white/85 text-lg drop-shadow mb-6">Manage your child's scouting journey all in one place</p>

        {/* Child indicator / switcher */}
        {children.length > 1 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-white/60 font-bold mr-1">Viewing</span>
            {children.map((c, i) => {
              const active = c.id === selectedChild?.id;
              return (
                <button
                  key={c.id}
                  onClick={() => onSelectChild(c.id)}
                  className={`flex items-center gap-2 pl-1.5 pr-4 py-1.5 rounded-full border transition-all ${
                    active ? 'bg-white text-gray-900 border-white shadow-lg' : 'bg-white/10 text-white border-white/30 hover:bg-white/20'
                  }`}
                >
                  <span
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ background: childColor(i) }}
                  >
                    {childInitials(c)}
                  </span>
                  <span className="text-sm font-semibold">{c.preferred_name || c.first_name}</span>
                </button>
              );
            })}
          </div>
        ) : selectedChild ? (
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/25 rounded-2xl px-4 py-3 w-fit">
            <span
              className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
              style={{ background: childColor(0) }}
            >
              {childInitials(selectedChild)}
            </span>
            <div>
              <p className="font-bold text-white leading-tight">{selectedChild.full_name}</p>
              {sectionDisplayName && (
                <span className="text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-full inline-block mt-1" style={{ background: accent }}>
                  {sectionDisplayName}
                </span>
              )}
            </div>
          </div>
        ) : null}

        {children.length > 1 && sectionDisplayName && (
          <span className="text-xs font-bold uppercase tracking-wide px-3 py-1 rounded-full w-fit mt-3" style={{ background: accent }}>
            {sectionDisplayName}
          </span>
        )}
      </div>
    </div>
  );
}