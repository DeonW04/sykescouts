import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Tent, Trash2, Calendar, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';
import LeaderNav from '../components/leader/LeaderNav';

export default function NightsAwayTracking() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState('');
  const [formData, setFormData] = useState({
    nights_count: 1,
    start_date: '',
    end_date: '',
    location: '',
    notes: '',
    event_id: ''
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.filter({ active: true }),
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['nightsaway'],
    queryFn: () => base44.entities.NightsAwayLog.list('-created_date'),
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.filter({ type: 'Camp' }),
  });

  const NIGHTS_THRESHOLDS = [1, 2, 3, 4, 5, 10, 15, 20, 35, 50];

  const addLogMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      await base44.entities.NightsAwayLog.create({
        ...data,
        verified_by: user.email,
      });

      // Fetch fresh member data
      const freshMembers = await base44.entities.Member.filter({ id: data.member_id });
      const member = freshMembers[0];
      const previousTotal = member?.total_nights_away || 0;
      const newTotal = previousTotal + data.nights_count;

      await base44.entities.Member.update(data.member_id, { total_nights_away: newTotal });

      // Check if any thresholds newly crossed
      const [nightsAwayBadges, existingAwards] = await Promise.all([
        base44.entities.BadgeDefinition.filter({ badge_family_id: 'nights_away' }),
        base44.entities.MemberBadgeAward.filter({ member_id: data.member_id }),
      ]);
      const today = new Date().toISOString().split('T')[0];
      for (const threshold of NIGHTS_THRESHOLDS) {
        if (previousTotal < threshold && newTotal >= threshold) {
          const badge = nightsAwayBadges.find(b => b.stage_number === threshold);
          if (badge && !existingAwards.some(a => a.badge_id === badge.id)) {
            await base44.entities.MemberBadgeAward.create({
              member_id: data.member_id,
              badge_id: badge.id,
              completed_date: today,
              awarded_date: today,
              award_status: 'pending',
              notes: `Auto-awarded for reaching ${threshold} nights away`,
            });
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nightsaway'] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['awards'] });
      setShowDialog(false);
      setSelectedMember('');
      setFormData({
        nights_count: 1,
        start_date: '',
        end_date: '',
        location: '',
        notes: '',
        event_id: ''
      });
      toast.success('Nights away logged');
    },
  });

  const deleteLogMutation = useMutation({
    mutationFn: async (log) => {
      await base44.entities.NightsAwayLog.delete(log.id);

      // Update member's total nights
      const member = members.find(m => m.id === log.member_id);
      await base44.entities.Member.update(log.member_id, {
        total_nights_away: Math.max(0, (member?.total_nights_away || 0) - log.nights_count)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nightsaway'] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast.success('Log deleted');
    },
  });

  const getMemberById = (id) => members.find(m => m.id === id);
  const getEventById = (id) => events.find(e => e.id === id);

  return (
    <div className="min-h-screen bg-gray-50">
      <LeaderNav />
      <div className="bg-[#7413dc] text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('LeaderBadges'))}
            className="text-white hover:bg-white/10 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Tent className="w-8 h-8" />
                Nights Away Tracking
              </h1>
              <p className="mt-1 text-white/80">Log nights spent camping for staged badges</p>
            </div>
            <Button
              onClick={() => setShowDialog(true)}
              className="bg-white text-[#7413dc] hover:bg-gray-100"
            >
              <Plus className="w-4 h-4 mr-2" />
              Log Nights Away
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">Total Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{logs.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">Total Nights</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{logs.reduce((sum, log) => sum + log.nights_count, 0)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">Active Members</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{members.filter(m => m.total_nights_away > 0).length}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Nights</TableHead>
                  <TableHead>Total Nights</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const member = getMemberById(log.member_id);
                  const event = getEventById(log.event_id);
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{member?.full_name || 'Unknown'}</TableCell>
                      <TableCell>{log.nights_count}</TableCell>
                      <TableCell className="text-[#7413dc] font-semibold">
                        {member?.total_nights_away || 0}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {new Date(log.start_date).toLocaleDateString()}
                        {log.end_date && ` - ${new Date(log.end_date).toLocaleDateString()}`}
                      </TableCell>
                      <TableCell>{log.location}</TableCell>
                      <TableCell>{event?.title || '-'}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteLogMutation.mutate(log)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Log Nights Away</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Member</Label>
              <Select value={selectedMember} onValueChange={setSelectedMember}>
                <SelectTrigger>
                  <SelectValue placeholder="Select member..." />
                </SelectTrigger>
                <SelectContent>
                  {members.map(member => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.full_name} (Total: {member.total_nights_away || 0} nights)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Number of Nights</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.nights_count}
                  onChange={(e) => setFormData({ ...formData, nights_count: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div>
                <Label>Link to Event (Optional)</Label>
                <Select value={formData.event_id} onValueChange={(value) => setFormData({ ...formData, event_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="No event" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>No event</SelectItem>
                    {events.map(event => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div>
                <Label>End Date (Optional)</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Location</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., Hollingworth Lake Activity Centre"
              />
            </div>

            <div>
              <Label>Notes (Optional)</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional information..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button
              onClick={() => addLogMutation.mutate({ ...formData, member_id: selectedMember })}
              disabled={!selectedMember || !formData.start_date || !formData.location}
            >
              Log Nights Away
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}