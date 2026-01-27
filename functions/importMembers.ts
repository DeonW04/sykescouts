import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    const csvText = await file.text();
    const lines = csvText.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return Response.json({ error: 'CSV file is empty or invalid' }, { status: 400 });
    }

    const headers = lines[0].split(',').map(h => h.trim());
    
    let imported = 0;
    let failed = 0;
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(',').map(v => v.trim());
        const memberData = {};

        headers.forEach((header, index) => {
          const value = values[index] || '';
          
          // Handle boolean fields
          if (header === 'photo_consent' || header === 'invested' || header === 'active') {
            memberData[header] = value.toLowerCase() === 'true';
          }
          // Handle empty values
          else if (value === '') {
            memberData[header] = null;
          }
          // Regular fields
          else {
            memberData[header] = value;
          }
        });

        // Auto-generate full_name from first_name and surname
        if (memberData.first_name && memberData.surname) {
          memberData.full_name = `${memberData.first_name} ${memberData.surname}`.trim();
        }

        // Auto-generate parent full names
        if (memberData.parent_one_first_name && memberData.parent_one_surname) {
          memberData.parent_one_name = `${memberData.parent_one_first_name} ${memberData.parent_one_surname}`.trim();
        }
        if (memberData.parent_two_first_name && memberData.parent_two_surname) {
          memberData.parent_two_name = `${memberData.parent_two_first_name} ${memberData.parent_two_surname}`.trim();
        }

        // Validate required fields
        if (!memberData.first_name || !memberData.surname || !memberData.date_of_birth) {
          throw new Error('Missing required fields: first_name, surname, or date_of_birth');
        }

        // Create member using service role
        await base44.asServiceRole.entities.Member.create(memberData);
        imported++;
      } catch (error) {
        failed++;
        errors.push(`Row ${i + 1}: ${error.message}`);
      }
    }

    return Response.json({
      success: true,
      imported,
      failed,
      errors: errors.slice(0, 10), // Return first 10 errors
    });
  } catch (error) {
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});