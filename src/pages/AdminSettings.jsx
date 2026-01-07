import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Settings, Users, Shield, Mail, Edit } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminSettings() {
  const [selectedUser, setSelectedUser] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: '', email: '' });
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: leaders = [] } = useQuery({
    queryKey: ['all-leaders'],
    queryFn: () => base44.entities.Leader.filter({}),
  });

  const { data: parents = [] } = useQuery({
    queryKey: ['all-parents'],
    queryFn: () => base44.entities.Parent.filter({}),
  });

  const promoteToLeaderMutation = useMutation({
    mutationFn: async (userId) => {
      const existing = leaders.find(l => l.user_id === userId);
      if (existing) {
        throw new Error('User is already a leader');
      }
      return base44.entities.Leader.create({
        user_id: userId,
        phone: '',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-leaders'] });
      toast.success('User promoted to leader successfully');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data }) => {
      return base44.entities.User.update(userId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      setShowEditDialog(false);
      toast.success('User updated successfully');
    },
    onError: (error) => {
      toast.error('Error updating user: ' + error.message);
    },
  });

  const sendPasswordResetMutation = useMutation({
    mutationFn: async (email) => {
      // Note: Base44 doesn't have a built-in password reset API yet
      // This is a placeholder - you'll need to implement this with a backend function
      await base44.integrations.Core.SendEmail({
        to: email,
        subject: 'Password Reset Request',
        body: `You have requested a password reset. Please use the following link to reset your password: [Reset Link - To be implemented]`,
      });
    },
    onSuccess: () => {
      toast.success('Password reset email sent');
    },
    onError: (error) => {
      toast.error('Error sending email: ' + error.message);
    },
  });

  const getUserType = (userId) => {
    const isLeader = leaders.some(l => l.user_id === userId);
    const isParent = parents.some(p => p.user_id === userId);
    
    if (isLeader) return { type: 'Leader', color: 'bg-blue-100 text-blue-800' };
    if (isParent) return { type: 'Parent', color: 'bg-green-100 text-green-800' };
    return { type: 'User', color: 'bg-gray-100 text-gray-800' };
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setEditForm({
      full_name: user.full_name,
      email: user.email,
    });
    setShowEditDialog(true);
  };

  const handleSaveUser = () => {
    updateUserMutation.mutate({
      userId: selectedUser.id,
      data: editForm,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#004851] text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Settings className="w-8 h-8" />
            <div>
              <h1 className="text-3xl font-bold">Admin Settings</h1>
              <p className="mt-1 text-white/80">Manage system configuration and users</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              User Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-[#004851] border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-gray-600">Loading users...</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-5 gap-4 px-4 py-2 bg-gray-50 rounded-lg font-semibold text-sm text-gray-700">
                  <div>Name</div>
                  <div>Email</div>
                  <div>Role</div>
                  <div>Type</div>
                  <div className="text-right">Actions</div>
                </div>
                {users.map(user => {
                  const userType = getUserType(user.id);
                  const isLeader = leaders.some(l => l.user_id === user.id);
                  
                  return (
                    <div key={user.id} className="grid grid-cols-5 gap-4 px-4 py-3 bg-white border rounded-lg items-center">
                      <div className="font-medium">{user.full_name}</div>
                      <div className="text-sm text-gray-600">{user.email}</div>
                      <div>
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                          {user.role}
                        </Badge>
                      </div>
                      <div>
                        <Badge className={userType.color}>
                          {userType.type}
                        </Badge>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditUser(user)}
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                        {!isLeader && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => promoteToLeaderMutation.mutate(user.id)}
                            disabled={promoteToLeaderMutation.isPending}
                          >
                            <Shield className="w-3 h-3 mr-1" />
                            Make Leader
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => sendPasswordResetMutation.mutate(user.email)}
                          disabled={sendPasswordResetMutation.isPending}
                        >
                          <Mail className="w-3 h-3 mr-1" />
                          Reset Password
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="edit_full_name">Full Name</Label>
              <Input
                id="edit_full_name"
                value={editForm.full_name}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_email">Email Address</Label>
              <Input
                id="edit_email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </div>
            <Button
              onClick={handleSaveUser}
              disabled={updateUserMutation.isPending}
              className="w-full"
            >
              {updateUserMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}