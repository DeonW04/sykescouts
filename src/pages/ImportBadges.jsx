import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Upload, Download, FileText, X, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import LeaderNav from '../components/leader/LeaderNav';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

const AI_PROMPTS = {
  challenge: `I need you to extract all Challenge Badge information for [SECTION NAME - e.g., Beavers, Cubs, Scouts] from the official Scouts UK website and format it into a CSV file.

Please create a CSV file with the following columns:
- name (Badge name)
- section (lowercase: beavers, cubs, scouts, explorers, squirrels)
- category (always "challenge" for this export)
- description (Brief badge description)
- badge_completion_rule (How badge is completed: "all_modules", "one_module", or "custom". Use "all_modules" if all modules must be completed, "one_module" if only one module needs completing)
- module_name (Name of each requirement group/module)
- module_order (Display order of the module, starting from 1)
- module_completion_rule (Either "all_required" or "x_of_n_required")
- module_required_count (If x_of_n_required, specify how many are needed. Leave blank for all_required)
- requirement_text (The actual requirement text)
- requirement_order (Display order within the module, starting from 1)

Rules:
1. Each row should represent ONE requirement
2. If a badge has multiple requirements, create multiple rows with the same badge name, section, category, and description
3. Group requirements into logical modules (e.g., "Physical", "Creative", "Community")
4. If the badge structure shows "Complete X of the following", set module_completion_rule to "x_of_n_required" and specify the count
5. For badges where all requirements must be completed, use "all_required"
6. Use double quotes around text fields that contain commas
7. Keep requirement_text concise but complete

Example rows:
"Adventure Challenge Badge","cubs","challenge","Complete adventurous activities","all_modules","Adventure Activities",1,"x_of_n_required",4,"Take part in a campfire or outdoor cooking activity",1
"Adventure Challenge Badge","cubs","challenge","Complete adventurous activities","all_modules","Adventure Activities",1,"x_of_n_required",4,"Go on a nature walk and identify plants or animals",2

Please search the Scouts UK website for the official badge requirements and create this CSV file.`,

  activity: `I need you to extract all Activity Badge information for [SECTION NAME - e.g., Beavers, Cubs, Scouts] from the official Scouts UK website and format it into a CSV file.

Please create a CSV file with the following columns:
- name (Badge name)
- section (lowercase: beavers, cubs, scouts, explorers, squirrels)
- category (always "activity" for this export)
- description (Brief badge description)
- badge_completion_rule (How badge is completed: "all_modules", "one_module", or "custom". Most activity badges use "all_modules")
- module_name (Name of each requirement group - most activity badges have one module called "Requirements")
- module_order (Display order of the module, starting from 1)
- module_completion_rule (Either "all_required" or "x_of_n_required")
- module_required_count (If x_of_n_required, specify how many are needed. Leave blank for all_required)
- requirement_text (The actual requirement text)
- requirement_order (Display order within the module, starting from 1)

Rules:
1. Each row should represent ONE requirement
2. If a badge has multiple requirements, create multiple rows with the same badge name, section, category, and description
3. Most activity badges have one module called "Requirements" - but some may have multiple modules
4. If the badge shows "Complete X of the following", set module_completion_rule to "x_of_n_required" and specify the count
5. For badges where all requirements must be completed, use "all_required"
6. Use double quotes around text fields that contain commas
7. Keep requirement_text concise but complete

Example rows:
"Artist Activity Badge","cubs","activity","Explore art and creativity","all_modules","Requirements",1,"x_of_n_required",4,"Create a painting using different techniques",1
"Artist Activity Badge","cubs","activity","Explore art and creativity","all_modules","Requirements",1,"x_of_n_required",4,"Make a sculpture from clay or other materials",2

Please search the Scouts UK website for the official badge requirements and create this CSV file.`,

  staged: `I need you to extract all Staged Badge information for [SECTION NAME - e.g., Beavers, Cubs, Scouts] from the official Scouts UK website and format it into a CSV file.

Staged badges are badges that have multiple levels (Stage 1, Stage 2, Stage 3, etc.) and members progress through them over time.

Please create a CSV file with the following columns:
- name (Badge name - include the stage number, e.g., "Swimmer Stage 1", "Swimmer Stage 2")
- badge_family (The family name without stage, e.g., "Swimmer" - this groups all stages together)
- stage_number (The stage number: 1, 2, 3, etc.)
- section (lowercase: beavers, cubs, scouts, explorers, squirrels, or "all" if it applies across sections)
- category (always "staged" for this export)
- description (Brief description of what this stage covers)
- badge_completion_rule (How badge is completed: "all_modules", "one_module", or "custom". Most staged badges use "all_modules")
- module_name (Name of each requirement group/module)
- module_order (Display order of the module, starting from 1)
- module_completion_rule (Either "all_required" or "x_of_n_required")
- module_required_count (If x_of_n_required, specify how many are needed. Leave blank for all_required)
- requirement_text (The actual requirement text)
- requirement_order (Display order within the module, starting from 1)

Rules:
1. Each row should represent ONE requirement for ONE stage
2. Create separate rows for each stage of the badge (e.g., Swimmer Stage 1, Swimmer Stage 2, etc.)
3. All stages of the same badge should have the same badge_family value
4. If a staged badge requirement shows "Complete X of the following", set module_completion_rule to "x_of_n_required"
5. For requirements where all must be completed, use "all_required"
6. Use double quotes around text fields that contain commas
7. Keep requirement_text concise but complete

Example rows:
"Swimmer Stage 1","Swimmer",1,"all","staged","Learn basic water confidence and swimming skills","all_modules","Skills",1,"all_required",,"Jump into the water safely",1
"Swimmer Stage 1","Swimmer",1,"all","staged","Learn basic water confidence and swimming skills","all_modules","Skills",1,"all_required",,"Submerge face in water",2
"Swimmer Stage 2","Swimmer",2,"all","staged","Develop swimming technique and distance","all_modules","Skills",1,"all_required",,"Swim 10 metres on front",1

Please search the Scouts UK website for the official staged badge requirements and create this CSV file.`
};

