import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CheckCircle, AlertTriangle, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../../utils';

const glassCard = {
  background: 'rgba(255,255,255,0.9)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(116,19,220,0.1)',
  borderRadius: '20px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
};

const INTERVAL_LABELS = { '4_months': 'Every 4 months', '6_months': 'Every 6 months', yearly: 'Yearly' };

export default function PaymentAlerts({ sections, selectedSection }) {
  const navigate = useNavigate();
  const sectionIds = selectedSection ? [selectedSection] : sections.map(s => s.id);
  const todayStr = new Date().toISOString().split('T')[0];
  const now = new Date();

  const { data: members = [] } = useQuery({
    queryKey: ['pa-members', sectionIds.join(',')],
    queryFn: async () => {
      const all = await base44.entities.Member.filter({ active: true });
      return all.filter(m => sectionIds.includes(m.section_id));
    },
    enabled: sectionIds.length > 0,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['pa-events', sectionIds.join(',')],
    queryFn: async () => {
      const all = await base44.entities.Event.filter({});
      return all.filter(e => (e.cost || 0) > 0 && e.section_ids?.some(sid => sectionIds.includes(sid)));
    },
    enabled: sectionIds.length > 0,
  });

  const { data: eventPaymentStatuses = [] } = useQuery({
    queryKey: ['pa-event-ps'],
    queryFn: () => base44.entities.EventPaymentStatus.filter({}),
    enabled: events.length > 0,
  });

  const { data: programmes = [] } = useQuery({
    queryKey: ['pa-programmes', sectionIds.join(',')],
    queryFn: async () => {
      const all = await base44.entities.Programme.filter({});
      return all.filter(p => sectionIds.includes(p.section_id) && p.has_cost && (p.cost || 0) > 0);
    },
    enabled: sectionIds.length > 0,
  });

  const { data: meetingPaymentStatuses = [] } = useQuery({
    queryKey: ['pa-meeting-ps'],
    queryFn: () => base44.entities.MeetingPaymentStatus.filter({}),
    enabled: programmes.length > 0,
  });

  // Overdue subs
  const overdueSubs = members.filter(m => m.next_subs_due && m.next_subs_due < todayStr);

  // Overdue event payments
  const overdueEventPayments = [];
  for (const event of events) {
    const deadline = event.payment_deadline;
    const endDate = (event.end_date || event.start_date)?.split('T')[0];
    const isPast = (deadline && todayStr > deadline) || (!deadline && endDate && todayStr > endDate);
    if (!isPast) continue;
    for (const ps of eventPaymentStatuses.filter(p => p.event_id === event.id && p.status !== 'paid')) {
      const member = members.find(m => m.id === ps.member_id);
      if (member) overdueEventPayments.push({ event, member });
    }
  }

  // Overdue meeting payments
  const overdueMeetingPayments = [];
  for (const prog of programmes) {
    const deadline = prog.payment_deadline;
    const isPast = (deadline && todayStr > deadline) || (!deadline && prog.date && todayStr > prog.date);
    if (!isPast) continue;
    for (const ps of meetingPaymentStatuses.filter(p => p.meeting_id === prog.id && p.status !== 'paid')) {
      const member = members.find(m => m.id === ps.member_id);
      if (member) overdueMeetingPayments.push({ programme: prog, member });
    }
  }

  const totalAlerts = overdueSubs.length + overdueEventPayments.length + overdueMeetingPayments.length;

  if (totalAlerts === 0) {
    return (
      <div style={{ ...glassCard, background: 'linear-gradient(135deg, rgba(34,197,94,0.07) 0%, rgba(16,185,129,0.07) 100%)', border: '1px solid rgba(34,197,94,0.18)', padding: '16px 22px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '32px', height: '32px', background: '#22c55e', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <CheckCircle size={16} color="#fff" />
        </div>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '14px', color: '#166534', margin: 0 }}>All payments are up to date</p>
      </div>
    );
  }

  return (
    <div style={glassCard}>
      <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '32px', height: '32px', background: 'rgba(239,68,68,0.12)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AlertTriangle size={16} color="#ef4444" />
        </div>
        <div>
          <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '16px', color: '#1a1a2e', margin: 0 }}>Payment Alerts</h3>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(26,26,46,0.4)', margin: '2px 0 0' }}>{totalAlerts} outstanding payment issue{totalAlerts !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div style={{ padding: '14px 24px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* Overdue subscriptions */}
        {overdueSubs.length > 0 && (
          <div>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(26,26,46,0.45)', marginBottom: '6px' }}>
              Overdue Subscriptions ({overdueSubs.length})
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {overdueSubs.slice(0, 5).map(member => {
                const section = sections.find(s => s.id === member.section_id);
                const daysOverdue = member.next_subs_due ? Math.floor((now - new Date(member.next_subs_due)) / (1000 * 60 * 60 * 24)) : 0;
                return (
                  <div key={member.id}
                    onClick={() => navigate(createPageUrl('MemberDetail') + `?id=${member.id}`)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '10px', cursor: 'pointer', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.12)' }}>
                    <div>
                      <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '13px', color: '#1a1a2e', margin: 0 }}>{member.full_name}</p>
                      <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(26,26,46,0.5)', margin: '1px 0 0' }}>
                        {section?.display_name} · {daysOverdue}d overdue
                      </p>
                    </div>
                    <ChevronRight size={13} color="rgba(239,68,68,0.5)" />
                  </div>
                );
              })}
              {overdueSubs.length > 5 && (
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(26,26,46,0.4)', margin: '4px 0 0' }}>+{overdueSubs.length - 5} more</p>
              )}
            </div>
          </div>
        )}

        {/* Overdue event payments */}
        {overdueEventPayments.length > 0 && (
          <div>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(26,26,46,0.45)', marginBottom: '6px' }}>
              Overdue Event Payments ({overdueEventPayments.length})
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {overdueEventPayments.slice(0, 5).map(({ event, member }, i) => (
                <div key={`ep-${i}`}
                  onClick={() => navigate(createPageUrl('EventDetail') + `?id=${event.id}`)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '10px', cursor: 'pointer', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)' }}>
                  <div>
                    <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '13px', color: '#1a1a2e', margin: 0 }}>{member.full_name}</p>
                    <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(26,26,46,0.5)', margin: '1px 0 0' }}>
                      {event.title} · £{(event.cost || 0).toFixed(2)} outstanding
                    </p>
                  </div>
                  <ChevronRight size={13} color="rgba(245,158,11,0.5)" />
                </div>
              ))}
              {overdueEventPayments.length > 5 && (
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(26,26,46,0.4)', margin: '4px 0 0' }}>+{overdueEventPayments.length - 5} more</p>
              )}
            </div>
          </div>
        )}

        {/* Overdue meeting payments */}
        {overdueMeetingPayments.length > 0 && (
          <div>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(26,26,46,0.45)', marginBottom: '6px' }}>
              Overdue Meeting Payments ({overdueMeetingPayments.length})
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {overdueMeetingPayments.slice(0, 5).map(({ programme, member }, i) => (
                <div key={`mp-${i}`}
                  onClick={() => navigate(createPageUrl('MeetingDetail') + `?sectionId=${programme.section_id}&date=${programme.date}`)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '10px', cursor: 'pointer', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)' }}>
                  <div>
                    <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '13px', color: '#1a1a2e', margin: 0 }}>{member.full_name}</p>
                    <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(26,26,46,0.5)', margin: '1px 0 0' }}>
                      {programme.title} · £{(programme.cost || 0).toFixed(2)} outstanding
                    </p>
                  </div>
                  <ChevronRight size={13} color="rgba(99,102,241,0.5)" />
                </div>
              ))}
              {overdueMeetingPayments.length > 5 && (
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(26,26,46,0.4)', margin: '4px 0 0' }}>+{overdueMeetingPayments.length - 5} more</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}