import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Package, Plus, Minus, Edit } from 'lucide-react';

export default function StockManagementDialog({ badge, open, onClose }) {
  const queryClient = useQueryClient();
  const [adjustmentType, setAdjustmentType] = useState('restock');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [threshold, setThreshold] = useState(5);
  const [warningEnabled, setWarningEnabled] = useState(true);

  const { data: stockInfo } = useQuery({
    queryKey: ['badge-stock', badge?.id],
    queryFn: async () => {
      const stocks = await base44.entities.BadgeStock.filter({ badge_id: badge.id });
      return stocks[0] || null;
    },
    enabled: !!badge,
  });

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const adjustStockMutation = useMutation({
    mutationFn: async () => {
      const adjustAmount = adjustmentType === 'restock' ? parseInt(amount) : -parseInt(amount);
      const currentStock = stockInfo?.current_stock || 0;
      const newStock = Math.max(0, currentStock + adjustAmount);

      if (stockInfo) {
        await base44.entities.BadgeStock.update(stockInfo.id, {
          current_stock: newStock,
          minimum_threshold: threshold,
          reorder_warning_enabled: warningEnabled,
          last_updated: new Date().toISOString(),
        });
      } else {
        await base44.entities.BadgeStock.create({
          badge_id: badge.id,
          current_stock: newStock,
          minimum_threshold: threshold,
          reorder_warning_enabled: warningEnabled,
          last_updated: new Date().toISOString(),
        });
      }

      // Log adjustment
      await base44.entities.StockAdjustmentLog.create({
        badge_id: badge.id,
        adjustment_amount: adjustAmount,
        adjusted_by: user.email,
        adjustment_type: adjustmentType,
        reason: reason || `Stock ${adjustmentType}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['badge-stock'] });
      toast.success('Stock updated');
      onClose();
    },
  });

  React.useEffect(() => {
    if (stockInfo) {
      setThreshold(stockInfo.minimum_threshold);
      setWarningEnabled(stockInfo.reorder_warning_enabled);
    }
  }, [stockInfo]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Manage Stock - {badge?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Current Stock</p>
            <p className="text-3xl font-bold">{stockInfo?.current_stock || 0}</p>
          </div>

          <div>
            <Label>Adjustment Type</Label>
            <Select value={adjustmentType} onValueChange={setAdjustmentType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="restock">
                  <div className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Add Stock (Restock)
                  </div>
                </SelectItem>
                <SelectItem value="correction">
                  <div className="flex items-center gap-2">
                    <Minus className="w-4 h-4" />
                    Remove Stock (Correction)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Amount</Label>
            <Input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter quantity"
            />
          </div>

          <div>
            <Label>Reason</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why are you making this adjustment?"
            />
          </div>

          <div>
            <Label>Minimum Threshold</Label>
            <Input
              type="number"
              min="0"
              value={threshold}
              onChange={(e) => setThreshold(parseInt(e.target.value) || 0)}
            />
            <p className="text-xs text-gray-500 mt-1">
              You'll be warned when stock falls below this level
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="warning-enabled"
              checked={warningEnabled}
              onCheckedChange={setWarningEnabled}
            />
            <Label htmlFor="warning-enabled" className="cursor-pointer">
              Enable low stock warnings
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => adjustStockMutation.mutate()}
            disabled={!amount || adjustStockMutation.isPending}
          >
            Update Stock
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}