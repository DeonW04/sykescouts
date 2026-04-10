import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Phone, Camera, MapPin, Clock, User, Home } from 'lucide-react';
import { format } from 'date-fns';

export default function ParentLiveView({ session, onBack }) {
  const isEvent = session.type === 'event';
  const entity = session.data;
  const entityQuery = isEvent ? { event_id: entity.id } : { programme_id: entity.id };

  // Leaders marked as attending this session
  const { data: leaderAttendances = [] } = useQuery({
    queryKey: ['live-leader-attendance', entity.id],
    queryFn: () => base44.entities.LeaderAttendance.filter(entityQuery),
  });

  const { data: allLeaders = [] } = useQuery({
    queryKey: ['all-leaders'],
    queryFn: () => base44.entities.Leader.filter({}),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users-live'],
    queryFn: () => base44.entities.User.list(),
  });

  // Live photos — refresh every 30s
  const { data: photos = [] } = useQuery({
    queryKey: ['live-photos', entity.id],
    queryFn: () => base44.entities.EventPhoto.filter(entityQuery),
    refetchInterval: 30 * 1000,
  });

  const attendingLeaders = leaderAttendances
    .filter(a => a.status === 'attending')
    .map(a => {
      const leader = allLeaders.find(l => l.id === a.leader_id);
      const user = leader ? allUsers.find(u => u.id === leader.user_id) : null;
      return leader ? { ...leader, full_name: user?.full_name || leader.display_name } : null;
    })
    .filter(Boolean);

  const accent = isEvent ? 'bg-[#7413dc]' : 'bg-[#004851]';
  const accentLight = isEvent ? 'bg-purple-50 border-purple-200' : 'bg-teal-50 border-teal-200';

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <div className={`${accent} text-white px-4 pb-6`}
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}>
        <button onClick={onBack} className="flex items-center gap-2 text-white/70 mb-4 -ml-1">
          <ArrowLeft className="w-5 h-5" /> <span className="text-sm">Back</span>
        </button>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400 animate-pulse" />
          <p className="text-white/70 text-xs font-semibold uppercase tracking-wide">
            {isEvent ? 'Event Live Now' : 'Meeting in Progress'}
          </p>
        </div>
        <h1 className="text-xl font-bold">{entity.title}</h1>
        <div className="flex flex-wrap gap-3 mt-2">
          {isEvent && entity.location && (
            <div className="flex items-center gap-1 text-white/70 text-xs">
              <MapPin className="w-3.5 h-3.5" /> {entity.location}
            </div>
          )}
          {!isEvent && entity.optional_location && (
            <div className="flex items-center gap-1 text-white/70 text-xs">
              <MapPin className="w-3.5 h-3.5" /> {entity.optional_location}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 px-4 py-5 space-y-5">
        {/* Home Contact */}
        {entity.home_contact && (
          <div className={`rounded-2xl border p-4 ${accentLight}`}>
            <div className="flex items-center gap-2 mb-2">
              <Home className="w-4 h-4 text-gray-600" />
              <p className="font-bold text-gray-900 text-sm">Home Contact</p>
            </div>
            <p className="text-gray-700 text-sm whitespace-pre-line">{entity.home_contact}</p>
          </div>
        )}

        {/* Leaders Present */}
        <div>
          <h2 className="font-bold text-gray-900 text-base mb-3">
            Leaders Present ({attendingLeaders.length})
          </h2>
          {attendingLeaders.length === 0 ? (
            <div className="bg-white rounded-2xl p-4 border border-gray-100 text-center">
              <p className="text-sm text-gray-400">No leaders have checked in yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {attendingLeaders.map(leader => (
                <div key={leader.id} className="bg-white rounded-2xl px-4 py-3.5 border border-gray-100 flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#004851] rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {(leader.display_name || leader.full_name)?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{leader.display_name || leader.full_name}</p>
                    {leader.phone ? (
                      <a href={`tel:${leader.phone}`} className="flex items-center gap-1 text-[#7413dc] text-xs font-medium mt-0.5">
                        <Phone className="w-3 h-3" /> {leader.phone}
                      </a>
                    ) : (
                      <p className="text-xs text-gray-400 mt-0.5">No number listed</p>
                    )}
                  </div>
                  {leader.phone && (
                    <a
                      href={`tel:${leader.phone}`}
                      className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0"
                    >
                      <Phone className="w-4 h-4 text-green-600" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Gallery */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="font-bold text-gray-900 text-base">Live Photos</h2>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Auto-refreshes</span>
          </div>
          {photos.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 border border-gray-100 text-center">
              <Camera className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No photos yet — leaders may upload during the session</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {[...photos].reverse().map(photo => (
                <div key={photo.id} className="relative rounded-2xl overflow-hidden bg-gray-100 aspect-square">
                  <img src={photo.file_url} alt="" className="w-full h-full object-cover" />
                  {photo.created_date && (
                    <div className="absolute bottom-1.5 right-1.5 bg-black/50 rounded-lg px-1.5 py-0.5">
                      <p className="text-white text-[10px]">{format(new Date(photo.created_date), 'HH:mm')}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}