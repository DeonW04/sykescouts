import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { JSZip } from 'npm:jszip@3.10.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only admins can export data
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // List of all entities to export
    const entityNames = [
      'Member',
      'Leader',
      'Parent',
      'Section',
      'Event',
      'EventAttendance',
      'Programme',
      'Attendance',
      'BadgeDefinition',
      'BadgeModule',
      'BadgeRequirement',
      'MemberBadgeProgress',
      'MemberRequirementProgress',
      'BadgeStock',
      'MemberBadgeAward',
      'StockAdjustmentLog',
      'Payment',
      'ActionRequired',
      'ActionResponse',
      'ParentVolunteer',
      'LeaderAttendance',
      'RiskAssessment',
      'TodoTask',
      'Term',
      'MeetingBadge',
      'ProgrammeBadgeCriteria',
      'CommunicationPage',
      'BlockResponse',
      'PageView',
      'JoinEnquiry',
      'ChildRegistration',
      'VolunteerApplication',
      'WebsiteImage',
      'EventPhoto',
      'MemberInvitation',
      'EmailLog',
      'AuditLog'
    ];

    const zip = new JSZip();

    // Fetch and export each entity
    for (const entityName of entityNames) {
      try {
        const data = await base44.asServiceRole.entities[entityName].list();
        
        if (data && data.length > 0) {
          // Add JSON file
          zip.file(`${entityName}.json`, JSON.stringify(data, null, 2));

          // Convert to CSV
          const csv = convertToCSV(data);
          zip.file(`${entityName}.csv`, csv);
        }
      } catch (error) {
        console.log(`Could not export ${entityName}: ${error.message}`);
        // Continue with other entities even if one fails
      }
    }

    // Add export metadata
    const metadata = {
      export_date: new Date().toISOString(),
      exported_by: user.email,
      entity_count: entityNames.length,
    };
    zip.file('export_metadata.json', JSON.stringify(metadata, null, 2));

    // Generate zip file
    const zipBlob = await zip.generateAsync({ type: 'uint8array' });

    return new Response(zipBlob, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="scout-data-export-${new Date().toISOString().split('T')[0]}.zip"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// Helper function to convert JSON array to CSV
function convertToCSV(data) {
  if (!data || data.length === 0) return '';

  // Get all unique keys from all objects
  const allKeys = new Set();
  data.forEach(obj => {
    Object.keys(obj).forEach(key => allKeys.add(key));
  });
  const headers = Array.from(allKeys);

  // Create CSV header
  const csvRows = [headers.join(',')];

  // Create CSV rows
  data.forEach(obj => {
    const values = headers.map(header => {
      const value = obj[header];
      
      // Handle null/undefined
      if (value === null || value === undefined) return '';
      
      // Handle objects/arrays - stringify them
      if (typeof value === 'object') {
        return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
      }
      
      // Handle strings with commas or quotes
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      
      return stringValue;
    });
    csvRows.push(values.join(','));
  });

  return csvRows.join('\n');
}