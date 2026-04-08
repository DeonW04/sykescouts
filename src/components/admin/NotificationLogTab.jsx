import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Bell, Mail, Search } from 'lucide-react';
import { format } from 'date-fns';

export default function NotificationLogTab() {
  const [search, setSearch] = useState('');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['notification-logs'],
    queryFn: () => base44.entities.NotificationLog.list('-sent_at', 200),
  });

  const filtered = logs.filter(log => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      log.recipient_email?.toLowerCase().includes(s) ||
      log.recipient_name?.toLowerCase().includes(s) ||
      log.member_name?.toLowerCase().includes(s) ||
      log.entity_name?.toLowerCase().includes(s)
    );
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Notification Log
        </CardTitle>
        <p className="text-sm text-gray-500">Every notification sent from the system</p>
      </CardHeader>
      <CardContent>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by name, email or event..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No notifications logged yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-5 gap-3 px-3 py-2 bg-gray-50 rounded text-xs font-semibold text-gray-600">
              <div>Recipient</div>
              <div>Email</div>
              <div>Type</div>
              <div>Subject / Member</div>
              <div>Sent</div>
            </div>
            {filtered.map(log => (
              <div key={log.id} className="grid grid-cols-5 gap-3 px-3 py-3 border rounded-lg text-sm items-center hover:bg-gray-50">
                <div className="font-medium truncate">{log.recipient_name || '—'}</div>
                <div className="text-gray-600 truncate text-xs">{log.recipient_email}</div>
                <div>
                  {log.notification_type === 'email' ? (
                    <Badge className="bg-blue-100 text-blue-700 text-xs">
                      <Mail className="w-3 h-3 mr-1" />Email
                    </Badge>
                  ) : (
                    <Badge className="bg-purple-100 text-purple-700 text-xs">
                      <Bell className="w-3 h-3 mr-1" />Push
                    </Badge>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-700 font-medium truncate">{log.member_name || log.entity_name || '—'}</p>
                  <p className="text-xs text-gray-400 truncate">{log.subject}</p>
                </div>
                <div className="text-xs text-gray-500">
                  {log.sent_at ? format(new Date(log.sent_at), 'dd MMM yy HH:mm') : '—'}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}