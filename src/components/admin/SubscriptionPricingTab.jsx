import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard, Check, Edit2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SubscriptionPricingTab() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ price_pounds: '', display_name: '' });
  const [saved, setSaved] = useState(null);
  const [saving, setSaving] = useState(false);

  const { data: sections = [] } = useQuery({
    queryKey: ['all-sections-subs'],
    queryFn: () => base44.entities.Section.filter({}),
  });
  const { data: configs = [] } = useQuery({
    queryKey: ['subs-configs'],
    queryFn: () => base44.entities.SectionSubsConfig.filter({}),
  });

  const handleEdit = (section) => {
    const config = configs.find(c => c.section_id === section.id);
    setEditingId(section.id);
    setEditForm({
      price_pounds: config ? (config.price_pence / 100).toFixed(2) : '',
      display_name: config?.display_name || `${section.display_name} Membership`,
    });
  };

  const handleSave = async (section) => {
    const pricePounds = parseFloat(editForm.price_pounds);
    if (isNaN(pricePounds) || pricePounds <= 0) {
      toast.error('Please enter a valid price greater than £0');
      return;
    }
    const price_pence = Math.round(pricePounds * 100);
    const config = configs.find(c => c.section_id === section.id);
    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      if (config) {
        await base44.entities.SectionSubsConfig.update(config.id, {
          price_pence,
          display_name: editForm.display_name,
          updated_at: today,
        });
      } else {
        await base44.entities.SectionSubsConfig.create({
          section_id: section.id,
          price_pence,
          display_name: editForm.display_name,
          created_at: today,
          updated_at: today,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['subs-configs'] });
      setSaved(section.id);
      setTimeout(() => setSaved(null), 2500);
      setEditingId(null);
    } catch (e) {
      toast.error('Failed to save: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Subscription Pricing
        </CardTitle>
        <p className="text-sm text-gray-500 mt-1">
          Configure subscription price per section. Stripe price IDs are auto-created on first subscription and reused automatically — no manual secret management needed.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {sections.length === 0 && <p className="text-sm text-gray-400 py-4 text-center">No sections found.</p>}
        {sections.map(section => {
          const config = configs.find(c => c.section_id === section.id);
          const isEditing = editingId === section.id;
          const hasPriceIds = config?.stripe_price_id_4m || config?.stripe_price_id_6m || config?.stripe_price_id_yearly;
          return (
            <div key={section.id} className="border border-gray-100 rounded-xl bg-gray-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 text-sm">{section.display_name}</p>
                  {!isEditing && (
                    <div className="mt-1 space-y-0.5">
                      <p className="text-xs text-gray-500">
                        {config?.price_pence
                          ? `£${(config.price_pence / 100).toFixed(2)} — ${config.display_name}`
                          : <span className="text-amber-600">Not set — falls back to SUBS_AMOUNT_PENCE secret</span>}
                      </p>
                      {hasPriceIds && (
                        <p className="text-xs text-green-600">✓ Stripe price IDs configured</p>
                      )}
                    </div>
                  )}
                </div>
                {!isEditing && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {saved === section.id && (
                      <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                        <Check className="w-3 h-3" />Saved
                      </span>
                    )}
                    <Button size="sm" variant="outline" onClick={() => handleEdit(section)}>
                      <Edit2 className="w-3 h-3 mr-1.5" />Edit
                    </Button>
                  </div>
                )}
              </div>

              {isEditing && (
                <div className="mt-3 space-y-3">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-gray-600">Price (£)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="e.g. 15.00"
                        value={editForm.price_pounds}
                        onChange={e => setEditForm(f => ({ ...f, price_pounds: e.target.value }))}
                        className="mt-1 h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Display Name</Label>
                      <Input
                        placeholder="e.g. Scout Membership"
                        value={editForm.display_name}
                        onChange={e => setEditForm(f => ({ ...f, display_name: e.target.value }))}
                        className="mt-1 h-8 text-sm"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">
                    Changing the price will create new Stripe price IDs on the next subscription. Existing active subscriptions are unaffected.
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleSave(section)} disabled={saving} className="bg-[#7413dc] hover:bg-[#5c0fb0]">
                      {saving ? 'Saving...' : 'Save'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}