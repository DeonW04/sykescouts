import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Trash2, FileText } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

export default function ResponsesDialog({ open, onClose, responses, page, blockId }) {
  const queryClient = useQueryClient();

  const deleteResponseMutation = useMutation({
    mutationFn: (responseId) => base44.entities.BlockResponse.delete(responseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['block-responses', page?.page_id] });
      toast.success('Response deleted');
    },
  });

  const block = page?.blocks?.find(b => b.id === blockId);
  const question = block?.data?.question || 'Question';

  console.log('ResponsesDialog - blockId:', blockId);
  console.log('ResponsesDialog - page blocks:', page?.blocks);
  console.log('ResponsesDialog - found block:', block);
  console.log('ResponsesDialog - responses received:', responses);

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Add logo
    const logoUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69540f3779bf32f5ccc6335b/e8eca937a_image.png';
    
    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('40th Rochdale (Syke) Scouts', 20, 30);
    
    // Page title
    doc.setFontSize(16);
    doc.text(page.title, 20, 45);
    
    // Question
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Question: ' + question, 20, 60);
    
    // Table header
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Child Name', 20, 75);
    doc.text('Response', 80, 75);
    doc.text('Date', 140, 75);
    
    // Line under header
    doc.line(20, 77, 190, 77);
    
    // Table rows
    let y = 85;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    responses.forEach((response, idx) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      
      const childName = response.response_data?.childName || 'Unknown';
      const answer = response.response_data?.answer || 'No answer';
      const date = new Date(response.response_date).toLocaleDateString('en-GB');
      
      doc.text(childName, 20, y);
      doc.text(answer.length > 30 ? answer.substring(0, 30) + '...' : answer, 80, y);
      doc.text(date, 140, y);
      
      y += 8;
    });
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text('Generated on ' + new Date().toLocaleDateString('en-GB'), 20, 285);
    
    doc.save(`${page.title.replace(/[^a-z0-9]/gi, '_')}_responses.pdf`);
    toast.success('PDF exported successfully');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div>
              <div className="text-xl font-bold">Responses</div>
              <div className="text-sm text-gray-600 font-normal mt-1">{question}</div>
            </div>
            <Button
              onClick={exportToPDF}
              className="bg-green-600 hover:bg-green-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 overflow-y-auto max-h-[60vh]">
          {responses.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No responses yet</p>
            </div>
          ) : (
            responses.map((response) => (
              <div
                key={response.id}
                className="flex items-start justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <p className="font-semibold text-lg">
                      {response.response_data?.childName || 'Unknown'}
                    </p>
                    <span className="text-xs text-gray-500">
                      {new Date(response.response_date).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <p className="text-gray-700">
                    <span className="font-medium">Response: </span>
                    {response.response_data?.answer}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteResponseMutation.mutate(response.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-sm text-gray-600">
            Total responses: <span className="font-semibold">{responses.length}</span>
          </p>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}