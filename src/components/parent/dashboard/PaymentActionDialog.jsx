import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import InlinePayment from '@/components/mobile/InlinePayment';

// Popup shown from the "Actions Required" panel when a parent clicks "Pay Now" —
// lets them pay without leaving the dashboard, and offers a link to the full
// meeting/event page (which opens back up on the same item).
export default function PaymentActionDialog({ open, onOpenChange, entity, child, onPaid }) {
  const navigate = useNavigate();
  const [paying, setPaying] = useState(false);

  if (!entity) return null;
  const { kind, record } = entity;
  const dateValue = kind === 'meeting' ? record.date : record.start_date;

  const goToDetails = () => {
    onOpenChange(false);
    if (kind === 'meeting') {
      navigate(createPageUrl('ParentProgramme') + `?meetingId=${record.id}&pay=1`);
    } else {
      navigate(createPageUrl('ParentEventDetail') + `?id=${record.id}&pay=1`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setPaying(false); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{record.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-[#7413dc]" />{format(new Date(dateValue), 'EEEE, MMMM d, yyyy')}</div>
            {kind === 'event' && record.location && (
              <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-[#7413dc]" />{record.location}</div>
            )}
          </div>
          <p className="text-2xl font-bold text-[#7413dc]">£{record.cost?.toFixed(2)}</p>

          {!paying ? (
            <Button onClick={() => setPaying(true)} className="w-full bg-amber-500 hover:bg-amber-600 text-white">
              Pay £{record.cost?.toFixed(2)}
            </Button>
          ) : (
            <InlinePayment
              type={kind}
              id={record.id}
              cost={Math.round((record.cost || 0) * 100)}
              memberId={child?.id}
              paymentMethods={child?.stripe_payment_methods || []}
              onSuccess={onPaid}
              onCancel={() => setPaying(false)}
            />
          )}

          <Button variant="outline" onClick={goToDetails} className="w-full flex items-center justify-center gap-2">
            View {kind === 'meeting' ? 'in Programme' : 'Event Details'}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}