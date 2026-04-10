import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, User, ShieldAlert, FileText, AlertTriangle, ChevronRight, X, Phone, Heart, Pill, Send, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

function SendUpdatePanel({ session }) {
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const sendMutation = useMutation({
    mutationFn: () => base44.functions.invoke('sendLiveUpdate', {
      message,
      sectionId: session.type === 'meeting' ? session.data.section_id : null,
      eventId: session.type === 'event' ? session.data.id : null,
    }),
    onSuccess: (res) => {
      setSent(true);
      setMessage('');
      setTimeout(() => setSent(false), 4000);
    },
  });

  const quickMessages = [
    'We are running about 10 minutes late tonight.',
    'We are running about 15 minutes late tonight.',
    'Please come to the side entrance tonight.',
    'Collection time has changed — please check with a leader.',
  ];

  return (
    <div className="px-4 py-5 space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="w-4 h-4 text-[#004851]" />
          <p className="font-semibold text-gray-900 text-sm">Send a message to parents</p>
        </div>
        <p className="text-xs text-gray-500 mb-3">This will send a push notification to all parents of attending members.</p>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="e.g. We are running 10 minutes late tonight..."
          rows={3}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#004851]/30"
        />
        <button
          onClick={() => sendMutation.mutate()}
          disabled={!message.trim() || sendMutation.isPending}
          className="mt-3 w-full flex items-center justify-center gap-2 bg-[#004851] text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
          {sendMutation.isPending ? 'Sending...' : 'Send to Parents'}
        </button>
        {sent && (
          <p className="text-center text-green-600 text-xs font-medium mt-2">✓ Notification sent!</p>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Quick Messages</p>
        <div className="space-y-2">
          {quickMessages.map((msg, i) => (
            <button
              key={i}
              onClick={() => setMessage(msg)}
              className="w-full text-left text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-xl px-3 py-2.5 transition-colors"
            >
              {msg}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function MemberMedicalModal({ member, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end" onClick={onClose}>
      <div className="bg-white rounded-t-3xl w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white px-4 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-900">{member.full_name || `${member.first_name} ${member.surname}`}</h2>
            <p className="text-xs text-gray-500">Medical & Emergency Info</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>
        <div className="px-4 py-4 space-y-4">
          {/* Medical */}
          {(member.medical_info || member.allergies || member.medications || member.dietary_requirements) ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-500" />
                <p className="font-semibold text-gray-900 text-sm">Medical Information</p>
              </div>
              {member.medical_info && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                  <p className="text-xs font-semibold text-red-700 mb-1">Conditions</p>
                  <p className="text-sm text-gray-700">{member.medical_info}</p>
                </div>
              )}
              {member.allergies && (
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-3">
                  <p className="text-xs font-semibold text-orange-700 mb-1">Allergies</p>
                  <p className="text-sm text-gray-700">{member.allergies}</p>
                </div>
              )}
              {member.medications && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                  <p className="text-xs font-semibold text-blue-700 mb-1 flex items-center gap-1"><Pill className="w-3 h-3" /> Medications</p>
                  <p className="text-sm text-gray-700">{member.medications}</p>
                </div>
              )}
              {member.dietary_requirements && (
                <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-3">
                  <p className="text-xs font-semibold text-yellow-700 mb-1">Dietary Requirements</p>
                  <p className="text-sm text-gray-700">{member.dietary_requirements}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-sm text-gray-400">No medical information recorded</p>
            </div>
          )}

          {/* Emergency Contacts */}
          <div>
            <p className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-2">
              <Phone className="w-4 h-4 text-green-600" /> Emergency Contacts
            </p>
            <div className="space-y-2">
              {member.parent_one_name && (
                <div className="bg-white border border-gray-100 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{member.parent_one_name}</p>
                    <p className="text-xs text-gray-500">Parent / Guardian 1</p>
                  </div>
                  {member.parent_one_phone && (
                    <a href={`tel:${member.parent_one_phone}`} className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center">
                      <Phone className="w-4 h-4 text-green-600" />
                    </a>
                  )}
                </div>
              )}
              {member.parent_two_name && (
                <div className="bg-white border border-gray-100 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{member.parent_two_name}</p>
                    <p className="text-xs text-gray-500">Parent / Guardian 2</p>
                  </div>
                  {member.parent_two_phone && (
                    <a href={`tel:${member.parent_two_phone}`} className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center">
                      <Phone className="w-4 h-4 text-green-600" />
                    </a>
                  )}
                </div>
              )}
              {member.emergency_contact_name && (
                <div className="bg-white border border-gray-100 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{member.emergency_contact_name}</p>
                    <p className="text-xs text-gray-500">{member.emergency_contact_relationship || 'Emergency Contact'}</p>
                  </div>
                  {member.emergency_contact_phone && (
                    <a href={`tel:${member.emergency_contact_phone}`} className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center">
                      <Phone className="w-4 h-4 text-green-600" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {member.notes && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
              <p className="text-xs font-semibold text-amber-700 mb-1">Leader Notes (private)</p>
              <p className="text-sm text-gray-700">{member.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LeaderLiveView({ session, onBack }) {
  const queryClient = useQueryClient();
  const isEvent = session.type === 'event';
  const entity = session.data;
  const [activeTab, setActiveTab] = useState('register');
  const [selectedMember, setSelectedMember] = useState(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const entityQuery = isEvent ? { event_id: entity.id } : { programme_id: entity.id };

  // Members
  const { data: allMembers = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.filter({ active: true }),
  });

  // Event attendances
  const { data: eventAttendances = [] } = useQuery({
    queryKey: ['live-event-attendances', entity.id],
    queryFn: () => base44.entities.EventAttendance.filter({ event_id: entity.id }),
    enabled: isEvent,
  });

  // Member meeting attendance
  const { data: attendances = [] } = useQuery({
    queryKey: ['live-attendances', entity.id, todayStr],
    queryFn: () => base44.entities.Attendance.filter({ section_id: entity.section_id, date: todayStr }),
    enabled: !isEvent,
  });

  // Risk assessments
  const { data: riskAssessments = [] } = useQuery({
    queryKey: ['live-risks', entity.id],
    queryFn: async () => {
      const ids = entity.risk_assessment_ids || [];
      if (ids.length === 0) return [];
      const all = await base44.entities.RiskAssessment.filter({});
      return all.filter(r => ids.includes(r.id));
    },
  });

  // Consent forms
  const { data: consentForms = [] } = useQuery({
    queryKey: ['live-consent-forms', entity.id],
    queryFn: async () => {
      const ids = entity.consent_form_ids || [];
      if (ids.length === 0) return [];
      const all = await base44.entities.ConsentForm.filter({ active: true });
      return all.filter(f => ids.includes(f.id));
    },
  });

  const memberList = isEvent
    ? allMembers.filter(m => eventAttendances.some(a => a.member_id === m.id))
    : allMembers.filter(m => m.section_id === entity.section_id);

  const getMemberAttendance = (memberId) => {
    return attendances.find(a => a.member_id === memberId)?.status || null;
  };

  const markAttendanceMutation = useMutation({
    mutationFn: async ({ memberId, status }) => {
      const existing = attendances.find(a => a.member_id === memberId);
      if (existing) {
        return base44.entities.Attendance.update(existing.id, { status });
      } else {
        return base44.entities.Attendance.create({
          member_id: memberId,
          section_id: entity.section_id,
          date: todayStr,
          status,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-attendances', entity.id, todayStr] });
    },
  });

  const presentCount = isEvent
    ? eventAttendances.filter(a => a.rsvp_status === 'attending').length
    : attendances.filter(a => a.status === 'present').length;

  const tabs = [
    { id: 'register', label: 'Register' },
    { id: 'planning', label: 'Planning' },
    { id: 'update', label: 'Send Update' },
  ];

  const STATUSES = [
    { value: 'present', label: 'P', color: 'bg-green-500' },
    { value: 'absent', label: 'A', color: 'bg-red-400' },
    { value: 'apologies', label: 'Apo', color: 'bg-yellow-400' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#004851] to-[#006b7a] text-white px-4 pb-0"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}>
        <button onClick={onBack} className="flex items-center gap-2 text-white/70 mb-3 -ml-1">
          <ArrowLeft className="w-5 h-5" /> <span className="text-sm">Back</span>
        </button>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400 animate-pulse" />
          <p className="text-white/70 text-xs font-semibold uppercase tracking-wide">
            {isEvent ? 'Event Live' : 'Meeting Live'}
          </p>
        </div>
        <h1 className="text-xl font-bold mb-1">{entity.title}</h1>
        <p className="text-white/60 text-xs mb-4">
          {memberList.length} members · {presentCount} marked present
        </p>

        {/* Tabs */}
        <div className="flex gap-1 pb-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 rounded-t-xl text-sm font-semibold transition-colors ${
                activeTab === tab.id ? 'bg-gray-50 text-[#004851]' : 'text-white/70'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Register Tab */}
        {activeTab === 'register' && (
          <div className="px-4 py-4 space-y-2">
            <p className="text-xs text-gray-500 mb-3">Tap a member name to see medical & emergency info. Use the buttons to mark attendance.</p>
            {memberList.map(member => {
              const status = isEvent ? null : getMemberAttendance(member.id);
              const hasMedical = member.medical_info || member.allergies || member.medications;
              return (
                <div key={member.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="flex items-center gap-3 px-3 py-2.5">
                    <button
                      onClick={() => setSelectedMember(member)}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left"
                    >
                      <div className="w-9 h-9 bg-[#004851] rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {member.first_name?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm">{member.full_name || `${member.first_name} ${member.surname}`}</p>
                        {hasMedical && (
                          <div className="flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-orange-500" />
                            <span className="text-xs text-orange-600 font-medium">Medical info</span>
                          </div>
                        )}
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                    </button>

                    {!isEvent && (
                      <div className="flex gap-1 flex-shrink-0">
                        {STATUSES.map(s => (
                          <button
                            key={s.value}
                            onClick={() => markAttendanceMutation.mutate({ memberId: member.id, status: s.value })}
                            className={`h-8 min-w-[36px] px-2 rounded-lg text-xs font-bold text-white transition-all ${
                              status === s.value ? s.color : 'bg-gray-200 text-gray-500'
                            }`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {memberList.length === 0 && (
              <div className="text-center py-10 text-gray-400">
                <User className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No members found</p>
              </div>
            )}
          </div>
        )}

        {/* Send Update Tab */}
        {activeTab === 'update' && (
          <SendUpdatePanel session={session} />
        )}

        {/* Planning Tab */}
        {activeTab === 'planning' && (
          <div className="px-4 py-4 space-y-4">
            {/* Home contact */}
            {entity.home_contact && (
              <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4">
                <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide mb-1">Home Contact</p>
                <p className="text-sm text-gray-700 whitespace-pre-line">{entity.home_contact}</p>
              </div>
            )}

            {/* Description */}
            {entity.description && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Description</p>
                <p className="text-sm text-gray-700">{entity.description}</p>
              </div>
            )}

            {/* Activities */}
            {entity.activities?.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Schedule / Activities</p>
                <div className="space-y-2">
                  {entity.activities.map((act, i) => (
                    <div key={i} className="flex items-start gap-3">
                      {act.time && (
                        <span className="text-xs font-bold text-[#004851] bg-teal-50 px-2 py-1 rounded-lg flex-shrink-0">{act.time}</span>
                      )}
                      <p className="text-sm text-gray-700">{act.activity}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Schedule (events) */}
            {entity.schedule_by_day?.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Event Schedule</p>
                {entity.schedule_by_day.map((day, di) => (
                  <div key={di} className="mb-3">
                    <p className="text-sm font-semibold text-gray-800 mb-1">{day.day_name}</p>
                    {day.items?.map((item, ii) => (
                      <div key={ii} className="flex items-start gap-2 ml-2 mb-1">
                        {item.time && <span className="text-xs text-gray-500 w-12 flex-shrink-0">{item.time}</span>}
                        <p className="text-sm text-gray-700">{item.activity}</p>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* Equipment */}
            {(entity.equipment_needed || entity.equipment_list) && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Equipment Needed</p>
                <p className="text-sm text-gray-700">{entity.equipment_needed || entity.equipment_list}</p>
              </div>
            )}

            {/* Risk Assessments */}
            {riskAssessments.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldAlert className="w-4 h-4 text-orange-500" />
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Risk Assessments ({riskAssessments.length})</p>
                </div>
                <div className="space-y-2">
                  {riskAssessments.map(r => (
                    <div key={r.id} className="bg-orange-50 border border-orange-100 rounded-xl p-3">
                      <p className="font-semibold text-sm text-gray-900">{r.title || r.activity}</p>
                      {r.location && <p className="text-xs text-gray-500 mt-0.5">{r.location}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Consent Forms */}
            {consentForms.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-blue-500" />
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Consent Forms ({consentForms.length})</p>
                </div>
                <div className="space-y-2">
                  {consentForms.map(f => (
                    <div key={f.id} className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                      <p className="font-semibold text-sm text-gray-900">{f.title}</p>
                      {f.description && <p className="text-xs text-gray-500 mt-0.5">{f.description}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!entity.description && !entity.activities?.length && !entity.schedule_by_day?.length && riskAssessments.length === 0 && consentForms.length === 0 && !entity.home_contact && (
              <div className="text-center py-10 text-gray-400">
                <p className="text-sm">No planning details recorded for this session</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Member Medical Modal */}
      {selectedMember && (
        <MemberMedicalModal member={selectedMember} onClose={() => setSelectedMember(null)} />
      )}
    </div>
  );
}