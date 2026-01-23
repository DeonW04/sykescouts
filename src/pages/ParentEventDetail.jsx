import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Calendar, MapPin, Download, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import PhotoGallery from '../components/events/PhotoGallery';

export default function ParentEventDetail() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get('id');
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);
  };

  const { data: event } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => base44.entities.Event.filter({ id: eventId }).then(res => res[0]),
    enabled: !!eventId,
  });

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => base44.entities.Section.filter({ active: true }),
  });

  const { data: photos = [] } = useQuery({
    queryKey: ['event-photos', eventId],
    queryFn: () => base44.entities.EventPhoto.filter({ event_id: eventId, visible_to: 'parents' }, '-created_date')
      .then(parentPhotos => 
        base44.entities.EventPhoto.filter({ event_id: eventId, visible_to: 'public' }, '-created_date')
          .then(publicPhotos => [...parentPhotos, ...publicPhotos])
      ),
    enabled: !!eventId,
  });

  if (!event || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#7413dc] border-t-transparent rounded-full" />
      </div>
    );
  }

  const eventSections = sections.filter(s => event.section_ids?.includes(s.id));
  const documents = event.documents || [];
  const scheduleByDay = event.schedule_by_day || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="relative bg-gradient-to-br from-[#7413dc] to-[#5c0fb0] text-white py-16 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('ParentEvents'))}
            className="text-white hover:bg-white/20 mb-6 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <Badge className="bg-white/20 text-white mb-3">{event.type}</Badge>
            <h1 className="text-4xl font-bold mb-4">{event.title}</h1>
            <div className="flex flex-wrap items-center gap-5 text-purple-100">
              <span className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                <span className="font-medium">{format(new Date(event.start_date), 'MMMM d, yyyy')}</span>
                {event.end_date && event.end_date !== event.start_date && (
                  <span>→ {format(new Date(event.end_date), 'MMM d, yyyy')}</span>
                )}
              </span>
              {event.location && (
                <span className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  <span>{event.location}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <Card className="shadow-xl bg-white/90 backdrop-blur-sm border-l-4 border-l-[#7413dc]">
          <CardHeader>
            <CardTitle className="text-2xl">Event Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {event.description && (
              <div>
                <p className="text-gray-900 text-lg leading-relaxed">{event.description}</p>
              </div>
            )}
            {(event.cost > 0 || event.consent_deadline || event.payment_deadline) && (
              <div className="grid md:grid-cols-3 gap-6 pt-5 border-t">
                {event.cost > 0 && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Cost Per Person</p>
                    <p className="text-2xl font-bold text-[#7413dc]">£{event.cost.toFixed(2)}</p>
                  </div>
                )}
                {event.consent_deadline && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Consent Deadline</p>
                    <p className="font-bold text-lg">{format(new Date(event.consent_deadline), 'MMM d, yyyy')}</p>
                  </div>
                )}
                {event.payment_deadline && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Payment Deadline</p>
                    <p className="font-bold text-lg">{format(new Date(event.payment_deadline), 'MMM d, yyyy')}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {scheduleByDay.length > 0 && (
          <Card className="shadow-xl bg-white/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-2xl">Schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {scheduleByDay.map((day, dayIndex) => (
                <div key={dayIndex}>
                  <h3 className="font-bold text-xl mb-4 text-[#7413dc]">{day.day_name}</h3>
                  <div className="space-y-3">
                    {day.items.map((item, itemIndex) => (
                      <div key={itemIndex} className="flex gap-4 p-3 bg-purple-50/50 rounded-lg">
                        <span className="font-bold text-[#7413dc] w-24 flex-shrink-0">{item.time}</span>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{item.activity}</p>
                          {item.notes && <p className="text-gray-600 text-sm mt-1">{item.notes}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                  {dayIndex < scheduleByDay.length - 1 && <div className="border-t mt-6" />}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {documents.length > 0 && (
          <Card className="shadow-xl bg-white/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-2xl">Documents & Kit Lists</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {documents.map((doc, idx) => (
                  <a
                    key={idx}
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-[#7413dc] rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-white" />
                      </div>
                      <span className="font-semibold text-gray-900">{doc.name}</span>
                    </div>
                    <Download className="w-5 h-5 text-gray-400 group-hover:text-[#7413dc] transition-colors" />
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {photos.length > 0 && (
          <Card className="shadow-xl bg-white/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-2xl">Event Photos</CardTitle>
            </CardHeader>
            <CardContent>
              <PhotoGallery photos={photos} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}