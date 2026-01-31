import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Upload, Receipt, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import SearchableEventSelect from '../components/gallery/SearchableEventSelect';

export default function UploadReceipt() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [amount, setAmount] = useState('');
  const [selectedProgramme, setSelectedProgramme] = useState('');
  const [isGeneric, setIsGeneric] = useState(false);
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: leader } = useQuery({
    queryKey: ['leader', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const leaders = await base44.entities.Leader.filter({ user_id: user.id });
      return leaders[0] || null;
    },
    enabled: !!user?.id,
  });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !amount) {
      toast.error('Please select a receipt and enter the amount');
      return;
    }

    if (!isGeneric && !selectedProgramme) {
      toast.error('Please select a meeting or mark as generic expense');
      return;
    }

    setUploading(true);

    try {
      // Upload file
      const { data: uploadResult } = await base44.integrations.Core.UploadFile({ file: selectedFile });

      // Create receipt record
      const receiptData = {
        file_url: uploadResult.file_url,
        amount: parseFloat(amount),
        is_generic_expense: isGeneric,
        notes: notes || '',
        uploaded_by: user.id,
        section_id: leader?.section_ids?.[0] || '',
      };

      if (!isGeneric && selectedProgramme) {
        receiptData.programme_id = selectedProgramme;
      }

      await base44.entities.Receipt.create(receiptData);

      toast.success('Receipt uploaded successfully!');
      
      // Reset form
      setSelectedFile(null);
      setAmount('');
      setSelectedProgramme('');
      setIsGeneric(false);
      setNotes('');
      document.getElementById('file-upload').value = '';
    } catch (error) {
      toast.error('Failed to upload receipt: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-md mx-auto pt-8">
        <Card className="shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-xl">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Receipt className="w-6 h-6" />
              Upload Receipt
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* File Upload */}
            <div>
              <Label className="text-base font-semibold mb-3 block">Receipt Image</Label>
              <div className="relative">
                <input
                  id="file-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="file-upload">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all">
                    {selectedFile ? (
                      <div className="space-y-2">
                        <CheckCircle className="w-12 h-12 mx-auto text-green-600" />
                        <p className="font-medium text-gray-700">{selectedFile.name}</p>
                        <p className="text-sm text-gray-500">Tap to change</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="w-12 h-12 mx-auto text-gray-400" />
                        <p className="font-medium text-gray-700">Tap to upload</p>
                        <p className="text-sm text-gray-500">Take a photo or select from gallery</p>
                      </div>
                    )}
                  </div>
                </label>
              </div>
            </div>

            {/* Amount */}
            <div>
              <Label htmlFor="amount" className="text-base font-semibold mb-3 block">
                Amount (£)
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-lg h-12"
              />
            </div>

            {/* Generic Expense Checkbox */}
            <div className="flex items-center space-x-3 bg-gray-50 p-4 rounded-lg">
              <Checkbox
                id="generic"
                checked={isGeneric}
                onCheckedChange={setIsGeneric}
              />
              <Label htmlFor="generic" className="text-base font-medium cursor-pointer">
                Generic Expense
              </Label>
            </div>

            {/* Meeting Search (only if not generic) */}
            {!isGeneric && (
              <div>
                <Label className="text-base font-semibold mb-3 block">
                  Related Meeting
                </Label>
                <SearchableEventSelect
                  value={selectedProgramme}
                  onValueChange={setSelectedProgramme}
                  placeholder="Search for meeting..."
                />
              </div>
            )}

            {/* Notes */}
            <div>
              <Label htmlFor="notes" className="text-base font-semibold mb-3 block">
                Notes
              </Label>
              <Textarea
                id="notes"
                placeholder="Add any additional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-24 text-base"
              />
            </div>

            {/* Upload Button */}
            <Button
              onClick={handleUpload}
              disabled={uploading || !selectedFile || !amount}
              className="w-full h-12 text-base bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 mr-2" />
                  Upload Receipt
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}