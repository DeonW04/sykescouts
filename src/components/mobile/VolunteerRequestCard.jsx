import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { HandHeart, CheckCircle, MapPin, Calendar, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

function VolunteerItem({ action, user, entityInfo }) {
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState(false);

  const hasVolunteered = action._parentResponse === 'Yes, I will volunteer';
  const hasDeclined = action._parentResponse === 'No, not this time';
  const hasResponded = hasVolunteered || hasDeclined;

  const totalYes = action._totalYes || 0;
  const limit = action.volunteer_limit;
  const noLimit = action.volunteer_no_limit;
  const limitReached = !noLimit && limit && totalYes >= limit;

  const handleRespond = async (value) => {
    setSubmitting(true);
    try {
      if (action._existingResponseId) {
        await base44.entities.ActionResponse.update(action._existingResponseId, {
          response_value: value,
          responded_at: new Date().toISOString(),
        });
      } else {
        await base44.entities.ActionResponse.create({
          action_required_id: action.id,
          member_id: action._memberId,
          parent_email: user.email,
          response_value: value,
          responded_at: new Date().toISOString(),
        });
      }
      queryClient.invalidateQueries({ queryKey: ['mobile-volunteer-actions'] });
      queryClient.invalidateQueries({ queryKey: ['mobile-actions'] });
      toast.success(value === 'Yes, I will volunteer' ? 'Thanks for volunteering! 🎉' : 'Response saved');
      setEditing(false);
    } catch (err) {
      toast.error('Failed to save: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Responded & not editing — show compact state
  if (hasResponded && !editing) {
    return (
      <div className="bg-white rounded-2xl border border-green-200 p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <CheckCircle className={`w-4 h-4 flex-shrink-0 ${hasVolunteered ? 'text-green-600' : 'text-gray-400'}`} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800 leading-snug truncate">{action.action_text}</p>
            <p className={`text-xs font-medium ${hasVolunteered ? 'text-green-700' : 'text-gray-500'}`}>
              {hasVolunteered ? "✓ You're volunteering!" : '✗ Not this time'}
            </p>
            {entityInfo && (
              <p className="text-xs text-gray-400 mt-0.5">
                {entityInfo.name}{entityInfo.date ? ` · ${format(new Date(entityInfo.date), 'd MMM')}` : ''}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => setEditing(true)}
          className="flex items-center gap-1 text-xs text-gray-500 border border-gray-200 rounded-lg px-2 py-1 hover:bg-gray-50 flex-shrink-0"
        >
          <Pencil className="w-3 h-3" />
          Edit
        </button>
      </div>
    );
  }

  // No response or editing — show full form
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-green-100">
      <div className="p-4">
        <div className="flex items-start gap-2 mb-3">
          <HandHeart className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-gray-900 leading-snug">{action.action_text}</p>
            {entityInfo && (
              <p className="text-xs text-gray-500 mt-0.5">
                {entityInfo.name}{entityInfo.date ? ` · ${format(new Date(entityInfo.date), 'd MMM')}` : ''}
                {entityInfo.location ? ` · ${entityInfo.location}` : ''}
              </p>
            )}
            {editing && <p className="text-xs text-gray-400 mt-0.5">Updating your response</p>}
          </div>
          {editing && (
            <button onClick={() => setEditing(false)} className="text-xs text-gray-400 flex-shrink-0">Cancel</button>
          )}
        </div>

        {entityInfo && (entityInfo.date || entityInfo.location) && (
          <div className="bg-green-50 rounded-xl p-3 space-y-1.5 mb-3">
            {entityInfo.date && (
              <div className="flex items-center gap-2 text-xs text-green-800">
                <Calendar className="w-3 h-3" />
                <span>{format(new Date(entityInfo.date), 'EEEE, d MMMM yyyy')}</span>
              </div>
            )}
            {entityInfo.location && (
              <div className="flex items-center gap-2 text-xs text-green-800">
                <MapPin className="w-3 h-3" />
                <span>{entityInfo.location}</span>
              </div>
            )}
          </div>
        )}

        {limitReached && !hasVolunteered ? (
          <p className="text-sm text-gray-500 text-center py-2">The volunteer spots for this are now full.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleRespond('Yes, I will volunteer')}
              disabled={submitting}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all active:scale-95 ${
                hasVolunteered
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-green-500 hover:text-green-700'
              }`}
            >
              {hasVolunteered ? "✓ I'll help!" : "Yes, I'll help!"}
            </button>
            <button
              onClick={() => handleRespond('No, not this time')}
              disabled={submitting}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all active:scale-95 ${
                hasDeclined
                  ? 'bg-gray-600 text-white border-gray-600'
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-400'
              }`}
            >
              {hasDeclined ? '✓ Not this time' : 'Not this time'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VolunteerRequestCard({ volunteerActions, user, onTabChange }) {
  // Only show volunteer requests that haven't been responded to yet
  const pending = volunteerActions.filter(a => !a._parentResponse);

  if (pending.length === 0) return null;

  return (
    <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <HandHeart className="w-4 h-4 text-green-700" />
        <h2 className="font-bold text-green-900 text-sm">Volunteer Needed</h2>
        <span className="ml-auto bg-green-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {pending.length}
        </span>
      </div>
      <div className="space-y-3">
        {pending.map(action => (
          <VolunteerItem
            key={action.id}
            action={action}
            user={user}
            entityInfo={action._entityInfo}
            onTabChange={onTabChange}
          />
        ))}
      </div>
    </div>
  );
}