import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Mail, Loader2, Search } from 'lucide-react';

export default function SendEmailDialog({ open, onClose, page }) {
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [sectionFilter, setSectionFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sending, setSending] = useState(false);

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      // Fetch all registered users first
      const registeredUsers = await base44.entities.User.filter({});
      const registeredEmails = new Set(registeredUsers.map(u => u.email.toLowerCase()));
      
      // Fetch parent emails from members (accessible to leaders)
      const members = await base44.entities.Member.filter({ active: true });
      const leaders = await base44.entities.Leader.filter({});
      const userMap = new Map();
      
      // Add parents (only if they have a User account)
      members.forEach(member => {
        if (member.parent_one_email && registeredEmails.has(member.parent_one_email.toLowerCase())) {
          if (!userMap.has(member.parent_one_email.toLowerCase())) {
            userMap.set(member.parent_one_email.toLowerCase(), {
              id: `parent_${member.parent_one_email}`,
              email: member.parent_one_email,
              full_name: member.parent_one_name || 'Parent',
              sections: [],
              isLeader: false,
            });
          }
          if (member.section_id && !userMap.get(member.parent_one_email.toLowerCase()).sections.includes(member.section_id)) {
            userMap.get(member.parent_one_email.toLowerCase()).sections.push(member.section_id);
          }
        }
        if (member.parent_two_email && registeredEmails.has(member.parent_two_email.toLowerCase())) {
          if (!userMap.has(member.parent_two_email.toLowerCase())) {
            userMap.set(member.parent_two_email.toLowerCase(), {
              id: `parent_${member.parent_two_email}`,
              email: member.parent_two_email,
              full_name: member.parent_two_name || 'Parent',
              sections: [],
              isLeader: false,
            });
          }
          if (member.section_id && !userMap.get(member.parent_two_email.toLowerCase()).sections.includes(member.section_id)) {
            userMap.get(member.parent_two_email.toLowerCase()).sections.push(member.section_id);
          }
        }
      });
      
      // Add leaders (only if they have a User account)
      for (const leader of leaders) {
        if (leader.user_id) {
          const leaderUser = registeredUsers.find(u => u.id === leader.user_id);
          if (leaderUser && !userMap.has(leaderUser.email.toLowerCase())) {
            userMap.set(leaderUser.email.toLowerCase(), {
              id: `leader_${leaderUser.email}`,
              email: leaderUser.email,
              full_name: leader.display_name || leaderUser.full_name || 'Leader',
              sections: leader.section_ids || [],
              isLeader: true,
            });
          }
        }
      }
      
      return Array.from(userMap.values());
    },
  });

  const { data: parents = [] } = useQuery({
    queryKey: ['parents'],
    queryFn: () => base44.entities.Parent.filter({}),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.filter({ active: true }),
  });

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => base44.entities.Section.filter({ active: true }),
  });

  // Users already have section info from the query
  const usersWithSections = allUsers;

  // Filter users
  const filteredUsers = usersWithSections.filter(user => {
    const matchesSection = sectionFilter === 'all' || user.sections.includes(sectionFilter);
    const matchesSearch = user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSection && matchesSearch;
  });

  const toggleUser = (userId) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const toggleAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
    }
  };

  const handleSend = async () => {
    if (selectedUsers.size === 0) {
      toast.error('Please select at least one user');
      return;
    }

    setSending(true);
    try {
      const selectedUserEmails = allUsers
        .filter(u => selectedUsers.has(u.id))
        .map(u => u.email);

      const shareUrl = `https://testsite.sykescouts.org/sharedpage?id=${page.page_id}`;
      
      // Send emails
      for (const email of selectedUserEmails) {
        await base44.integrations.Core.SendEmail({
          from_name: '40th Rochdale Scouts',
          to: email,
          subject: page.title,
          body: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; }
                .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
                .header { background: linear-gradient(135deg, #7413dc 0%, #004851 100%); padding: 40px 20px; text-align: center; }
                .logo { max-width: 240px; height: auto; }
                .content { padding: 40px 30px; }
                .title { color: #1a1a1a; font-size: 24px; font-weight: 600; margin: 0 0 20px 0; }
                .message { color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; }
                .button { display: inline-block; background: linear-gradient(135deg, #7413dc, #5c0fb0); color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 20px 0; }
                .footer { background-color: #f9fafb; padding: 30px; text-align: center; color: #6b7280; font-size: 14px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69540f3779bf32f5ccc6335b/e8eca937a_image.png" alt="40th Rochdale Scouts" class="logo">
                </div>
                <div class="content">
                  <h1 class="title">${page.title}</h1>
                  <p class="message">Hello,</p>
                  <p class="message">We have a new update for you from 40th Rochdale Scouts. Click the button below to view the full message.</p>
                  <center>
                    <a href="${shareUrl}" class="button">View Update</a>
                  </center>
                </div>
                <div class="footer">
                  <p>40th Rochdale (Syke) Scouts</p>
                  <p>This is an automated message. Please do not reply to this email.</p>
                </div>
              </div>
            </body>
            </html>
          `
        });
      }

      toast.success(`Email sent to ${selectedUsers.size} users`);
      onClose();
    } catch (error) {
      console.error('Error sending emails:', error);
      toast.error('Failed to send emails: ' + (error.message || 'Unknown error'));
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] sm:max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Send as Email</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={sectionFilter} onValueChange={setSectionFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by section" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sections</SelectItem>
                {sections.map(section => (
                  <SelectItem key={section.id} value={section.id}>
                    {section.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Select All */}
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <Checkbox
              checked={filteredUsers.length > 0 && selectedUsers.size === filteredUsers.length}
              onCheckedChange={toggleAll}
            />
            <span className="font-medium">
              Select All ({selectedUsers.size} of {filteredUsers.length} selected)
            </span>
          </div>

          {/* User List */}
          <div className="border rounded-lg max-h-[40vh] sm:max-h-96 overflow-y-auto">
            {filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Search className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>No users found</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredUsers.map(user => (
                  <div key={user.id} className="flex items-start gap-2 sm:gap-3 p-3 hover:bg-gray-50">
                    <Checkbox
                      checked={selectedUsers.has(user.id)}
                      onCheckedChange={() => toggleUser(user.id)}
                      className="mt-1 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate">{user.full_name}</p>
                        {user.isLeader && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded flex-shrink-0">
                            Leader
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 truncate">{user.email}</p>
                      {user.sections.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {user.sections.map(sectionId => {
                            const section = sections.find(s => s.id === sectionId);
                            return section ? (
                              <span key={sectionId} className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                {section.display_name || section.name}
                              </span>
                            ) : null;
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button 
            onClick={handleSend} 
            disabled={sending || selectedUsers.size === 0}
            className="bg-[#7413dc] hover:bg-[#5c0fb0]"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                Send to {selectedUsers.size} {selectedUsers.size === 1 ? 'user' : 'users'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}