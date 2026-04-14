import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Users } from 'lucide-react';

export default function SectionSettingsTab({ sections, leaders, queryClient }) {
  const [saving, setSaving] = useState({});

  const handleSetTeamLeader = async (sectionId, leaderId) => {
    setSaving(s => ({ ...s, [sectionId]: true }));
    try {
      await base44.entities.Section.update(sectionId, {
        team_leader_id: leaderId === '__none__' ? null : leaderId,
      });
      queryClient.invalidateQueries({ queryKey: ['sections'] });
      toast.success('Team leader updated');
    } catch (e) {
      toast.error('Failed: ' + e.message);
    } finally {
      setSaving(s => ({ ...s, [sectionId]: false }));
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Section Settings
          </CardTitle>
          <p className="text-sm text-gray-500">Set the Team Leader for each section. Team leaders receive section-level notifications and have access to section accounting.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {sections.length === 0 && <p className="text-sm text-gray-400">No active sections found.</p>}
          {sections.map(section => {
            const sectionLeaders = leaders.filter(l => l.section_ids?.includes(section.id));
            return (
              <div key={section.id} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                <div>
                  <p className="font-semibold">{section.display_name}</p>
                  <p className="text-xs text-gray-500 capitalize">{section.name} · {sectionLeaders.length} leader{sectionLeaders.length !== 1 ? 's' : ''} assigned</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs text-gray-500 mr-1">Team Leader:</div>
                  <Select
                    value={section.team_leader_id || '__none__'}
                    onValueChange={(val) => handleSetTeamLeader(section.id, val)}
                    disabled={saving[section.id]}
                  >
                    <SelectTrigger className="w-52">
                      <SelectValue placeholder="Select leader..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {sectionLeaders.map(l => (
                        <SelectItem key={l.id} value={l.id}>{l.display_name}</SelectItem>
                      ))}
                      {sectionLeaders.length === 0 && (
                        <SelectItem value="__no_leaders__" disabled>No leaders assigned to this section</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {saving[section.id] && <span className="text-xs text-gray-400">Saving...</span>}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}