import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Award } from 'lucide-react';
import { format } from 'date-fns';
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

  // Get current term
  const now = new Date();
  const currentTerm = terms.find(term => {
    const isRelevantSection = childSectionIds.includes(term.section_id);
    if (!isRelevantSection) return false;

    const start = new Date(term.start_date);
    const end = new Date(term.end_date);
    console.log("Now:", now);
    console.log("Checking term:", term);
    console.log("In date range:", now >= start && now <= end);
    return now >= start && now <= end;
  });

  // Get programmes for current term
  const termProgrammes = currentTerm
    ? programmes.filter(p => {
        const progDate = new Date(p.date);
        const termStart = new Date(currentTerm.start_date);
        const termEnd = new Date(currentTerm.end_date);
        return progDate >= termStart && progDate <= termEnd && childSectionIds.includes(p.section_id);
      }).sort((a, b) => new Date(a.date) - new Date(b.date))
    : [];

  // Get unique badges from criteria
  const programmeBadges = {};
  termProgrammes.forEach(prog => {
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
              <p className="text-gray-600">No active term at the moment</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Calendar className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Weekly Programme</h1>
              <p className="text-gray-600 text-lg mt-1">
                {currentTerm.title} • {format(new Date(currentTerm.start_date), 'MMM d')} - {format(new Date(currentTerm.end_date), 'MMM d, yyyy')}
              </p>
            </div>
          </div>
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
              <div className="grid md:grid-cols-2 gap-4">
                {Object.values(programmeBadges).map(({ badge, requirements: reqs }) => (
                  <div key={badge.id} className="flex items-center gap-4 p-4 bg-white rounded-xl border-2 border-yellow-100 hover:shadow-md transition-shadow">
                    <img src={badge.image_url} alt={badge.name} className="w-20 h-20 rounded-lg object-contain" />
                    <div className="flex-1">
                      <h4 className="font-bold text-lg">{badge.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{reqs.length} requirement{reqs.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {termProgrammes.length === 0 ? (
            <Card className="bg-white/80 backdrop-blur-sm shadow-xl">
              <CardContent className="p-16 text-center">
                <div className="w-20 h-20 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Calendar className="w-10 h-10 text-green-600" />
                </div>
                <p className="text-gray-600 text-lg">No meetings planned yet</p>
              </CardContent>
            </Card>
          ) : (
            termProgrammes.map((prog, index) => {
              const section = sections.find(s => s.id === prog.section_id);
              const isPast = new Date(prog.date) < now;
              const isToday = format(new Date(prog.date), 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
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
                <Card className={`shadow-xl ${isToday ? 'border-l-4 border-l-green-600 bg-gradient-to-r from-green-50 to-white' : 'bg-white/80 backdrop-blur-sm'}`}>
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
            })
          )}
        </div>
      </div>
    </div>
  );
}