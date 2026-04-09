import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { toast } from 'sonner';

const LEADER_TYPES = [
  { key: 'new_join_request', label: 'New join requests', description: 'When someone submits a join enquiry' },
  { key: 'new_volunteer_request', label: 'New volunteer applications', description: 'When someone applies to volunteer' },
  { key: 'consent_form_submitted', label: 'Consent form submitted', description: 'When a parent signs a consent form' },
];

const PARENT_TYPES = [
  { key: 'new_action_required', label: 'New actions required', description: 'When a leader pushes a new action' },
  { key: 'new_consent_form', label: 'New consent forms', description: 'When a consent form is pushed to you' },
  { key: 'volunteer_request', label: 'Volunteer requests', description: 'When a volunteer opportunity is posted' },
  { key: 'event_reminder', label: 'Event day-before reminders', description: 'The day before an event your child is attending' },
  { key: 'weekly_outstanding_actions', label: 'Weekly outstanding actions', description: 'Weekly reminder of any pending actions' },
];

export default function NotificationPreferences({ role, userId }) {
  const queryClient = useQueryClient();
  // Show only types relevant to the passed role; also treat 'admin' as leader
  const effectiveRole = (role === 'leader' || role === 'admin') ? 'leader' : 'parent';
  const types = effectiveRole === 'leader' ? LEADER_TYPES : PARENT_TYPES;

  const { data: sub } = useQuery({
    queryKey: ['push-sub-prefs', userId],
    queryFn: async () => {
      const res = await base44.entities.PushSubscription.filter({ user_id: userId });
      return res[0] || null;
    },
    enabled: !!userId,
  });

  const [prefs, setPrefs] = useState({});

  useEffect(() => {
    if (sub) {
      // Default all to true if not set
      const defaults = {};
      types.forEach(t => { defaults[t.key] = true; });
      setPrefs({ ...defaults, ...(sub.preferences || {}) });
    } else {
      const defaults = {};
      types.forEach(t => { defaults[t.key] = true; });
      setPrefs(defaults);
    }
  }, [sub]);

  const saveMutation = useMutation({
    mutationFn: (newPrefs) => base44.functions.invoke('savePushSubscription', { preferences: newPrefs }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['push-sub-prefs', userId] });
      toast.success('Preferences saved');
    },
    onError: () => toast.error('Failed to save preferences'),
  });

  const toggle = (key) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    saveMutation.mutate(updated);
  };

  if (!sub) return null;

  return (
    <div className="space-y-2">
      {types.map(type => (
        <div key={type.key} className="flex items-center gap-3 py-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800">{type.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{type.description}</p>
          </div>
          <button
            onClick={() => toggle(type.key)}
            className={`w-12 h-6 rounded-full transition-colors flex-shrink-0 relative ${prefs[type.key] !== false ? 'bg-[#7413dc]' : 'bg-gray-200'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${prefs[type.key] !== false ? 'translate-x-[26px]' : 'translate-x-0'}`} />
          </button>
        </div>
      ))}
    </div>
  );
}