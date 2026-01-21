import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Award } from 'lucide-react';
import { format } from 'date-fns';

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
    console.log("currentTerm:", currentTerm);
    console.log("Checking term:", term);
    console.log("Start date:", new Date(term.start_date));
    console.log("End date:", new Date(term.end_date));
    console.log("Section IDs in term:", term.section_ids);
    const relevantSections = childSectionIds.some(sId => term.section_ids?.includes(sId));
    if (!relevantSections) return false;

    const start = new Date(term.start_date);
    const end = new Date(term.end_date);
    console.log("Now:", now);
    console.log("Between start and end:", now >= start && now <= end);
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
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#7413dc] text-white py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold">Term Programme</h1>
          <p className="mt-2 text-white/80">
            {currentTerm.name} • {format(new Date(currentTerm.start_date), 'MMM d')} - {format(new Date(currentTerm.end_date), 'MMM d, yyyy')}
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {Object.keys(programmeBadges).length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                Badges We're Working Towards
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {Object.values(programmeBadges).map(({ badge, requirements: reqs }) => (
                  <div key={badge.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <img src={badge.image_url} alt={badge.name} className="w-16 h-16 rounded object-contain" />
                    <div className="flex-1">
                      <h4 className="font-medium">{badge.name}</h4>
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
            <Card>
              <CardContent className="p-12 text-center">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No meetings planned yet</p>
              </CardContent>
            </Card>
          ) : (
            termProgrammes.map(prog => {
              const section = sections.find(s => s.id === prog.section_id);
              const isPast = new Date(prog.date) < now;
              const isToday = format(new Date(prog.date), 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
              const progBadges = badgeCriteria
                .filter(c => c.programme_id === prog.id)
                .map(c => badges.find(b => b.id === c.badge_id))
                .filter(Boolean);

              return (
                <Card key={prog.id} className={isToday ? 'border-2 border-[#7413dc]' : ''}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {prog.title}
                          {isToday && (
                            <span className="text-xs font-normal bg-[#7413dc] text-white px-2 py-1 rounded">Today</span>
                          )}
                        </CardTitle>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                          <span>{format(new Date(prog.date), 'EEEE, MMMM d, yyyy')}</span>
                          {section && <span>{section.display_name}</span>}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  {(prog.shown_in_portal && prog.description) && (
                    <CardContent>
                      <p className="text-gray-700 whitespace-pre-wrap">{prog.description}</p>
                      
                      {progBadges.length > 0 && (
                        <div className="mt-4 pt-4 border-t">
                          <p className="text-sm font-medium text-gray-700 mb-2">Badge Progress:</p>
                          <div className="flex flex-wrap gap-2">
                            {progBadges.map(badge => (
                              <div key={badge.id} className="flex items-center gap-2 bg-purple-50 px-3 py-1 rounded-full">
                                <img src={badge.image_url} alt={badge.name} className="w-5 h-5 rounded" />
                                <span className="text-sm text-gray-700">{badge.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}