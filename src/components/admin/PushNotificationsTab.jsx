import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Trash2, Send, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function PushNotificationsTab() {
  const queryClient = useQueryClient();
  const [testing, setTesting] = useState(null); // subscriptionId or 'all'
  const [deleting, setDeleting] = useState(null);

  const { data: subscriptions = [], isLoading, refetch } = useQuery({
    queryKey: ['push-subscriptions'],
    queryFn: () => base44.entities.PushSubscription.filter({}),
  });

  const handleTest = async (subscriptionId) => {
    setTesting(subscriptionId || 'all');
    try {
      const res = await base44.functions.invoke('sendTestPush', { subscriptionId: subscriptionId || null });
      const { sent, failed, results } = res.data;
      if (sent > 0) {
        toast.success(`Test sent to ${sent} device(s)${failed > 0 ? `, ${failed} failed` : ''}`);
      } else {
        toast.error(`All ${failed} notification(s) failed — check console for details`);
        console.log('Push test results:', results);
      }
    } catch (err) {
      toast.error('Test failed: ' + err.message);
    } finally {
      setTesting(null);
    }
  };

  const handleDelete = async (subId) => {
    setDeleting(subId);
    try {
      await base44.entities.PushSubscription.delete(subId);
      queryClient.invalidateQueries({ queryKey: ['push-subscriptions'] });
      toast.success('Subscription removed');
    } catch (err) {
      toast.error('Failed to remove: ' + err.message);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Registered Devices ({subscriptions.length})
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4 mr-1" />
                Refresh
              </Button>
              <Button
                size="sm"
                className="bg-[#7413dc] hover:bg-[#5c0fb0] text-white"
                onClick={() => handleTest(null)}
                disabled={testing === 'all' || subscriptions.length === 0}
              >
                <Send className="w-4 h-4 mr-1" />
                {testing === 'all' ? 'Sending...' : `Test All (${subscriptions.length})`}
              </Button>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Devices that have registered for push notifications. Each row represents one browser/device session.
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-6 h-6 border-4 border-[#7413dc] border-t-transparent rounded-full mx-auto" />
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-gray-600">No registered devices</p>
              <p className="text-sm mt-1">Parents will appear here once they allow notifications in the app.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 bg-gray-50 rounded-lg text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <div className="col-span-4">Account</div>
                <div className="col-span-3">Registered</div>
                <div className="col-span-3">Endpoint</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>
              {subscriptions.map(sub => (
                <div key={sub.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-4 py-3 border rounded-lg bg-white items-center">
                  <div className="md:col-span-4">
                    <p className="font-medium text-sm">{sub.user_email || '—'}</p>
                    <p className="text-xs text-gray-400 font-mono">{sub.user_id?.slice(0, 12)}…</p>
                  </div>
                  <div className="md:col-span-3">
                    <p className="text-sm text-gray-600">
                      {sub.created_date ? format(new Date(sub.created_date), 'd MMM yyyy HH:mm') : '—'}
                    </p>
                  </div>
                  <div className="md:col-span-3">
                    {sub.subscription?.endpoint ? (
                      <Badge variant="outline" className="text-xs text-green-700 border-green-300 bg-green-50">
                        {new URL(sub.subscription.endpoint).hostname.replace('fcm.googleapis.com', 'Chrome/Android').replace('updates.push.services.mozilla.com', 'Firefox').replace('web.push.apple.com', 'Safari/iOS')}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-red-600 border-red-200">No endpoint</Badge>
                    )}
                  </div>
                  <div className="md:col-span-2 flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTest(sub.id)}
                      disabled={testing === sub.id || !sub.subscription?.endpoint}
                      title="Send test notification to this device"
                    >
                      {testing === sub.id ? (
                        <div className="animate-spin w-3 h-3 border-2 border-current border-t-transparent rounded-full" />
                      ) : (
                        <Send className="w-3 h-3" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(sub.id)}
                      disabled={deleting === sub.id}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      title="Remove subscription"
                    >
                      {deleting === sub.id ? (
                        <div className="animate-spin w-3 h-3 border-2 border-current border-t-transparent rounded-full" />
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-4">
          <p className="text-sm text-amber-800">
            <strong>Troubleshooting:</strong> If a device is missing, the parent needs to open the app (PWA) — it will auto-register.
            If a test fails with a 410 error, the subscription is stale and will be automatically removed.
            Each device/browser registers separately.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}