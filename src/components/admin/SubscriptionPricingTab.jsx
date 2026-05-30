import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard, Check, Edit2 } from 'lucide-react';
import { toast } from 'sonner';

const INTERVALS = [
  { key: 'monthly',  label: 'Monthly',     priceField: 'price_pence_monthly',  priceIdField: 'stripe_price_id_monthly' },
  { key: '4_months', label: 'Termly',       priceField: 'price_pence_termly',   priceIdField: 'stripe_price_id_4m'     },
  { key: '6_months', label: 'Half Yearly',  priceField: 'price_pence_6m',       priceIdField: 'stripe_price_id_6m'     },
  { key: 'yearly',   label: 'Yearly',       priceField: 'price_pence_yearly',   priceIdField: 'stripe_price_id_yearly' },
];

function toPounds(pence) {
  if (!pence) return '';
  return (pence / 100).toFixed(2);
}

export default function SubscriptionPricingTab() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
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
    const form = { display_name: config?.display_name || `${section.display_name} Membership` };
    INTERVALS.forEach(({ key, priceField }) => {
      form[key] = toPounds(config?.[priceField]);
    });
    setEditingId(section.id);
    setEditForm(form);
  };

  const handleSave = async (section) => {
    const config = configs.find(c => c.section_id === section.id);
    const updateData = { display_name: editForm.display_name, updated_at: new Date().toISOString().split('T')[0] };
    for (const { key, priceField } of INTERVALS) {
      const val = parseFloat(editForm[key]);
      if (!isNaN(val) && val > 0) {
        updateData[priceField] = Math.round(val * 100);
        // Clear cached Stripe price ID if price changed
        const prevPence = config?.[priceField];
        if (prevPence !== updateData[priceField]) {
          updateData[INTERVALS.find(i => i.key === key).priceIdField] = null;
        }
      } else {
        updateData[priceField] = null;
      }
    }
    setSaving(true);
    try {
      if (config) {
        await base44.entities.SectionSubsConfig.update(config.id, updateData);
      } else {
        await base44.entities.SectionSubsConfig.create({ section_id: section.id, ...updateData });
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
          Set a price per billing interval for each section. Stripe price IDs are auto-created on first subscription — no manual setup needed.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {sections.length === 0 && <p className="text-sm text-gray-400 py-4 text-center">No sections found.</p>}
        {sections.map(section => {
          const config = configs.find(c => c.section_id === section.id);
          const isEditing = editingId === section.id;
          const hasAnyPrice = INTERVALS.some(({ priceField }) => config?.[priceField]);
          return (
            <div key={section.id} className="border border-gray-100 rounded-xl bg-gray-50 p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-semibold text-gray-900">{section.display_name}</p>
                  {config?.display_name && !isEditing && (
                    <p className="text-xs text-gray-400 mt-0.5">{config.display_name}</p>
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

              {/* Price summary (view mode) */}
              {!isEditing && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {INTERVALS.map(({ key, label, priceField }) => (
                    <div key={key} className="bg-white rounded-lg p-2 border border-gray-100 text-center">
                      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                      <p className={`text-sm font-semibold ${config?.[priceField] ? 'text-gray-900' : 'text-gray-300'}`}>
                        {config?.[priceField] ? `£${toPounds(config[priceField])}` : '—'}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Edit form */}
              {isEditing && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-600">Display Name</Label>
                    <Input
                      placeholder="e.g. Scout Membership"
                      value={editForm.display_name || ''}
                      onChange={e => setEditForm(f => ({ ...f, display_name: e.target.value }))}
                      className="mt-1 h-8 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {INTERVALS.map(({ key, label }) => (
                      <div key={key}>
                        <Label className="text-xs text-gray-600">{label} (£)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="e.g. 15.00"
                          value={editForm[key] || ''}
                          onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                          className="mt-1 h-8 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400">Changing a price will auto-create a new Stripe price on the next subscription. Existing subscriptions are unaffected.</p>
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