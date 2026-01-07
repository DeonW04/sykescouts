import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function EditMemberDialog({ member, open, onOpenChange, onSave }) {
  const [formData, setFormData] = useState({
    full_name: member?.full_name || '',
    preferred_name: member?.preferred_name || '',
    date_of_birth: member?.date_of_birth || '',
    patrol: member?.patrol || '',
    address: member?.address || '',
    medical_info: member?.medical_info || '',
    allergies: member?.allergies || '',
    dietary_requirements: member?.dietary_requirements || '',
    medications: member?.medications || '',
    emergency_contact_name: member?.emergency_contact_name || '',
    emergency_contact_phone: member?.emergency_contact_phone || '',
    emergency_contact_relationship: member?.emergency_contact_relationship || '',
    photo_consent: member?.photo_consent || false,
    notes: member?.notes || '',
  });

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Member Details</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="personal">Personal</TabsTrigger>
            <TabsTrigger value="medical">Medical</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="space-y-4 mt-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Preferred Name</Label>
                <Input
                  value={formData.preferred_name}
                  onChange={(e) => setFormData({ ...formData, preferred_name: e.target.value })}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Patrol/Six</Label>
                <Input
                  value={formData.patrol}
                  onChange={(e) => setFormData({ ...formData, patrol: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Address</Label>
              <Textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="min-h-[80px]"
              />
            </div>

            <div className="space-y-4">
              <Label className="text-base font-semibold">Emergency Contact</Label>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={formData.emergency_contact_name}
                    onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={formData.emergency_contact_phone}
                    onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Relationship</Label>
                <Input
                  value={formData.emergency_contact_relationship}
                  onChange={(e) => setFormData({ ...formData, emergency_contact_relationship: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="photo_consent"
                checked={formData.photo_consent}
                onCheckedChange={(checked) => setFormData({ ...formData, photo_consent: checked })}
              />
              <Label htmlFor="photo_consent" className="cursor-pointer">Photo consent given</Label>
            </div>
          </TabsContent>

          <TabsContent value="medical" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Medical Conditions</Label>
              <Textarea
                value={formData.medical_info}
                onChange={(e) => setFormData({ ...formData, medical_info: e.target.value })}
                className="min-h-[80px]"
                placeholder="Any medical conditions..."
              />
            </div>

            <div className="space-y-2">
              <Label>Allergies</Label>
              <Textarea
                value={formData.allergies}
                onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                className="min-h-[80px]"
                placeholder="Any allergies..."
              />
            </div>

            <div className="space-y-2">
              <Label>Dietary Requirements</Label>
              <Textarea
                value={formData.dietary_requirements}
                onChange={(e) => setFormData({ ...formData, dietary_requirements: e.target.value })}
                className="min-h-[80px]"
                placeholder="Any dietary requirements..."
              />
            </div>

            <div className="space-y-2">
              <Label>Medications</Label>
              <Textarea
                value={formData.medications}
                onChange={(e) => setFormData({ ...formData, medications: e.target.value })}
                className="min-h-[80px]"
                placeholder="Regular medications..."
              />
            </div>
          </TabsContent>

          <TabsContent value="notes" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Leader Notes (Private)</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="min-h-[200px]"
                placeholder="Add any notes about the member..."
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-[#004851] hover:bg-[#003840]">
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}