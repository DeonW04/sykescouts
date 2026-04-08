import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { HandHeart, CheckCircle, ChevronDown, ChevronUp, MapPin, Calendar, Info } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

function VolunteerItem({ action, user, entityInfo, onTabChange }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Check if this parent has already volunteered (any child's response)
  const hasVolunteered = action._parentResponse === 'Yes, I will volunteer';
  const hasDeclined = action._parentResponse === 'No, not this time';

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
    } catch (err) {
      toast.error('Failed to save: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const spotsLeft = limit ? limit - totalYes : null;

  return (
    <div className={`bg-white rounded-2xl overflow-hidden border transition-all ${hasVolunteered ? 'border-green-300' : 'border-green-100'}`}>
      <button
        className="w-full flex items-start gap-3 p-4 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${hasVolunteered ? 'bg-green-200' : 'bg-green-100'}`}>
          {hasVolunteered
            ? <CheckCircle className="w-4 h-4 text-green-700" />
            : <HandHeart className="w-4 h-4 text-green-600" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900 leading-snug">{action.action_text}</p>
          {entityInfo && (
            <p className="text-xs text-gray-500 mt-0.5">
              {entityInfo.name}
              {entityInfo.date ? ` · ${format(new Date(entityInfo.date), 'd MMM')}` : ''}
              {entityInfo.location ? ` · ${entityInfo.location}` : ''}
            </p>
          )}
          {hasVolunteered && <p className="text-xs text-green-700 font-medium mt-0.5">You're volunteering ✓</p>}
          {spotsLeft !== null && spotsLeft > 0 && !hasVolunteered && (
            <p className="text-xs text-orange-500 font-medium mt-0.5">{spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} remaining</p>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-50 pt-3 space-y-3">
          {entityInfo && (
            <div className="bg-green-50 rounded-xl p-3 space-y-1.5">
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
              {entityInfo.onTabChange && (
                <button
                  onClick={() => entityInfo.onTabChange()}
                  className="flex items-center gap-1 text-xs text-green-700 font-medium mt-1 underline"
                >
                  <Info className="w-3 h-3" />
                  View {entityInfo.type === 'event' ? 'event' : 'meeting'} details
                </button>
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
                {hasVolunteered ? '✓ I\'ll help!' : 'Yes, I\'ll help!'}
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
      )}
    </div>
  );
}

export default function VolunteerRequestCard({ volunteerActions, user, onTabChange }) {
  if (volunteerActions.length === 0) return null;

  const active = volunteerActions.filter(a => {
    // Hide if limit reached and this parent said yes
    const totalYes = a._totalYes || 0;
    const limit = a.volunteer_limit;
    const noLimit = a.volunteer_no_limit;
    const limitReached = !noLimit && limit && totalYes >= limit;
    // Show if: not responded yet, or has responded (so they can see their response)
    // Hide if limit reached AND this parent hasn't volunteered
    if (limitReached && a._parentResponse !== 'Yes, I will volunteer') return false;
    return true;
  });

  if (active.length === 0) return null;

  return (
    <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <HandHeart className="w-4 h-4 text-green-700" />
        <h2 className="font-bold text-green-900 text-sm">Volunteer Needed</h2>
        <span className="ml-auto bg-green-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {active.length}
        </span>
      </div>
      <div className="space-y-3">
        {active.map(action => (
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