export default function ImportBadges() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [parsedBadges, setParsedBadges] = useState([]);
  const [showPromptDialog, setShowPromptDialog] = useState(false);
  const [selectedPromptType, setSelectedPromptType] = useState(null);
  const [importing, setImporting] = useState(false);

  const handleFileUpload = async (files) => {
    const newFiles = Array.from(files);
    const parsed = [];

    for (const file of newFiles) {
      try {
        const text = await file.text();
        const rows = text.split('\n').map(row => row.trim()).filter(row => row);
        
        if (rows.length < 2) {
          toast.error(`Invalid CSV: ${file.name}`);
          continue;
        }

        const headers = rows[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const badges = {};

        for (let i = 1; i < rows.length; i++) {
          const values = parseCSVRow(rows[i]);
          if (values.length < headers.length) continue;

          const row = {};
          headers.forEach((header, idx) => {
            row[header] = values[idx]?.replace(/^"|"$/g, '') || '';
          });

          const badgeKey = `${row.name}-${row.section}-${row.stage_number || ''}`;
          
          if (!badges[badgeKey]) {
            badges[badgeKey] = {
              name: row.name,
              section: row.section,
              category: row.category,
              description: row.description,
              badge_completion_rule: row.badge_completion_rule || 'all_modules',
              badge_family: row.badge_family || null,
              stage_number: row.stage_number ? parseInt(row.stage_number) : null,
              image_url: null,
              modules: {}
            };
          }

          const moduleName = row.module_name || 'Requirements';
          if (!badges[badgeKey].modules[moduleName]) {
            badges[badgeKey].modules[moduleName] = {
              name: moduleName,
              order: parseInt(row.module_order) || 1,
              completion_rule: row.module_completion_rule || 'all_required',
              required_count: row.module_required_count ? parseInt(row.module_required_count) : null,
              requirements: []
            };
          }

          badges[badgeKey].modules[moduleName].requirements.push({
            text: row.requirement_text,
            order: parseInt(row.requirement_order) || 1
          });
        }

        parsed.push(...Object.values(badges));
      } catch (error) {
        toast.error(`Error parsing ${file.name}: ${error.message}`);
      }
    }

    setParsedBadges(prev => [...prev, ...parsed]);
    setUploadedFiles(prev => [...prev, ...newFiles]);
    toast.success(`Parsed ${parsed.length} badges from ${newFiles.length} file(s)`);
  };

  const parseCSVRow = (row) => {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current);
    return values;
  };

  const handleImageUpload = async (badgeIndex, file) => {
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setParsedBadges(prev => {
        const updated = [...prev];
        updated[badgeIndex].image_url = file_url;
        return updated;
      });
      toast.success('Image uploaded');
    } catch (error) {
      toast.error('Image upload failed: ' + error.message);
    }
  };

  const removeBadge = (index) => {
    setParsedBadges(prev => prev.filter((_, i) => i !== index));
  };

  const handleImport = async () => {
    const badgesWithoutImages = parsedBadges.filter(b => !b.image_url);
    if (badgesWithoutImages.length > 0) {
      toast.error(`${badgesWithoutImages.length} badge(s) missing images`);
      return;
    }

    setImporting(true);
    try {
      const response = await base44.functions.invoke('importBadges', {
        badges: parsedBadges
      });

      if (response.data.success) {
        toast.success(`Successfully imported ${response.data.imported} badges`);
        queryClient.invalidateQueries({ queryKey: ['badges'] });
        queryClient.invalidateQueries({ queryKey: ['badge-stock'] });
        
        // Reset state
        setParsedBadges([]);
        setUploadedFiles([]);
        
        // Navigate back
        setTimeout(() => {
          navigate(createPageUrl('ManageBadges'));
        }, 1500);
      } else {
        toast.error('Import failed: ' + response.data.error);
      }
    } catch (error) {
      toast.error('Import failed: ' + error.message);
    } finally {
      setImporting(false);
    }
  };

  const copyPrompt = (type) => {
    navigator.clipboard.writeText(AI_PROMPTS[type]);
    toast.success('Prompt copied to clipboard');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <LeaderNav />
      <div className="bg-[#004851] text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Upload className="w-8 h-8" />
              <div>
                <h1 className="text-3xl font-bold">Import Badges</h1>
                <p className="mt-1 text-white/80">Import badge definitions from CSV files</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              onClick={() => navigate(createPageUrl('ManageBadges'))}
            >
              Back to Badges
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Instructions */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <AlertCircle className="w-5 h-5" />
              How Badge Import Works
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-800 space-y-3">
            <div>
              <strong>Step 1:</strong> Use the AI Prompt Generator to create prompts for ChatGPT
            </div>
            <div>
              <strong>Step 2:</strong> Paste the prompt into ChatGPT to generate CSV files with badge data
            </div>
            <div>
              <strong>Step 3:</strong> Upload the generated CSV files here
            </div>
            <div>
              <strong>Step 4:</strong> Add badge icon images (JPG/PNG) for each badge
            </div>
            <div>
              <strong>Step 5:</strong> Review the preview and confirm import
            </div>
            <div className="pt-2 border-t border-blue-200">
              <strong>What gets imported:</strong> Badge definitions, modules, requirements, and stock records (initialized at 0)
            </div>
            <div>
              <strong>Note:</strong> The AI generates all badge data - you only need to add the badge images manually
            </div>
          </CardContent>
        </Card>

        {/* AI Prompt Generator */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              AI Prompt Generator
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Generate prompts to paste into ChatGPT. It will extract badge data from the Scouts UK website and create CSV files for you.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => {
                  setSelectedPromptType('challenge');
                  setShowPromptDialog(true);
                }}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Challenge Badges Prompt
              </Button>
              <Button
                onClick={() => {
                  setSelectedPromptType('activity');
                  setShowPromptDialog(true);
                }}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Activity Badges Prompt
              </Button>
              <Button
                onClick={() => {
                  setSelectedPromptType('staged');
                  setShowPromptDialog(true);
                }}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Staged Badges Prompt
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Upload CSV Files */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Upload CSV Files
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              Upload the CSV files generated by ChatGPT. You can upload multiple files at once.
            </p>
            <div>
              <input
                id="csv-upload"
                type="file"
                accept=".csv"
                multiple
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files)}
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById('csv-upload').click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Select CSV Files
              </Button>
            </div>
            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Uploaded Files:</p>
                {uploadedFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                    <FileText className="w-4 h-4" />
                    {file.name}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preview & Add Images */}
        {parsedBadges.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  Badge Preview ({parsedBadges.length} badges)
                </span>
                <Button
                  onClick={handleImport}
                  disabled={importing || parsedBadges.some(b => !b.image_url)}
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
                      Import All Badges
                    </>
                  )}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {parsedBadges.map((badge, idx) => (
                  <div key={idx} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{badge.name}</h3>
                          <Badge className="capitalize">{badge.section}</Badge>
                          <Badge variant="outline" className="capitalize">{badge.category}</Badge>
                          {badge.stage_number && (
                            <Badge className="bg-purple-100 text-purple-800">
                              Stage {badge.stage_number}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{badge.description}</p>
                        
                        <div className="mt-3 space-y-2">
                          <p className="text-xs font-medium text-gray-700">Modules & Requirements:</p>
                          {Object.values(badge.modules).map((module, mIdx) => (
                            <div key={mIdx} className="ml-4 text-sm">
                              <p className="font-medium text-gray-700">
                                {module.name} 
                                {module.completion_rule === 'x_of_n_required' && (
                                  <span className="text-xs text-gray-500 ml-2">
                                    (Complete {module.required_count} of {module.requirements.length})
                                  </span>
                                )}
                              </p>
                              <ul className="ml-4 mt-1 space-y-1 text-gray-600">
                                {module.requirements.slice(0, 3).map((req, rIdx) => (
                                  <li key={rIdx} className="text-xs">• {req.text}</li>
                                ))}
                                {module.requirements.length > 3 && (
                                  <li className="text-xs text-gray-500">
                                    ... and {module.requirements.length - 3} more
                                  </li>
                                )}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2 ml-4">
                        {badge.image_url ? (
                          <div className="relative group">
                            <img 
                              src={badge.image_url} 
                              alt={badge.name}
                              className="w-24 h-24 object-cover rounded-lg border-2 border-green-500"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  setParsedBadges(prev => {
                                    const updated = [...prev];
                                    updated[idx].image_url = null;
                                    return updated;
                                  });
                                }}
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <input
                              id={`image-upload-${idx}`}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) handleImageUpload(idx, file);
                              }}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-orange-300 text-orange-600 hover:bg-orange-50"
                              onClick={() => document.getElementById(`image-upload-${idx}`).click()}
                            >
                              <Upload className="w-3 h-3 mr-1" />
                              Add Image
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeBadge(idx)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="w-3 h-3 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* AI Prompt Dialog */}
      <Dialog open={showPromptDialog} onOpenChange={setShowPromptDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              AI Prompt - {selectedPromptType === 'challenge' ? 'Challenge Badges' : selectedPromptType === 'activity' ? 'Activity Badges' : 'Staged Badges'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <p className="text-sm text-purple-800">
                <strong>Instructions:</strong> Copy this prompt and paste it into ChatGPT. 
                Replace [SECTION NAME] with the section you want (e.g., "Beavers", "Cubs", "Scouts"). 
                ChatGPT will generate a CSV file for you to download and upload here.
              </p>
            </div>
            <div className="relative">
              <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-auto max-h-96 whitespace-pre-wrap">
                {AI_PROMPTS[selectedPromptType]}
              </pre>
              <Button
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => copyPrompt(selectedPromptType)}
              >
                <Download className="w-3 h-3 mr-1" />
                Copy Prompt
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}