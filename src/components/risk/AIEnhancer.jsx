import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function AIEnhancer({ assessment, onRisksAdded }) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEnhance = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    setLoading(true);
    try {
      const systemPrompt = `You are a Scouts UK risk assessment expert. Based on the following activity and existing risks, generate additional specific risks according to the user's request.

Activity: ${assessment.activity_name}
Description: ${assessment.activity_description || 'Not provided'}

Existing Risks:
${assessment.risks.map((r, i) => `${i + 1}. ${r.hazard}`).join('\n')}

User Request: ${prompt}

Generate 1-3 NEW specific risks that address the user's request. For each risk, provide:
- hazard: Clear description of what could go wrong
- who_at_risk: Specific groups (Young people, Leaders, Visitors, etc.)
- controls: Detailed control measures and communication methods
- review_notes: Leave empty (will be filled during review)

Focus on practical, specific risks relevant to Scouts UK activities.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: systemPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            risks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  hazard: { type: "string" },
                  who_at_risk: { type: "string" },
                  controls: { type: "string" },
                  review_notes: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (response.risks && response.risks.length > 0) {
        onRisksAdded(response.risks);
        setPrompt('');
        toast.success(`Added ${response.risks.length} new risk(s)`);
      } else {
        toast.error('No risks generated');
      }
    } catch (error) {
      toast.error('Failed to generate risks: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-2 border-[#ff66b2]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[#7413dc]">
          <Sparkles className="w-5 h-5" />
          AI Risk Enhancement
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">
          Ask the AI to identify additional specific risks for your activity.
        </p>
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., 'Consider night-time risks' or 'Add weather-related hazards' or 'What about first aid requirements?'"
          className="min-h-[100px]"
        />
        <Button
          onClick={handleEnhance}
          disabled={loading}
          className="w-full bg-gradient-to-r from-[#7413dc] to-[#ff66b2] hover:opacity-90"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Enhance with AI
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}