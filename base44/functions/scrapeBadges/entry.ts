import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Use the AI to scrape and structure the badges data
    const scoutBadgesUrl = 'https://scouts.org.uk/badges';
    
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Go to ${scoutBadgesUrl} and find all badges specifically for the Scouts section (ages 10½-14).

For each Scout badge, extract:
1. Badge name
2. Badge category (Activity, Challenge, Staged Activity, or core awards like Chief Scout's Award)
3. Direct URL to the badge's detail page
4. Direct URL to the badge image/logo (high quality PNG or JPG)
5. Brief description
6. All requirements/criteria organized into logical modules
7. For staged badges, the stage number
8. Completion rule (must complete all modules, or choose from modules, etc.)

Return a JSON array with this structure:
{
  "badges": [
    {
      "name": "Badge Name",
      "category": "activity|challenge|staged|core",
      "stage_number": 1,
      "detail_url": "https://...",
      "image_url": "https://...",
      "description": "...",
      "completion_rule": "all_modules|one_module|custom",
      "modules": [
        {
          "name": "Module Name",
          "order": 1,
          "requirements": [
            {
              "description": "Requirement text",
              "optional": false,
              "order": 1
            }
          ]
        }
      ]
    }
  ]
}

IMPORTANT: 
- Only include badges for the Scouts section (ages 10½-14), NOT Beavers, Cubs, Explorers, or Squirrels
- Get the actual image URLs from the website
- Organize requirements into logical modules
- Mark optional requirements correctly`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          badges: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                category: { type: "string" },
                stage_number: { type: "number" },
                detail_url: { type: "string" },
                image_url: { type: "string" },
                description: { type: "string" },
                completion_rule: { type: "string" },
                modules: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      order: { type: "number" },
                      requirements: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            description: { type: "string" },
                            optional: { type: "boolean" },
                            order: { type: "number" }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    // Download and upload badge images
    const badgesWithUploadedImages = await Promise.all(
      result.badges.map(async (badge) => {
        try {
          // Download the image
          const imageResponse = await fetch(badge.image_url);
          if (!imageResponse.ok) {
            console.error(`Failed to download image for ${badge.name}`);
            return { ...badge, image_upload_error: true };
          }

          const imageBlob = await imageResponse.blob();
          const imageFile = new File([imageBlob], `${badge.name.replace(/\s+/g, '_')}.png`, { 
            type: imageBlob.type 
          });

          // Upload to base44
          const uploadResult = await base44.integrations.Core.UploadFile({ file: imageFile });
          
          return {
            ...badge,
            uploaded_image_url: uploadResult.file_url
          };
        } catch (error) {
          console.error(`Error processing image for ${badge.name}:`, error);
          return { ...badge, image_upload_error: true, error_message: error.message };
        }
      })
    );

    return Response.json({
      success: true,
      badges: badgesWithUploadedImages,
      total_count: badgesWithUploadedImages.length,
      successful_uploads: badgesWithUploadedImages.filter(b => b.uploaded_image_url).length
    });

  } catch (error) {
    console.error('Error scraping badges:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});