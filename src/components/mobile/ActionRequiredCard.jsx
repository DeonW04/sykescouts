import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Bell, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

function ActionItem({ action, children, user, existingResponses }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [localResponses, setLocalResponses] = useState({});

  // For each child, check if they already responded
  const getExistingResponse = (childId) =>
    existingResponses.find(r =>
      (r.action_required_id === action.id || r.action_id === action.id) &&
      (r.member_id === childId || r.child_member_id === childId) &&
      r.status === 'completed' && r.response
    );

  const allAnswered = children.every(c => getExistingResponse(c.id) || localResponses[c.id]);

  const handleSubmit = async (child, response) => {
    setSubmitting(true);
    try {
      const existing = getExistingResponse(child.id);
      if (existing) {
        await base44.entities.ActionResponse.update(existing.id, { response, status: 'completed' });
      } else {
        await base44.entities.ActionResponse.create({
          action_required_id: action.id,
          action_id: action.id,
          member_id: child.id,
          child_member_id: child.id,
          parent_email: user.email,
          response,
          status: 'completed',
          response_date: new Date().toISOString(),
        });
      }
      setLocalResponses(prev => ({ ...prev, [child.id]: response }));
      queryClient.invalidateQueries({ queryKey: ['mobile-actions'] });
      toast.success('Response saved!');
    } catch (err) {
      toast.error('Failed to save: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getOptions = () => {
    if (action.action_purpose === 'attendance') return ['Yes, attending', 'No, not attending'];
    if (action.action_purpose === 'consent') return ['I give consent', 'I do not consent'];
    if (action.action_purpose === 'custom_dropdown') return action.dropdown_options || [];
    return null;
  };

  const options = getOptions();

  return (
    <div className={`bg-white rounded-2xl overflow-hidden border transition-all ${allAnswered ? 'border-green-200' : 'border-orange-100'}`}>
      {/* Header */}
      <button
        className="w-full flex items-start gap-3 p-4 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${allAnswered ? 'bg-green-100' : 'bg-orange-100'}`}>
          {allAnswered
            ? <CheckCircle className="w-4 h-4 text-green-600" />
            : <Bell className="w-4 h-4 text-orange-500" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900 leading-snug">{action.action_text}</p>
          {allAnswered && <p className="text-xs text-green-600 mt-0.5 font-medium">All responded ✓</p>}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-50 pt-3">
          {children.map(child => {
            const existing = getExistingResponse(child.id);
            const currentResponse = localResponses[child.id] || existing?.response;

            return (
              <div key={child.id}>
                {children.length > 1 && (
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{child.full_name || child.first_name}</p>
                )}

                {/* Options-based (dropdown/attendance/consent) */}
                {options ? (
                  <div className="flex flex-wrap gap-2">
                    {options.map(opt => {
                      const selected = currentResponse === opt;
                      return (
                        <button
                          key={opt}
                          onClick={() => handleSubmit(child, opt)}
                          disabled={submitting}
                          className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all active:scale-95 ${
                            selected
                              ? 'bg-[#7413dc] text-white border-[#7413dc]'
                              : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-[#7413dc] hover:text-[#7413dc]'
                          }`}
                        >
                          {selected ? '✓ ' : ''}{opt}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  /* Text input */
                  <TextResponseInput
                    currentResponse={currentResponse}
                    onSubmit={(val) => handleSubmit(child, val)}
                    submitting={submitting}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TextResponseInput({ currentResponse, onSubmit, submitting }) {
  const [value, setValue] = useState(currentResponse || '');
  return (
    <div className="flex gap-2">
      <input
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="Type your response..."
        className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#7413dc]"
      />
      <button
        onClick={() => value.trim() && onSubmit(value.trim())}
        disabled={submitting || !value.trim()}
        className="px-4 py-2 bg-[#7413dc] text-white rounded-xl text-sm font-medium disabled:opacity-40 active:scale-95 transition-transform"
      >
        {submitting ? '…' : 'Send'}
      </button>
    </div>
  );
}

export default function ActionRequiredCard({ actionsRequired, children, user, existingResponses }) {
  if (actionsRequired.length === 0) return null;

  const pendingCount = actionsRequired.filter(action =>
    !children.every(child =>
      existingResponses.some(r =>
        (r.action_required_id === action.id || r.action_id === action.id) &&
        (r.member_id === child.id || r.child_member_id === child.id) &&
        r.status === 'completed' && r.response
      )
    )
  ).length;

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Bell className="w-4 h-4 text-orange-600" />
        <h2 className="font-bold text-orange-900 text-sm">Action Required</h2>
        {pendingCount > 0 && (
          <span className="ml-auto bg-orange-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {pendingCount}
          </span>
        )}
      </div>
      <div className="space-y-3">
        {actionsRequired.map(action => (
          <ActionItem
            key={action.id}
            action={action}
            children={children}
            user={user}
            existingResponses={existingResponses}
          />
        ))}
      </div>
    </div>
  );
}