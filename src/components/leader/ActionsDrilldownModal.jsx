import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChevronDown, ChevronRight, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

function ActionRow({ action, assignments, responses, events, programmes }) {
  const actionAssignments = assignments.filter(a => a.action_required_id === action.id);
  const actionResponses = responses.filter(r => r.action_required_id === action.id && r.response_value);
  const completed = actionResponses.length;
  const total = actionAssignments.length;
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

  let contextName = action.action_text;
  if (action.event_id) {
    const ev = events.find(e => e.id === action.event_id);
    if (ev) contextName = ev.title;
  } else if (action.programme_id) {
    const prog = programmes.find(p => p.id === action.programme_id);
    if (prog) contextName = prog.title;
  }

  return (
    <div className="bg-gray-50 rounded-xl p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900 truncate">{action.column_title || action.action_text}</p>
          <p className="text-xs text-gray-500 truncate">{contextName}</p>
          {action.deadline && (
            <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Closes {format(new Date(action.deadline), 'd MMM yyyy')}
            </p>
          )}
        </div>
        <div className="flex-shrink-0 text-right">
          <p className={`text-lg font-bold ${rate === 100 ? 'text-green-600' : rate >= 50 ? 'text-orange-500' : 'text-red-500'}`}>{rate}%</p>
          <p className="text-xs text-gray-400">{completed}/{total}</p>
        </div>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full ${rate === 100 ? 'bg-green-500' : rate >= 50 ? 'bg-orange-400' : 'bg-red-400'}`}
          style={{ width: `${rate}%` }}
        />
      </div>
    </div>
  );
}

function MemberRow({ member, outstandingActions, events, programmes }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-gray-50 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-100 transition-colors"
      >
        <div className="w-8 h-8 bg-[#004851] rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {member.first_name?.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900">{member.full_name || `${member.first_name} ${member.surname}`}</p>
          <p className="text-xs text-gray-500">{outstandingActions.length} action{outstandingActions.length !== 1 ? 's' : ''} outstanding</p>
        </div>
        {expanded ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {outstandingActions.map(action => {
            let contextLabel = action.column_title || action.action_text;
            if (action.event_id) {
              const ev = events.find(e => e.id === action.event_id);
              if (ev) contextLabel += ` (${ev.title})`;
            } else if (action.programme_id) {
              const prog = programmes.find(p => p.id === action.programme_id);
              if (prog) contextLabel += ` (${prog.title})`;
            }
            return (
              <div key={action.id} className="flex items-center gap-2 text-sm bg-white rounded-lg px-3 py-2 border border-gray-100">
                <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span className="text-gray-700 truncate">{contextLabel}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ActionsDrilldownModal({ open, onClose, type, data }) {
  if (!data) return null;
  const { relevantActions, relevantAssignments, relevantResponses, allMembers, allEvents, allProgrammes, closingSoonActions, unrespondedAssignments } = data;

  const getTitle = () => {
    if (type === 'totalActions') return 'Active Actions — Breakdown';
    if (type === 'unrespondedMembers') return 'Members with Outstanding Actions';
    if (type === 'unresponded') return 'Awaiting Response — Breakdown';
    if (type === 'closingSoon') return 'Actions Closing Within 7 Days';
    if (type === 'attendanceActions') return 'Attendance Actions';
    if (type === 'consentActions') return 'Consent Actions';
    if (type === 'volunteerActions') return 'Volunteer Requests';
    return 'Actions Breakdown';
  };

  const getActionsToShow = () => {
    if (type === 'closingSoon') return closingSoonActions;
    if (type === 'attendanceActions') return relevantActions.filter(a => a.action_purpose === 'attendance');
    if (type === 'consentActions') return relevantActions.filter(a => a.action_purpose === 'consent' || a.action_purpose === 'consent_form');
    if (type === 'volunteerActions') return relevantActions.filter(a => a.action_purpose === 'volunteer');
    if (type === 'unresponded') {
      const actionIdsWithOutstanding = new Set(unrespondedAssignments.map(a => a.action_required_id));
      return relevantActions.filter(a => actionIdsWithOutstanding.has(a.id));
    }
    return relevantActions; // totalActions
  };

  const showMembersView = type === 'unrespondedMembers';

  // Build member outstanding map
  const memberOutstandingMap = {};
  if (showMembersView) {
    const respondedPairs = new Set(relevantResponses.filter(r => r.response_value).map(r => `${r.action_required_id}:${r.member_id}`));
    unrespondedAssignments.forEach(assignment => {
      if (!respondedPairs.has(`${assignment.action_required_id}:${assignment.member_id}`)) {
        if (!memberOutstandingMap[assignment.member_id]) memberOutstandingMap[assignment.member_id] = [];
        const action = relevantActions.find(a => a.id === assignment.action_required_id);
        if (action) memberOutstandingMap[assignment.member_id].push(action);
      }
    });
  }

  const actionsToShow = showMembersView ? [] : getActionsToShow();
  const membersToShow = showMembersView
    ? Object.entries(memberOutstandingMap).map(([memberId, actions]) => ({
        member: allMembers.find(m => m.id === memberId),
        actions,
      })).filter(x => x.member)
    : [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>
        <div className="mt-2 space-y-3">
          {showMembersView ? (
            membersToShow.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">No members with outstanding actions</p>
            ) : (
              membersToShow.map(({ member, actions }) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  outstandingActions={actions}
                  events={allEvents}
                  programmes={allProgrammes}
                />
              ))
            )
          ) : (
            actionsToShow.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">No actions to show</p>
            ) : (
              actionsToShow.map(action => (
                <ActionRow
                  key={action.id}
                  action={action}
                  assignments={relevantAssignments}
                  responses={relevantResponses}
                  events={allEvents}
                  programmes={allProgrammes}
                />
              ))
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}