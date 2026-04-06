import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Award } from 'lucide-react';
import { format } from 'date-fns';
import ParentNav from '../components/parent/ParentNav';
import { motion } from 'framer-motion';

export default function ParentProgramme() {
  const [user, setUser] = useState(null);
  const [children, setChildren] = useState([]);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);

    const kids = await base44.entities.Member.filter({
      parent_one_email: currentUser.email,
    });
    const kids2 = await base44.entities.Member.filter({
      parent_two_email: currentUser.email,
    });
    setChildren([...kids, ...kids2]);
  };

  const childSectionIds = [...new Set(children.map(c => c.section_id).filter(Boolean))];

  const { data: terms = [] } = useQuery({
    queryKey: ['terms', childSectionIds],
    queryFn: () => base44.entities.Term.filter({ active: true }),
    enabled: childSectionIds.length > 0,
  });

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => base44.entities.Section.filter({ active: true }),
  });

  const { data: programmes = [] } = useQuery({
    queryKey: ['programmes'],
    queryFn: () => base44.entities.Programme.filter({ published: true }),
  });

  const { data: badges = [] } = useQuery({
    queryKey: ['badges'],
    queryFn: () => base44.entities.BadgeDefinition.filter({ active: true }),
  });

  const { data: badgeCriteria = [] } = useQuery({
    queryKey: ['badge-criteria'],
    queryFn: () => base44.entities.ProgrammeBadgeCriteria.filter({}),
  });

  const { data: requirements = [] } = useQuery({
    queryKey: ['requirements'],
    queryFn: () => base44.entities.BadgeRequirement.filter({}),
  });

  // Get current term, or fall back to next upcoming term
  const now = new Date();
  const relevantTerms = terms.filter(t => childSectionIds.includes(t.section_id));
  const currentTerm = relevantTerms.find(t => now >= new Date(t.start_date) && now <= new Date(t.end_date))
    || relevantTerms.filter(t => new Date(t.start_date) > now).sort((a, b) => new Date(a.start_date) - new Date(b.start_date))[0];

  // Get programmes for current term
  const allTermProgrammes = currentTerm
    ? programmes.filter(p => {
        const progDate = new Date(p.date);
        const termStart = new Date(currentTerm.start_date);
        const termEnd = new Date(currentTerm.end_date);
        return progDate >= termStart && progDate <= termEnd && childSectionIds.includes(p.section_id);
      }).sort((a, b) => new Date(a.date) - new Date(b.date))
    : [];

  // Separate into next/upcoming and previous
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  // Find programmes from today onwards
  const upcomingAndFuture = allTermProgrammes.filter(p => {
    const progDate = new Date(p.date);
    progDate.setHours(0, 0, 0, 0);
    return progDate >= startOfToday;
  });

  // Next meeting is the first upcoming one
  const nextMeeting = upcomingAndFuture.length > 0 ? upcomingAndFuture[0] : null;
  
  // Check if we should still show next meeting (if we're within its day)
  let showNextMeeting = false;
  if (nextMeeting) {
    const meetingDate = new Date(nextMeeting.date);
    meetingDate.setHours(0, 0, 0, 0);
    const endOfMeetingDay = new Date(meetingDate);
    endOfMeetingDay.setHours(23, 59, 59, 999);
    showNextMeeting = now <= endOfMeetingDay;
  }

  // Future meetings are after the next meeting
  const futureProgrammes = upcomingAndFuture.slice(1);

  // Previous meetings are before today, or the next meeting if we're past its day
  const previousProgrammes = allTermProgrammes.filter(p => {
    const progDate = new Date(p.date);
    progDate.setHours(0, 0, 0, 0);
    if (progDate < startOfToday) return true;
    if (!showNextMeeting && nextMeeting && p.id === nextMeeting.id) return true;
    return false;
  });

  // Get unique badges from criteria
  const programmeBadges = {};
  allTermProgrammes.forEach(prog => {
    const criteria = badgeCriteria.filter(c => c.programme_id === prog.id);
    criteria.forEach(c => {
      const badge = badges.find(b => b.id === c.badge_id);
      if (badge) {
        if (!programmeBadges[badge.id]) {
          programmeBadges[badge.id] = { badge, requirements: [] };
        }
        const reqIds = c.requirement_ids || [];
        reqIds.forEach(reqId => {
          const req = requirements.find(r => r.id === reqId);
          if (req && !programmeBadges[badge.id].requirements.find(r => r.id === reqId)) {
            programmeBadges[badge.id].requirements.push(req);
          }
        });
      }
    });
  });

  if (!user || children.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#7413dc] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (currentTerm == null) {
    return (
      <div className="min-h-screen bg-gray-50">
        <ParentNav />
        <div className="bg-[#7413dc] text-white py-8">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold">Term Programme</h1>
            <p className="mt-2 text-white/80">View planned activities for the term</p>
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="p-12 text-center">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No upcoming term at the moment</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <ParentNav />
      <div className="relative bg-gradient-to-br from-green-600 to-[#004851] text-white py-16 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h1 className="text-4xl font-bold">Weekly Programme</h1>
            {new Date(currentTerm.start_date) > now && (
              <span className="bg-white/20 text-white text-sm font-bold px-3 py-1 rounded-full">Upcoming Term</span>
            )}
          </div>
          <p className="text-green-100 text-lg">
            {currentTerm.title} • {format(new Date(currentTerm.start_date), 'MMM d')} - {format(new Date(currentTerm.end_date), 'MMM d, yyyy')}
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {Object.keys(programmeBadges).length > 0 && (
          <Card className="mb-8 shadow-xl bg-gradient-to-br from-yellow-50/50 to-white border-l-4 border-l-yellow-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-2xl">
                <Award className="w-7 h-7 text-yellow-600" />
                Badges This Term
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {Object.values(programmeBadges).map(({ badge, requirements: reqs }) => (
                  <div key={badge.id} className="flex flex-col items-center gap-2 p-3 bg-white rounded-xl border-2 border-yellow-100 hover:shadow-md transition-shadow text-center">
                    <img src={badge.image_url} alt={badge.name} className="w-12 h-12 rounded-lg object-contain" />
                    <p className="font-semibold text-xs leading-tight">{badge.name}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Next Meeting */}
        {showNextMeeting && nextMeeting && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Next Meeting</h2>
            {[nextMeeting].map((prog, index) => {
              const section = sections.find(s => s.id === prog.section_id);
              const isToday = format(new Date(prog.date), 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
              const progBadges = badgeCriteria
                .filter(c => c.programme_id === prog.id)
                .map(c => badges.find(b => b.id === c.badge_id))
                .filter(Boolean);

              return (
                <motion.div
                  key={prog.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Card className="shadow-xl border-l-4 border-l-green-600 bg-gradient-to-r from-green-50 to-white">
                    <CardHeader>
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          {isToday && (
                            <Badge className="bg-green-600">Today</Badge>
                          )}
                        </div>
                        <CardTitle className="text-2xl">{prog.title}</CardTitle>
                        <div className="flex items-center gap-2 mt-2 text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span className="font-medium">{format(new Date(prog.date), 'EEEE, MMMM d')}</span>
                        </div>
                      </div>
                    </CardHeader>
                    {(prog.shown_in_portal && prog.description) && (
                      <CardContent>
                        <p className="text-gray-700 text-lg leading-relaxed whitespace-pre-wrap">{prog.description}</p>
                        
                        {progBadges.length > 0 && (
                          <div className="mt-5 pt-5 border-t">
                            <p className="text-sm font-semibold text-gray-700 mb-3">Badge Work:</p>
                            <div className="flex flex-wrap gap-3">
                              {progBadges.map(badge => (
                                <div key={badge.id} className="flex items-center gap-2 bg-purple-100 px-4 py-2 rounded-full">
                                  <img src={badge.image_url} alt={badge.name} className="w-6 h-6 rounded" />
                                  <span className="text-sm font-medium text-gray-800">{badge.name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Future Meetings */}
        {futureProgrammes.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Upcoming Meetings</h2>
            <div className="space-y-4">
              {futureProgrammes.map((prog, index) => {
                const section = sections.find(s => s.id === prog.section_id);
                const progBadges = badgeCriteria
                  .filter(c => c.programme_id === prog.id)
                  .map(c => badges.find(b => b.id === c.badge_id))
                  .filter(Boolean);

                return (
                  <motion.div
                    key={prog.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="shadow-xl bg-white/80 backdrop-blur-sm">
                      <CardHeader>
                        <div>
                          <CardTitle className="text-2xl">{prog.title}</CardTitle>
                          <div className="flex items-center gap-2 mt-2 text-gray-600">
                            <Calendar className="w-4 h-4" />
                            <span className="font-medium">{format(new Date(prog.date), 'EEEE, MMMM d')}</span>
                          </div>
                        </div>
                      </CardHeader>
                      {(prog.shown_in_portal && prog.description) && (
                        <CardContent>
                          <p className="text-gray-700 text-lg leading-relaxed whitespace-pre-wrap">{prog.description}</p>
                          
                          {progBadges.length > 0 && (
                            <div className="mt-5 pt-5 border-t">
                              <p className="text-sm font-semibold text-gray-700 mb-3">Badge Work:</p>
                              <div className="flex flex-wrap gap-3">
                                {progBadges.map(badge => (
                                  <div key={badge.id} className="flex items-center gap-2 bg-purple-100 px-4 py-2 rounded-full">
                                    <img src={badge.image_url} alt={badge.name} className="w-6 h-6 rounded" />
                                    <span className="text-sm font-medium text-gray-800">{badge.name}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      )}
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Previous Meetings */}
        {previousProgrammes.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Previous Meetings</h2>
            <div className="space-y-4">
              {previousProgrammes.reverse().map((prog, index) => {
                const section = sections.find(s => s.id === prog.section_id);
                const progBadges = badgeCriteria
                  .filter(c => c.programme_id === prog.id)
                  .map(c => badges.find(b => b.id === c.badge_id))
                  .filter(Boolean);

                return (
                  <motion.div
                    key={prog.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="shadow-lg bg-gray-50/80 backdrop-blur-sm border-gray-200">
                      <CardHeader>
                        <div>
                          <CardTitle className="text-xl text-gray-700">{prog.title}</CardTitle>
                          <div className="flex items-center gap-2 mt-2 text-gray-500">
                            <Calendar className="w-4 h-4" />
                            <span className="font-medium">{format(new Date(prog.date), 'EEEE, MMMM d')}</span>
                          </div>
                        </div>
                      </CardHeader>
                      {(prog.shown_in_portal && prog.description) && (
                        <CardContent>
                          <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{prog.description}</p>
                          
                          {progBadges.length > 0 && (
                            <div className="mt-5 pt-5 border-t border-gray-300">
                              <p className="text-sm font-semibold text-gray-600 mb-3">Badge Work:</p>
                              <div className="flex flex-wrap gap-3">
                                {progBadges.map(badge => (
                                  <div key={badge.id} className="flex items-center gap-2 bg-gray-200 px-4 py-2 rounded-full">
                                    <img src={badge.image_url} alt={badge.name} className="w-6 h-6 rounded" />
                                    <span className="text-sm font-medium text-gray-700">{badge.name}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      )}
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {allTermProgrammes.length === 0 && (
          <Card className="bg-white/80 backdrop-blur-sm shadow-xl">
            <CardContent className="p-16 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Calendar className="w-10 h-10 text-green-600" />
              </div>
              <p className="text-gray-600 text-lg">No meetings planned yet</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}