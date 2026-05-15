import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, Plus, Users, Grid3x3, List, Pencil, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import FloatingNav from '../components/public/FloatingNav';
import NavBarSpacer from '../components/public/NavBarSpacer';
import { useSectionContext } from '../components/leader/SectionContext';

export default function LeaderMembers() {
  const { selectedSection } = useSectionContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [sending, setSending] = useState(false);
  const [viewMode, setViewMode] = useState('tile'); // 'tile' or 'patrol'
  const [inviteForm, setInviteForm] = useState({
    parent_one_name: '',
    parent_one_email: '',
    parent_one_phone: '',
    parent_two_name: '',
    parent_two_email: '',
    parent_two_phone: '',
    child_name: '',
    child_dob: '',
  });

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => base44.entities.Section.filter({ active: true }),
  });

  const { data: allMembers = [], isLoading, refetch: refetchMembers } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.filter({ active: true }),
  });

  const members = selectedSection 
    ? allMembers.filter(m => m.section_id === selectedSection)
    : allMembers;

  const calculateAge = (dob) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    if (months < 0) { years--; months += 12; }
    if (today.getDate() < birthDate.getDate()) { months--; if (months < 0) { years--; months += 12; } }
    return { years, months };
  };

  const filteredMembers = members
    .filter(member => member.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => new Date(a.date_of_birth).getTime() - new Date(b.date_of_birth).getTime());

  const handleSendInvite = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await base44.entities.Member.create({
        full_name: inviteForm.child_name,
        date_of_birth: inviteForm.child_dob,
        parent_one_name: inviteForm.parent_one_name,
        parent_one_email: inviteForm.parent_one_email,
        parent_one_phone: inviteForm.parent_one_phone,
        parent_two_name: inviteForm.parent_two_name,
        parent_two_email: inviteForm.parent_two_email,
        parent_two_phone: inviteForm.parent_two_phone,
        active: true,
        join_date: new Date().toISOString().split('T')[0],
      });
      toast.success('Member added successfully!');
      setShowInviteDialog(false);
      setInviteForm({ parent_one_name: '', parent_one_email: '', parent_one_phone: '', parent_two_name: '', parent_two_email: '', parent_two_phone: '', child_name: '', child_dob: '' });
      refetchMembers();
    } catch (error) {
      toast.error('Error adding member: ' + error.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <FloatingNav />
      <NavBarSpacer />
      <div style={{ background: '#ffffff', borderBottom: '1px solid rgba(116,19,220,0.1)', padding: '20px 24px' }}>
        <div className="max-w-7xl mx-auto flex justify-between items-center gap-4 flex-wrap">
          <div>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7413dc', margin: '0 0 4px' }}>Leader Portal</p>
            <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 'clamp(22px, 3vw, 32px)', color: '#1a1a2e', margin: '0 0 2px', lineHeight: 1.2 }}>Members</h1>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'rgba(26,26,46,0.45)', margin: 0 }}>{members.length} active members</p>
          </div>
          <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
            <DialogTrigger asChild>
              <Button className="bg-[#7413dc] hover:bg-[#5c0fb0] text-white">
                <Plus className="w-4 h-4 mr-2" />
                Add Member
              </Button>
            </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Member</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSendInvite} className="space-y-4 mt-4">
                  <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
                    <Label className="text-base font-semibold">Parent One</Label>
                    <div className="space-y-2">
                      <Label>Name *</Label>
                      <Input required value={inviteForm.parent_one_name} onChange={(e) => setInviteForm({ ...inviteForm, parent_one_name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Email *</Label>
                      <Input type="email" required value={inviteForm.parent_one_email} onChange={(e) => setInviteForm({ ...inviteForm, parent_one_email: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone *</Label>
                      <Input type="tel" required value={inviteForm.parent_one_phone} onChange={(e) => setInviteForm({ ...inviteForm, parent_one_phone: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
                    <Label className="text-base font-semibold">Parent Two (Optional)</Label>
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input value={inviteForm.parent_two_name} onChange={(e) => setInviteForm({ ...inviteForm, parent_two_name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input type="email" value={inviteForm.parent_two_email} onChange={(e) => setInviteForm({ ...inviteForm, parent_two_email: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input type="tel" value={inviteForm.parent_two_phone} onChange={(e) => setInviteForm({ ...inviteForm, parent_two_phone: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-3 p-3 bg-blue-50 rounded-lg border-t-2 border-blue-300">
                    <Label className="text-base font-semibold">Child Details</Label>
                    <div className="space-y-2">
                      <Label>Child Full Name *</Label>
                      <Input required value={inviteForm.child_name} onChange={(e) => setInviteForm({ ...inviteForm, child_name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Child's Date of Birth *</Label>
                      <Input id="child_dob" type="date" value={inviteForm.child_dob} onChange={(e) => setInviteForm({ ...inviteForm, child_dob: e.target.value })} required />
                    </div>
                  </div>
                  <Button type="submit" disabled={sending} className="w-full bg-[#7413dc] hover:bg-[#5c0fb0]">
                    {sending ? 'Adding Member...' : 'Add Member'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:gap-4 md:items-center">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input placeholder="Search members..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                </div>
              </div>
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                <button onClick={() => setViewMode('tile')} className={`p-2 rounded transition-colors ${viewMode === 'tile' ? 'bg-[#004851] text-white' : 'text-gray-500 hover:text-gray-700'}`} title="Tile view">
                  <Grid3x3 className="w-4 h-4" />
                </button>
                <button onClick={() => setViewMode('patrol')} className={`p-2 rounded transition-colors ${viewMode === 'patrol' ? 'bg-[#004851] text-white' : 'text-gray-500 hover:text-gray-700'}`} title="Patrol view">
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Members List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-[#004851] border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">Loading members...</p>
          </div>
        ) : filteredMembers.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No members found</h3>
              <p className="text-gray-600">{searchTerm ? 'Try adjusting your search' : 'Get started by adding your first member'}</p>
            </CardContent>
          </Card>
        ) : viewMode === 'tile' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMembers.map(member => {
              const age = calculateAge(member.date_of_birth);
              const section = sections.find(s => s.id === member.section_id);
              return (
                <Link key={member.id} to={createPageUrl(`MemberDetail?id=${member.id}`)}>
                  <Card className="hover:shadow-xl transition-all hover:-translate-y-1 h-full">
                    <CardContent className="p-6">
                      <div className="flex flex-col items-center text-center space-y-4">
                        <div className="w-20 h-20 bg-gradient-to-br from-[#004851] to-[#7413dc] rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                          {member.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-lg text-gray-900">{member.full_name}</p>
                          <p className="text-sm text-gray-500 mt-1">{section?.display_name || 'No section'}</p>
                        </div>
                        <div className="w-full space-y-2 pt-2 border-t">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Age:</span>
                            <span className="font-semibold text-gray-900">{age.years}y {age.months}m</span>
                          </div>
                          {member.patrol && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Patrol:</span>
                              <span className="font-semibold text-gray-900">{member.patrol}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <PatrolView members={filteredMembers} refetchMembers={refetchMembers} />
        )}
      </div>
    </div>
  );
}

// ─── Patrol View with Drag & Drop and Rename ──────────────────────────────────
function PatrolView({ members, refetchMembers }) {
  const queryClient = useQueryClient();

  const buildPatrols = (memberList) => {
    const p = {};
    memberList.forEach(m => {
      const patrol = m.patrol || 'No Patrol';
      if (!p[patrol]) p[patrol] = [];
      p[patrol].push(m);
    });
    return p;
  };

  const [patrols, setPatrols] = useState(() => buildPatrols(members));
  const [editingPatrol, setEditingPatrol] = useState(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    setPatrols(buildPatrols(members));
  }, [members]);

  const patrolNames = Object.keys(patrols).sort((a, b) => {
    if (a === 'No Patrol') return 1;
    if (b === 'No Patrol') return -1;
    return a.localeCompare(b);
  });

  const calculateAge = (dob) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    if (months < 0) { years--; months += 12; }
    if (today.getDate() < birthDate.getDate()) { months--; if (months < 0) { years--; months += 12; } }
    return { years, months };
  };

  const onDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination || source.droppableId === destination.droppableId) return;

    const fromPatrol = source.droppableId;
    const toPatrol = destination.droppableId;
    const memberId = draggableId;
    const newPatrolValue = toPatrol === 'No Patrol' ? '' : toPatrol;

    // Optimistic update
    setPatrols(prev => {
      const next = { ...prev };
      const member = next[fromPatrol].find(m => m.id === memberId);
      if (!member) return prev;
      next[fromPatrol] = next[fromPatrol].filter(m => m.id !== memberId);
      if (!next[toPatrol]) next[toPatrol] = [];
      const updated = { ...member, patrol: newPatrolValue };
      const insertAt = Math.min(destination.index, next[toPatrol].length);
      next[toPatrol] = [...next[toPatrol].slice(0, insertAt), updated, ...next[toPatrol].slice(insertAt)];
      if (next[fromPatrol].length === 0 && fromPatrol !== 'No Patrol') delete next[fromPatrol];
      return next;
    });

    try {
      await base44.entities.Member.update(memberId, { patrol: newPatrolValue });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast.success(`Moved to ${toPatrol}`);
    } catch (e) {
      toast.error('Failed to update patrol');
      refetchMembers();
    }
  };

  const startEdit = (name) => { setEditingPatrol(name); setEditValue(name); };
  const cancelEdit = () => { setEditingPatrol(null); setEditValue(''); };

  const saveRename = async (oldName) => {
    const newName = editValue.trim();
    if (!newName || newName === oldName) { cancelEdit(); return; }

    const membersToUpdate = patrols[oldName] || [];

    // Optimistic update
    setPatrols(prev => {
      const next = { ...prev };
      next[newName] = (next[oldName] || []).map(m => ({ ...m, patrol: newName }));
      delete next[oldName];
      return next;
    });
    cancelEdit();

    try {
      await Promise.all(membersToUpdate.map(m => base44.entities.Member.update(m.id, { patrol: newName })));
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast.success(`Patrol renamed to "${newName}"`);
    } catch (e) {
      toast.error('Failed to rename patrol');
      refetchMembers();
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        {patrolNames.map(patrolName => (
          <Card key={patrolName} className="flex flex-col">
            <CardHeader className="bg-gradient-to-br from-blue-500 to-[#004851] text-white pb-3 rounded-t-xl">
              {editingPatrol === patrolName ? (
                <div className="flex items-center gap-1">
                  <input
                    autoFocus
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveRename(patrolName); if (e.key === 'Escape') cancelEdit(); }}
                    className="flex-1 bg-white/20 text-white placeholder-white/60 border border-white/40 rounded px-2 py-1 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-white/50 min-w-0"
                  />
                  <button onClick={() => saveRename(patrolName)} className="p-1 hover:bg-white/20 rounded flex-shrink-0"><Check className="w-4 h-4" /></button>
                  <button onClick={cancelEdit} className="p-1 hover:bg-white/20 rounded flex-shrink-0"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base truncate">{patrolName}</CardTitle>
                  {patrolName !== 'No Patrol' && (
                    <button onClick={() => startEdit(patrolName)} className="p-1 hover:bg-white/20 rounded flex-shrink-0" title="Rename patrol">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
              <p className="text-xs text-white/70 mt-1">{(patrols[patrolName] || []).length} members</p>
            </CardHeader>

            <Droppable droppableId={patrolName}>
              {(provided, snapshot) => (
                <CardContent
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`p-0 divide-y flex-1 min-h-[60px] transition-colors rounded-b-xl ${snapshot.isDraggingOver ? 'bg-blue-50' : 'bg-white'}`}
                >
                  {(patrols[patrolName] || []).map((member, index) => {
                    const age = calculateAge(member.date_of_birth);
                    return (
                      <Draggable key={member.id} draggableId={member.id} index={index}>
                        {(dragProvided, dragSnapshot) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            className={`${dragSnapshot.isDragging ? 'shadow-lg rounded-lg bg-white opacity-90' : ''}`}
                          >
                            <Link
                              to={createPageUrl(`MemberDetail?id=${member.id}`)}
                              className="block p-4 hover:bg-gray-50 transition-colors"
                              onClick={e => { if (dragSnapshot.isDragging) e.preventDefault(); }}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-gradient-to-br from-blue-400 to-[#004851] rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                  {member.full_name?.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-sm text-gray-900 truncate">{member.full_name}</p>
                                  <p className="text-xs text-gray-500">Age {age.years}y {age.months}m</p>
                                </div>
                              </div>
                            </Link>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                  {(patrols[patrolName] || []).length === 0 && !snapshot.isDraggingOver && (
                    <p className="text-xs text-gray-400 text-center py-6 italic">Drop members here</p>
                  )}
                </CardContent>
              )}
            </Droppable>
          </Card>
        ))}
      </div>
    </DragDropContext>
  );
}