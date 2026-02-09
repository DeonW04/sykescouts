import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { badges } = await req.json();

    if (!badges || !Array.isArray(badges) || badges.length === 0) {
      return Response.json({ 
        success: false, 
        error: 'No badges provided' 
      });
    }

    let imported = 0;
    const errors = [];

    for (const badge of badges) {
      try {
        // Create badge definition
        const badgeData = {
          name: badge.name,
          section: badge.section,
          category: badge.category,
          description: badge.description,
          image_url: badge.image_url,
          active: true,
          completion_rule: 'all_modules'
        };

        // Add staged badge fields if applicable
        if (badge.stage_number) {
          badgeData.badge_family_id = badge.badge_family || badge.name.replace(/\s+Stage\s+\d+/i, '').trim();
          badgeData.stage_number = badge.stage_number;
        }

        const createdBadge = await base44.asServiceRole.entities.BadgeDefinition.create(badgeData);

        // Create modules and requirements
        for (const module of Object.values(badge.modules)) {
          const createdModule = await base44.asServiceRole.entities.BadgeModule.create({
            badge_id: createdBadge.id,
            name: module.name,
            order: module.order,
            completion_rule: module.completion_rule,
            required_count: module.required_count
          });

          // Create requirements
          for (const requirement of module.requirements) {
            await base44.asServiceRole.entities.BadgeRequirement.create({
              badge_id: createdBadge.id,
              module_id: createdModule.id,
              text: requirement.text,
              order: requirement.order
            });
          }
        }

        // Initialize badge stock
        await base44.asServiceRole.entities.BadgeStock.create({
          badge_id: createdBadge.id,
          current_stock: 0,
          minimum_threshold: 5,
          reorder_warning_enabled: true
        });

        imported++;
      } catch (error) {
        errors.push({
          badge: badge.name,
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      imported,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});