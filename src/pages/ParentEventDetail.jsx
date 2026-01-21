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
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#7413dc] text-white py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('ParentEvents'))}
            className="text-white hover:bg-white/10 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Events
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{event.title}</h1>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-white/80">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {format(new Date(event.start_date), 'EEEE, MMMM d, yyyy')}
                {event.end_date && event.end_date !== event.start_date && (
                  <> to {format(new Date(event.end_date), 'EEEE, MMMM d, yyyy')}</>
                )}
              </span>
              {event.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {event.location}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Event Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Sections</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {eventSections.map(section => (
                  <Badge key={section.id} variant="outline">{section.display_name}</Badge>
                ))}
              </div>
            </div>
            {event.description && (
              <div>
                <p className="text-sm text-gray-600">Description</p>
                <p className="text-gray-900 whitespace-pre-wrap">{event.description}</p>
              </div>
            )}
            <div className="grid md:grid-cols-3 gap-4 pt-4 border-t">
              {event.cost > 0 && (
                <div>
                  <p className="text-sm text-gray-600">Cost</p>
                  <p className="font-medium">£{event.cost.toFixed(2)}</p>
                </div>
              )}
              {event.consent_deadline && (
                <div>
                  <p className="text-sm text-gray-600">Consent Deadline</p>
                  <p className="font-medium">{format(new Date(event.consent_deadline), 'MMM d, yyyy')}</p>
                </div>
              )}
              {event.payment_deadline && (
                <div>
                  <p className="text-sm text-gray-600">Payment Deadline</p>
                  <p className="font-medium">{format(new Date(event.payment_deadline), 'MMM d, yyyy')}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {scheduleByDay.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {scheduleByDay.map((day, dayIndex) => (
                <div key={dayIndex}>
                  <h3 className="font-semibold text-lg mb-3">{day.day_name}</h3>
                  <div className="space-y-2 ml-4">
                    {day.items.map((item, itemIndex) => (
                      <div key={itemIndex} className="flex gap-4 text-sm">
                        <span className="font-medium text-gray-700 w-20">{item.time}</span>
                        <div className="flex-1">
                          <p className="font-medium">{item.activity}</p>
                          {item.notes && <p className="text-gray-600 text-xs mt-1">{item.notes}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                  {dayIndex < scheduleByDay.length - 1 && <div className="border-t mt-4" />}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {documents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Documents & Kit Lists</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {documents.map((doc, idx) => (
                  <a
                    key={idx}
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <span className="font-medium">{doc.name}</span>
                    </div>
                    <Download className="w-4 h-4 text-gray-400" />
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {photos.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Event Photos</CardTitle>
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