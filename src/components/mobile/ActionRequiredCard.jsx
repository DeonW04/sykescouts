import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Bell, CheckCircle, ChevronDown, ChevronUp, Pencil, FileText, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const ATTENDING_VALUES = new Set(['yes', 'yes, attending', 'attending']);

function ActionItem({ action, child, user, existingResponses, programme, event: eventItem, onTabChange }) {
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState(false);

  const getExistingResponse = (childId) =>
    existingResponses.find(r =>
      r.action_required_id === action.id &&
      r.member_id === childId &&
      r.response_value
    );

  const allAnswered = !!getExistingResponse(child?.id);

  const handleSubmit = async (child, response_value) => {
    setSubmitting(true);
    try {
      const existing = getExistingResponse(child.id);
      if (existing) {
        await base44.entities.ActionResponse.update(existing.id, {
          response_value,
          responded_at: new Date().toISOString(),
        });
      } else {
        await base44.entities.ActionResponse.create({
          action_required_id: action.id,
          member_id: child.id,
          parent_email: user.email,
          response_value,
          responded_at: new Date().toISOString(),
        });
      }
      queryClient.invalidateQueries({ queryKey: ['mobile-actions'] });
      toast.success('Response saved!');
      setEditing(false);
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

  const formatResponse = (val) => {
    if (!val) return val;
    if (val === 'Yes, attending') return '✓ Attending';
    if (val === 'No, not attending') return '✗ Not attending';
    if (val === 'I give consent') return '✓ Consent given';
    if (val === 'I do not consent') return '✗ No consent';
    return val;
  };

  const isAttendanceAction = action.action_purpose === 'attendance';
  const hasMeetingCost = programme?.has_cost && (programme?.cost || 0) > 0;
  const childResponse = getExistingResponse(child?.id);
  const attendanceConfirmedAttending = isAttendanceAction && childResponse && ATTENDING_VALUES.has((childResponse.response_value || '').toLowerCase());
  const showPaymentPrompt = hasMeetingCost && attendanceConfirmedAttending && allAnswered;

  // Context line: meeting title + date
  const contextLine = programme
    ? `${programme.title} · ${format(new Date(programme.date), 'EEE d MMM yyyy')}`
    : eventItem
    ? `${eventItem.title} · ${format(new Date(eventItem.start_date), 'EEE d MMM yyyy')}`
    : null;

  // If all answered and not in edit mode, show compact "responded" state
  if (allAnswered && !editing) {
    const r = getExistingResponse(child?.id);
    return (
      <div>
      <div className="bg-white rounded-2xl border border-green-200 p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800 leading-snug truncate">{action.action_text}</p>
            {contextLine && <p className="text-xs text-[#7413dc] font-medium truncate">{contextLine}</p>}
            <p className="text-xs text-green-700 font-medium">{formatResponse(r?.response_value)}</p>
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
      {showPaymentPrompt && (
        <button
          onClick={() => onTabChange?.('programme')}
          className="mt-2 w-full bg-amber-50 border border-amber-200 rounded-2xl px-3 py-2.5 flex items-center justify-between active:bg-amber-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <div className="text-left">
              <p className="text-xs font-bold text-amber-800">Payment required</p>
              <p className="text-xs text-amber-600">£{(programme.cost).toFixed(2)} for {programme.title}</p>
            </div>
          </div>
          <span className="text-amber-600 text-sm">→</span>
        </button>
      )}
      </div>
    );
  }

  // Unanswered (or editing) — show full form
  const existing = getExistingResponse(child?.id);
  const currentVal = existing?.response_value || '';
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-orange-100">
      <div className="p-4">
        <div className="flex items-start gap-2 mb-3">
          <Bell className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-gray-900 leading-snug">{action.action_text}</p>
            {contextLine && <p className="text-xs text-[#7413dc] mt-0.5 font-medium">{contextLine}</p>}
            {editing && <p className="text-xs text-gray-400 mt-0.5">Updating your response</p>}
          </div>
          {editing && (
            <button onClick={() => setEditing(false)} className="text-xs text-gray-400 flex-shrink-0">Cancel</button>
          )}
        </div>
        {options ? (
          <div className="flex flex-wrap gap-2">
            {options.map(opt => {
              const selected = currentVal === opt;
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
          <TextResponseInput
            currentResponse={currentVal}
            onSubmit={(val) => handleSubmit(child, val)}
            submitting={submitting}
          />
        )}
      </div>
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

export default function ActionRequiredCard({ actionsRequired, child, user, existingResponses, onOpenConsentForm, programmes = [], events = [], onTabChange }) {
  const pendingActions = actionsRequired.filter(action =>
    !existingResponses.some(r =>
      r.action_required_id === action.id &&
      r.member_id === child?.id &&
      r.response_value
    )
  );

  if (pendingActions.length === 0) return null;

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Bell className="w-4 h-4 text-orange-600" />
        <h2 className="font-bold text-orange-900 text-sm">Action Required</h2>
        <span className="ml-auto bg-orange-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {pendingActions.length}
        </span>
      </div>
      <div className="space-y-3">
        {pendingActions.map(action => {
          if (action.action_purpose === 'consent_form') {
            const signed = existingResponses.some(r => r.action_required_id === action.id && r.member_id === child?.id && r.response_value === 'signed');
            if (signed) return null;
            return (
              <div key={action.id} className="bg-white rounded-2xl overflow-hidden border border-orange-100">
                <div className="p-4">
                  <div className="flex items-start gap-2 mb-3">
                    <FileText className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                    <p className="font-semibold text-sm text-gray-900 leading-snug">{action.action_text}</p>
                  </div>
                  <button
                    onClick={() => onOpenConsentForm && onOpenConsentForm(action, child)}
                    className="w-full mt-1 bg-[#7413dc] text-white rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform"
                  >
                    <FileText className="w-4 h-4" />
                    Sign Consent Form
                  </button>
                </div>
              </div>
            );
          }
          const programme = action.programme_id ? programmes.find(p => p.id === action.programme_id) : null;
          const eventItem = action.event_id ? events.find(e => e.id === action.event_id) : null;
          return (
            <ActionItem
              key={action.id}
              action={action}
              child={child}
              user={user}
              existingResponses={existingResponses}
              programme={programme}
              event={eventItem}
              onTabChange={onTabChange}
            />
          );
        }).filter(Boolean)}
      </div>
    </div>
  );
}