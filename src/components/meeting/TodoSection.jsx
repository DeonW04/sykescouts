import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function TodoSection({ programmeId, entityType = 'programme' }) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    task: '',
    assigned_to: '',
    due_date: '',
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['todo-tasks', programmeId, entityType],
    queryFn: async () => {
      const all = await base44.entities.TodoTask.list();
      return all.filter(task => 
        entityType === 'event' ? task.event_id === programmeId : task.programme_id === programmeId
      );
    },
    enabled: !!programmeId,
  });

  const { data: leaders = [] } = useQuery({
    queryKey: ['leaders'],
    queryFn: () => base44.entities.Leader.filter({}),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const createTaskMutation = useMutation({
    mutationFn: (data) => {
      const taskData = entityType === 'event' 
        ? { ...data, event_id: programmeId }
        : { ...data, programme_id: programmeId };
      return base44.entities.TodoTask.create(taskData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todo-tasks'] });
      setShowDialog(false);
      setFormData({ task: '', assigned_to: '', due_date: '' });
      toast.success('Task added');
    },
  });

  const toggleTaskMutation = useMutation({
    mutationFn: ({ id, completed }) => base44.entities.TodoTask.update(id, { completed }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todo-tasks'] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id) => base44.entities.TodoTask.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todo-tasks'] });
      toast.success('Task deleted');
    },
  });

  const getLeaderName = (userId) => {
    const leader = leaders.find(l => l.user_id === userId);
    if (leader?.display_name) return leader.display_name;
    const user = users.find(u => u.id === userId);
    return user?.full_name || 'Unknown';
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>To Do List</CardTitle>
            <Button onClick={() => setShowDialog(true)} size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Add Task
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No tasks yet</p>
          ) : (
            <div className="space-y-2">
              {tasks.map(task => (
                <div key={task.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  <Checkbox
                    checked={task.completed}
                    onCheckedChange={(checked) => toggleTaskMutation.mutate({ id: task.id, completed: checked })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <p className={`font-medium ${task.completed ? 'line-through text-gray-500' : ''}`}>
                      {task.task}
                    </p>
                    <div className="flex gap-4 mt-2 text-sm text-gray-500">
                      {task.assigned_to && (
                        <span>👤 {getLeaderName(task.assigned_to)}</span>
                      )}
                      {task.due_date && (
                        <span>📅 {new Date(task.due_date).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteTaskMutation.mutate(task.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Task *</Label>
              <Textarea
                value={formData.task}
                onChange={(e) => setFormData({ ...formData, task: e.target.value })}
                placeholder="Task description"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Assigned To</Label>
              <Select
                value={formData.assigned_to}
                onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select leader" />
                </SelectTrigger>
                <SelectContent>
                  {leaders.map(leader => {
                    const displayName = leader.display_name || users.find(u => u.id === leader.user_id)?.full_name;
                    return (
                      <SelectItem key={leader.user_id} value={leader.user_id}>
                        {displayName}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
            <Button
              onClick={() => createTaskMutation.mutate(formData)}
              disabled={!formData.task || createTaskMutation.isPending}
              className="w-full"
            >
              Add Task
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}