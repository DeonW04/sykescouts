import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Settings, Users, Shield, Mail, Edit, Image, Upload, X, Award, Download, Receipt } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import LeaderNav from '../components/leader/LeaderNav';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ReceiptManagement from '../components/admin/ReceiptManagement';

export default function AdminSettings() {
  const navigate = useNavigate();
  const [selectedUser, setSelectedUser] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editForm, setEditForm] = useState({ display_name: '', email: '', user_type: 'parent', section_ids: [] });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showGallerySelector, setShowGallerySelector] = useState(false);
  const [currentImagePage, setCurrentImagePage] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState(null);
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

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => base44.entities.Section.filter({ active: true }),
  });

  const { data: websiteImages = [] } = useQuery({
    queryKey: ['website-images'],
    queryFn: () => base44.entities.WebsiteImage.list(),
  });

  const { data: galleryPhotos = [] } = useQuery({
    queryKey: ['gallery-photos'],
    queryFn: () => base44.entities.EventPhoto.filter({}),
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events-for-gallery'],
    queryFn: () => base44.entities.Event.list('-start_date'),
  });

  const { data: programmes = [] } = useQuery({
    queryKey: ['programmes-for-gallery'],
    queryFn: () => base44.entities.Programme.list('-date'),
  });

  const [galleryView, setGalleryView] = useState('all');
  const [galleryFolder, setGalleryFolder] = useState(null);

  // Group gallery photos
  const galleryCamps = [...new Map(
    galleryPhotos
      .filter(p => p.event_id && events.find(e => e.id === p.event_id && e.type === 'Camp'))
      .map(p => [p.event_id, events.find(e => e.id === p.event_id)])
  ).values()].filter(Boolean).sort((a, b) => new Date(b.start_date) - new Date(a.start_date));

  const galleryEvents = [...new Map(
    galleryPhotos
      .filter(p => p.event_id && events.find(e => e.id === p.event_id && e.type !== 'Camp'))
      .map(p => [p.event_id, events.find(e => e.id === p.event_id)])
  ).values()].filter(Boolean).sort((a, b) => new Date(b.start_date) - new Date(a.start_date));

  const galleryMeetings = [...new Map(
    galleryPhotos
      .filter(p => p.programme_id)
      .map(p => [p.programme_id, programmes.find(pr => pr.id === p.programme_id)])
  ).values()].filter(Boolean).sort((a, b) => new Date(b.date) - new Date(a.date));

  const getGalleryDisplayPhotos = () => {
    if (galleryFolder) {
      return galleryPhotos.filter(p => 
        p.event_id === galleryFolder.id || 
        p.programme_id === galleryFolder.id
      );
    }
    return galleryPhotos;
  };

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
    const userType = getUserType(user.id);
    let typeValue = userType.type.toLowerCase();
    if (user.role === 'admin') {
      typeValue = 'admin';
    } else if (userType.type === 'Parent') {
      typeValue = 'parent';
    } else if (userType.type === 'Leader') {
      typeValue = 'leader';
    } else {
      typeValue = 'user';
    }
    const leaderRecord = leaders.find(l => l.user_id === user.id);
    setEditForm({
      display_name: user.display_name || user.full_name,
      email: user.email,
      user_type: typeValue,
      section_ids: leaderRecord?.section_ids || [],
    });
    setShowEditDialog(true);
  };

  const uploadImageMutation = useMutation({
    mutationFn: async ({ page, file, order }) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      return base44.entities.WebsiteImage.create({
        page,
        image_url: file_url,
        order: order || 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['website-images'] });
      toast.success('Image uploaded successfully');
    },
  });

  const deleteImageMutation = useMutation({
    mutationFn: (imageId) => base44.entities.WebsiteImage.delete(imageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['website-images'] });
      toast.success('Image deleted');
    },
  });

  const selectFromGalleryMutation = useMutation({
    mutationFn: async ({ page, imageUrl, order }) => {
      return base44.entities.WebsiteImage.create({
        page,
        image_url: imageUrl,
        order: order || 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['website-images'] });
      setShowGallerySelector(false);
      toast.success('Image added from gallery');
    },
  });

  const handleExportData = async () => {
    setExporting(true);
    try {
      const response = await base44.functions.invoke('exportAllData', {});
      
      // Response data is already a Uint8Array/ArrayBuffer for binary data
      const blob = new Blob([new Uint8Array(response.data)], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `scout-data-export-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
      toast.success('Data exported successfully');
    } catch (error) {
      toast.error('Export failed: ' + error.message);
    } finally {
      setExporting(false);
    }
  };

  const handleFileUpload = async (page, file, order) => {
    setUploadingImage(true);
    try {
      await uploadImageMutation.mutateAsync({ page, file, order });
    } finally {
      setUploadingImage(false);
    }
  };

  const getImagesForPage = (page) => {
    return websiteImages.filter(img => img.page === page).sort((a, b) => (a.order || 0) - (b.order || 0));
  };

  const handleSaveUser = async () => {
    try {
      // Update user info and role
      const role = (editForm.user_type === 'admin') ? 'admin' : 'user';

      const response = await base44.functions.invoke('updateUser', {
        userId: selectedUser.id,
        display_name: editForm.display_name,
        role: role,
      });

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      const currentType = getUserType(selectedUser.id).type.toLowerCase();
      const leaderRecord = leaders.find(l => l.user_id === selectedUser.id);

      if (editForm.user_type === 'leader') {
        // Handle becoming a leader
        if (currentType !== 'leader') {
          await base44.entities.Leader.create({
            user_id: selectedUser.id,
            phone: '',
            display_name: editForm.display_name,
            section_ids: editForm.section_ids,
          });
        } else if (leaderRecord) {
          await base44.entities.Leader.update(leaderRecord.id, {
            display_name: editForm.display_name,
            section_ids: editForm.section_ids,
          });
        }
      } else {
        // Handle changing from leader to parent or other role
        if (leaderRecord) {
          await base44.entities.Leader.delete(leaderRecord.id);
        }
      }

      // Refresh data
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['all-users'] }),
        queryClient.invalidateQueries({ queryKey: ['all-leaders'] }),
        queryClient.invalidateQueries({ queryKey: ['all-parents'] }),
      ]);

      setShowEditDialog(false);
      toast.success('User updated successfully');
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Error updating user: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <LeaderNav />
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
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="bg-white border">
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="images">Website Images</TabsTrigger>
            <TabsTrigger value="badges">Badge System</TabsTrigger>
            <TabsTrigger value="receipts">Receipts</TabsTrigger>
            <TabsTrigger value="export">Data</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
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
                <div className="grid grid-cols-4 gap-4 px-4 py-2 bg-gray-50 rounded-lg font-semibold text-sm text-gray-700">
                  <div>Display Name</div>
                  <div>Email</div>
                  <div>Type</div>
                  <div className="text-right">Actions</div>
                </div>
                {users.map(user => {
                  const userType = getUserType(user.id);
                  const isLeader = leaders.some(l => l.user_id === user.id);
                  
                  return (
                    <div key={user.id} className="grid grid-cols-4 gap-4 px-4 py-3 bg-white border rounded-lg items-center">
                      <div className="font-medium">{user.display_name || user.full_name}</div>
                      <div className="text-sm text-gray-600">{user.email}</div>
                      <div>
                        <Badge className={userType.color}>
                          {user.role === 'admin' ? 'Admin' : userType.type}
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
          </TabsContent>

          <TabsContent value="images">
            <div className="space-y-6">
              {/* Home Page Images */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Image className="w-5 h-5" />
                    Home Page Images
                  </CardTitle>
                  <p className="text-sm text-gray-600">Upload multiple images for the home page carousel</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {getImagesForPage('home').map((img) => (
                      <div key={img.id} className="relative group">
                        <img src={img.image_url} alt="Home" className="w-full h-48 object-cover rounded-lg" />
                        <button
                          onClick={() => deleteImageMutation.mutate(img.id)}
                          className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={uploadingImage}
                      onClick={() => document.getElementById('home-upload').click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload New
                    </Button>
                    <input
                      id="home-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const order = getImagesForPage('home').length;
                          handleFileUpload('home', file, order);
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCurrentImagePage('home');
                        setShowGallerySelector(true);
                      }}
                    >
                      <Image className="w-4 h-4 mr-2" />
                      Select from Gallery
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* About Us Image */}
              <Card>
                <CardHeader>
                  <CardTitle>About Us Image</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {getImagesForPage('about')[0] && (
                    <div className="relative group w-fit">
                      <img src={getImagesForPage('about')[0].image_url} alt="About" className="w-full max-w-md h-64 object-cover rounded-lg" />
                      <button
                        onClick={() => deleteImageMutation.mutate(getImagesForPage('about')[0].id)}
                        className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={uploadingImage}
                      onClick={() => document.getElementById('about-upload').click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {getImagesForPage('about').length > 0 ? 'Replace' : 'Upload'}
                    </Button>
                    <input
                      id="about-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) handleFileUpload('about', file, 0);
                      }}
                    />
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCurrentImagePage('about');
                        setShowGallerySelector(true);
                      }}
                    >
                      <Image className="w-4 h-4 mr-2" />
                      Select from Gallery
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Section Images */}
              {['beavers', 'cubs', 'scouts'].map((section) => (
                <Card key={section}>
                  <CardHeader>
                    <CardTitle className="capitalize">{section} Image</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {getImagesForPage(section)[0] && (
                      <div className="relative group w-fit">
                        <img src={getImagesForPage(section)[0].image_url} alt={section} className="w-full max-w-md h-64 object-cover rounded-lg" />
                        <button
                          onClick={() => deleteImageMutation.mutate(getImagesForPage(section)[0].id)}
                          className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={uploadingImage}
                        onClick={() => document.getElementById(`${section}-upload`).click()}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {getImagesForPage(section).length > 0 ? 'Replace' : 'Upload'}
                      </Button>
                      <input
                        id={`${section}-upload`}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) handleFileUpload(section, file, 0);
                        }}
                      />
                      <Button
                        variant="outline"
                        onClick={() => {
                          setCurrentImagePage(section);
                          setShowGallerySelector(true);
                        }}
                      >
                        <Image className="w-4 h-4 mr-2" />
                        Select from Gallery
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="badges">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Badge System Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600">Manage the badge structure and definitions for your sections.</p>
                <Button
                  onClick={() => navigate(createPageUrl('ManageBadges'))}
                  className="bg-[#7413dc] hover:bg-[#5c0fb0]"
                >
                  <Award className="w-4 h-4 mr-2" />
                  Manage Badges
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="receipts">
            <ReceiptManagement />
          </TabsContent>

          <TabsContent value="export">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    Import Members
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-600">
                    Import member data from a CSV file. Download the template to see the required format.
                  </p>
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800">
                      <strong>Important:</strong> Make sure your CSV matches the template format. 
                      For section_id, use the actual section ID from your system.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        const template = 'first_name,surname,preferred_name,date_of_birth,gender,section_id,patrol,parent_one_first_name,parent_one_surname,parent_one_email,parent_one_phone,parent_two_first_name,parent_two_surname,parent_two_email,parent_two_phone,address,doctors_surgery,doctors_surgery_address,doctors_phone,medical_info,allergies,dietary_requirements,medications,emergency_contact_name,emergency_contact_phone,emergency_contact_relationship,photo_consent,invested,active,join_date,scouting_start_date,notes\n';
                        const blob = new Blob([template], { type: 'text/csv' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'member-import-template.csv';
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        a.remove();
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download CSV Template
                    </Button>
                    
                    <div className="flex items-center gap-3">
                      <input
                        id="csv-upload"
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={(e) => setImportFile(e.target.files[0])}
                      />
                      <Button
                        variant="outline"
                        onClick={() => document.getElementById('csv-upload').click()}
                      >
                        {importFile ? 'Change File' : 'Select CSV File'}
                      </Button>
                      {importFile && (
                        <span className="text-sm text-gray-600">{importFile.name}</span>
                      )}
                    </div>

                    {importFile && (
                      <Button
                        onClick={async () => {
                          setImporting(true);
                          try {
                            const response = await base44.functions.invoke('importMembers', { file: importFile });
                            if (response.data.success) {
                              toast.success(`Successfully imported ${response.data.imported} members. ${response.data.failed} failed.`);
                              setImportFile(null);
                              queryClient.invalidateQueries({ queryKey: ['members'] });
                            } else {
                              toast.error('Import failed: ' + response.data.error);
                            }
                          } catch (error) {
                            toast.error('Import failed: ' + error.message);
                          } finally {
                            setImporting(false);
                          }
                        }}
                        disabled={importing}
                        className="bg-[#7413dc] hover:bg-[#5c0fb0]"
                      >
                        {importing ? (
                          <>
                            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                            Importing...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            Import Members
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="w-5 h-5" />
                    Data Export
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-600">
                    Export all your group's data including members, events, badges, and more. 
                    Data will be downloaded as a ZIP file containing both JSON and CSV formats.
                  </p>
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Export includes:</strong> Members, Leaders, Sections, Events, Attendance, 
                      Badges, Badge Progress, Programme, Payments, and all other system data.
                    </p>
                  </div>
                  <Button
                    onClick={handleExportData}
                    disabled={exporting}
                    className="bg-[#004851] hover:bg-[#003840]"
                  >
                    {exporting ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Export All Data
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-orange-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-800">
                    <Users className="w-5 h-5" />
                    Archived Members
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-600">
                    View and manage members who have been archived. Archived members are hidden from the main list but their data is preserved.
                  </p>
                  <Button
                    onClick={() => navigate(createPageUrl('ArchivedMembers'))}
                    variant="outline"
                    className="border-orange-300 text-orange-600 hover:bg-orange-50"
                  >
                    View Archived Members
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="edit_display_name">Display Name</Label>
              <Input
                id="edit_display_name"
                value={editForm.display_name}
                onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_email">Email Address</Label>
              <Input
                id="edit_email"
                type="email"
                value={editForm.email}
                disabled
                className="bg-gray-100"
              />
              <p className="text-xs text-gray-500">Email cannot be changed</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="user_type">User Type</Label>
              <Select
                value={editForm.user_type}
                onValueChange={(value) => setEditForm({ ...editForm, user_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="leader">Leader</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editForm.user_type === 'leader' && (
              <div className="space-y-3 p-4 bg-gray-50 rounded-lg border">
                <Label>Assigned Sections</Label>
                <div className="space-y-2">
                  {sections.map(section => (
                    <div key={section.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`section-${section.id}`}
                        checked={editForm.section_ids.includes(section.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setEditForm({
                              ...editForm,
                              section_ids: [...editForm.section_ids, section.id]
                            });
                          } else {
                            setEditForm({
                              ...editForm,
                              section_ids: editForm.section_ids.filter(id => id !== section.id)
                            });
                          }
                        }}
                      />
                      <Label htmlFor={`section-${section.id}`} className="cursor-pointer">
                        {section.display_name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              onClick={handleSaveUser}
              className="w-full"
            >
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Gallery Selector Dialog */}
      <Dialog open={showGallerySelector} onOpenChange={(open) => {
        setShowGallerySelector(open);
        if (!open) {
          setGalleryFolder(null);
          setGalleryView('all');
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select from Gallery</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {!galleryFolder ? (
              // Show folders
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={galleryView === 'camps' ? 'default' : 'outline'}
                    onClick={() => setGalleryView('camps')}
                  >
                    Camps ({galleryCamps.length})
                  </Button>
                  <Button
                    size="sm"
                    variant={galleryView === 'events' ? 'default' : 'outline'}
                    onClick={() => setGalleryView('events')}
                  >
                    Events ({galleryEvents.length})
                  </Button>
                  <Button
                    size="sm"
                    variant={galleryView === 'meetings' ? 'default' : 'outline'}
                    onClick={() => setGalleryView('meetings')}
                  >
                    Meetings ({galleryMeetings.length})
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                  {galleryView === 'camps' && galleryCamps.map(camp => (
                    <div
                      key={camp.id}
                      onClick={() => setGalleryFolder(camp)}
                      className="cursor-pointer border rounded-lg p-3 hover:bg-gray-50"
                    >
                      <p className="font-medium">{camp.title}</p>
                      <p className="text-sm text-gray-500">
                        {galleryPhotos.filter(p => p.event_id === camp.id).length} photos
                      </p>
                    </div>
                  ))}
                  {galleryView === 'events' && galleryEvents.map(event => (
                    <div
                      key={event.id}
                      onClick={() => setGalleryFolder(event)}
                      className="cursor-pointer border rounded-lg p-3 hover:bg-gray-50"
                    >
                      <p className="font-medium">{event.title}</p>
                      <p className="text-sm text-gray-500">
                        {galleryPhotos.filter(p => p.event_id === event.id).length} photos
                      </p>
                    </div>
                  ))}
                  {galleryView === 'meetings' && galleryMeetings.map(meeting => (
                    <div
                      key={meeting.id}
                      onClick={() => setGalleryFolder(meeting)}
                      className="cursor-pointer border rounded-lg p-3 hover:bg-gray-50"
                    >
                      <p className="font-medium">{meeting.title}</p>
                      <p className="text-sm text-gray-500">
                        {galleryPhotos.filter(p => p.programme_id === meeting.id).length} photos
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              // Show photos in selected folder
              <div className="space-y-4">
                <Button size="sm" variant="outline" onClick={() => setGalleryFolder(null)}>
                  ← Back to folders
                </Button>
                <div className="grid grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                  {getGalleryDisplayPhotos().map((photo) => (
                    <div
                      key={photo.id}
                      className="relative group cursor-pointer"
                      onClick={() => {
                        const order = currentImagePage === 'home' ? getImagesForPage('home').length : 0;
                        selectFromGalleryMutation.mutate({
                          page: currentImagePage,
                          imageUrl: photo.file_url,
                          order,
                        });
                      }}
                    >
                      <img
                        src={photo.file_url}
                        alt=""
                        className="w-full h-40 object-cover rounded-lg group-hover:opacity-75 transition-opacity"
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="bg-white rounded-full p-3">
                          <Image className="w-6 h-6 text-[#7413dc]" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}