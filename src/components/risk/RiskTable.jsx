import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Plus, Edit, Save, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function RiskTable({ risks, onChange }) {
  const [editingIndex, setEditingIndex] = useState(null);
  const [editForm, setEditForm] = useState({});

  const handleEdit = (index) => {
    setEditingIndex(index);
    setEditForm({ ...risks[index] });
  };

  const handleSave = () => {
    const updatedRisks = [...risks];
    updatedRisks[editingIndex] = editForm;
    onChange(updatedRisks);
    setEditingIndex(null);
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setEditForm({});
  };

  const handleDelete = (index) => {
    const updatedRisks = risks.filter((_, i) => i !== index);
    onChange(updatedRisks);
  };

  const handleAdd = () => {
    const newRisk = {
      hazard: '',
      who_at_risk: '',
      controls: '',
      review_notes: ''
    };
    onChange([...risks, newRisk]);
    setEditingIndex(risks.length);
    setEditForm(newRisk);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Risk Assessment Table</h3>
        <Button onClick={handleAdd} className="bg-[#7413dc] hover:bg-[#5c0fb0]">
          <Plus className="w-4 h-4 mr-2" />
          Add Risk
        </Button>
      </div>

      {risks.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            No risks identified yet. Click "Add Risk" to start.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {risks.map((risk, index) => (
            <Card key={index} className={editingIndex === index ? "border-[#7413dc] border-2" : ""}>
              <CardContent className="p-4">
                {editingIndex === index ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">What could go wrong?</label>
                      <Textarea
                        value={editForm.hazard}
                        onChange={(e) => setEditForm({ ...editForm, hazard: e.target.value })}
                        placeholder="Describe the hazard and risks identified"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Who is at risk?</label>
                      <Input
                        value={editForm.who_at_risk}
                        onChange={(e) => setEditForm({ ...editForm, who_at_risk: e.target.value })}
                        placeholder="e.g., Young people, Leaders, Visitors"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Controls & Communication</label>
                      <Textarea
                        value={editForm.controls}
                        onChange={(e) => setEditForm({ ...editForm, controls: e.target.value })}
                        placeholder="What are you going to do about it?"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Review Notes</label>
                      <Textarea
                        value={editForm.review_notes}
                        onChange={(e) => setEditForm({ ...editForm, review_notes: e.target.value })}
                        placeholder="What has changed?"
                        className="mt-1"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSave} size="sm" className="bg-green-600 hover:bg-green-700">
                        <Save className="w-4 h-4 mr-1" />
                        Save
                      </Button>
                      <Button onClick={handleCancel} variant="outline" size="sm">
                        <X className="w-4 h-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 grid md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-semibold text-[#7413dc] uppercase">Hazard/Risk</p>
                          <p className="text-sm mt-1">{risk.hazard || 'Not specified'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-[#7413dc] uppercase">Who is at risk</p>
                          <p className="text-sm mt-1">{risk.who_at_risk || 'Not specified'}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(index)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(index)} className="text-red-600 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4 pt-2 border-t">
                      <div>
                        <p className="text-xs font-semibold text-[#7413dc] uppercase">Controls</p>
                        <p className="text-sm mt-1">{risk.controls || 'Not specified'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-[#7413dc] uppercase">Review Notes</p>
                        <p className="text-sm mt-1">{risk.review_notes || 'None'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}