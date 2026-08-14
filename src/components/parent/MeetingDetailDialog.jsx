import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Clock, Share2, HandHeart, CheckCircle2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

// Full-detail popup for a single programme/meeting — description, badge work,
// actions required (read-only status), location/time overrides, payment, and
// a share button that produces a deep link back to this same dialog.
export default function MeetingDetailDialog({
  open, onOpenChange, programme, badgeGroups = [], volunteered,
  actionItems = [], timeText, locationText, renderPayment, onShare,
}) {
  if (!programme) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <DialogTitle className="text-2xl">{programme.title}</DialogTitle>
            <Button variant="outline" size="sm" onClick={onShare} className="flex-shrink-0">
              <Share2 className="w-4 h-4 mr-1.5" />Share
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-[#7413dc]" />{format(new Date(programme.date), 'EEEE, MMMM d, yyyy')}</div>
            {timeText && <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-[#7413dc]" />{timeText}</div>}
            {locationText && <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-[#7413dc]" />{locationText}</div>}
          </div>

          {volunteered && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-green-700 text-sm font-medium">
              <HandHeart className="w-4 h-4 flex-shrink-0" />You've volunteered to help at this meeting
            </div>
          )}

          {programme.description && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-1">Description</p>
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{programme.description}</p>
            </div>
          )}

          {badgeGroups.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Badge Work</p>
              <div className="space-y-3">
                {badgeGroups.map(({ badge, requirements }) => (
                  <div key={badge.id} className="flex items-start gap-3 bg-purple-50 rounded-xl p-3">
                    <img src={badge.image_url} alt={badge.name} className="w-10 h-10 rounded-lg object-contain flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-sm text-gray-800">{badge.name}</p>
                      {requirements.length > 0 && (
                        <ul className="mt-1 space-y-0.5">
                          {requirements.map(r => <li key={r.id} className="text-xs text-gray-600">• {r.text}</li>)}
                        </ul>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {actionItems.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Actions Required</p>
              <div className="space-y-2">
                {actionItems.map(({ action, answered, responseValue }) => (
                  <div key={action.id} className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl px-3 py-2">
                    <p className="text-sm text-gray-800">{action.action_text}</p>
                    {answered ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-green-700 flex-shrink-0"><CheckCircle2 className="w-3.5 h-3.5" />{responseValue}</span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-medium text-orange-600 flex-shrink-0"><AlertCircle className="w-3.5 h-3.5" />Pending</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {renderPayment && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Payment</p>
              {renderPayment(programme)}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}