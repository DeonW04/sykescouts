import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

function parseTime(timeStr, dateStr) {
  if (!timeStr || !dateStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date(dateStr);
  d.setHours(h, m, 0, 0);
  return d;
}

export function useOngoingSession({ sectionIds = [] }) {
  const { data: ongoingSession = null } = useQuery({
    queryKey: ['ongoing-session', sectionIds.join(',')],
    queryFn: async () => {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const oneHourMs = 60 * 60 * 1000;

      // Check events
      const events = await base44.entities.Event.filter({ published: true });

      // Test mode
      const testEvent = events.find(e =>
        e.live_view_test_mode === true &&
        !e.disable_live_view &&
        e.section_ids?.some(sid => sectionIds.includes(sid))
      );
      if (testEvent) return { type: 'event', data: testEvent };

      const ongoingEvent = events.find(e => {
        if (e.disable_live_view) return false;
        if (!e.section_ids?.some(sid => sectionIds.includes(sid))) return false;
        const start = new Date(e.start_date);
        const end = e.end_date ? new Date(e.end_date) : new Date(e.start_date);
        end.setTime(end.getTime() + oneHourMs);
        return now >= start && now <= end;
      });
      if (ongoingEvent) return { type: 'event', data: ongoingEvent };

      // Check meetings
      const programmes = await base44.entities.Programme.filter({});

      // Test mode
      const testMeeting = programmes.find(p =>
        p.live_view_test_mode === true &&
        !p.disable_live_view &&
        sectionIds.includes(p.section_id) &&
        !p.no_meeting
      );
      if (testMeeting) return { type: 'meeting', data: testMeeting };

      const todayMeetings = programmes.filter(
        p => p.date === todayStr && sectionIds.includes(p.section_id) && !p.no_meeting && !p.disable_live_view
      );
      if (todayMeetings.length === 0) return null;

      const terms = await base44.entities.Term.filter({ active: true });

      for (const meeting of todayMeetings) {
        const term = terms.find(t => t.section_id === meeting.section_id);
        const startStr = meeting.optional_start_time || term?.meeting_start_time;
        const endStr = meeting.optional_end_time || term?.meeting_end_time;

        let start, end;
        if (startStr && endStr) {
          start = parseTime(startStr, meeting.date);
          end = parseTime(endStr, meeting.date);
          end.setTime(end.getTime() + oneHourMs);
        } else {
          start = parseTime('17:00', meeting.date);
          end = parseTime('22:00', meeting.date);
        }

        if (start && end && now >= start && now <= end) {
          return { type: 'meeting', data: meeting };
        }
      }
      return null;
    },
    refetchInterval: 5 * 60 * 1000,
    enabled: sectionIds.length > 0,
  });

  return { ongoingSession };
}