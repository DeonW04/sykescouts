import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const POR_URL = 'https://prod-cms.scouts.org.uk//media/kqdiksgz/spring-2026-por-unmarked.pdf';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { chapterId, searchQuery } = await req.json();

    // Use the LLM to extract the chapter content from the POR PDF
    let prompt;

    if (searchQuery) {
      prompt = `You have access to the full Scout Association POR (Policy, Organisation and Rules) document Spring 2026 edition at this URL: ${POR_URL}

Please search the ENTIRE document for the phrase or topic: "${searchQuery}"

Return a JSON object with this structure:
{
  "results": [
    {
      "chapter": "Chapter name/number",
      "section": "Section number e.g. 1.1, 2a.3",
      "sectionTitle": "Section title",
      "excerpt": "The relevant text excerpt (2-4 sentences max)",
      "context": "Brief note on why this is relevant"
    }
  ]
}

Find up to 10 most relevant matches across all chapters. Include the actual rule/policy text, not just a reference to it.`;
    } else {
      // Map chapter IDs to descriptive names for the LLM
      const chapterMap = {
        'intro': 'Introduction to Policy, Organisation and Rules',
        'ch1': 'Chapter 1 Our Fundamentals',
        'ch2a': 'Chapter 2a Key policies',
        'ch2b': 'Chapter 2b Resolving concerns',
        'ch2c': 'Chapter 2c Our Volunteering Culture',
        'ch2d': 'Chapter 2d Citizenship',
        'ch2e': 'Chapter 2e Use of the Scouts name and marks',
        'ch3': 'Chapter 3 Membership',
        'ch4a': 'Chapter 4a The structure of local Scouting',
        'ch4b': 'Chapter 4b Our delivery sections',
        'ch5a': 'Chapter 5a Charity obligations for Groups Districts Counties',
        'ch5b': 'Chapter 5b Local governance of Groups Districts and Counties',
        'ch5c': 'Chapter 5c Constitutions of Groups Districts Counties except Scotland',
        'ch5d': 'Chapter 5d Constitutions for Scottish Groups Districts Regions',
        'ch5e': 'Chapter 5e Local finance of Groups Districts and Counties',
        'ch5f': 'Chapter 5f Fundraising grants and loans',
        'ch5g': 'Chapter 5g Insurance',
        'ch6': 'Chapter 6 The structure of the UK Headquarters',
        'ch7': 'Chapter 7 Emergency Procedures',
        'ch9a': 'Chapter 9a Activities',
        'ch9b': 'Chapter 9b Requirements for specific Activities',
        'ch10': 'Chapter 10 Uniform badges and emblems',
        'ch11': 'Chapter 11 Awards and recognition of service',
        'ch12': 'Chapter 12 Flags and ceremonial',
        'ch16': 'Chapter 16 Adult roles',
        'defs': 'Definitions of terms used in Policy Organisation and Rules',
      };

      const chapterName = chapterMap[chapterId] || chapterId;

      prompt = `You have access to the full Scout Association POR (Policy, Organisation and Rules) document Spring 2026 edition at this URL: ${POR_URL}

Please extract the COMPLETE content of: "${chapterName}"

Return a JSON object with this exact structure:
{
  "chapterTitle": "Full chapter title",
  "chapterIntro": "Brief intro paragraph for the chapter if present",
  "sections": [
    {
      "number": "e.g. Intro.1 or 1.1 or 2a.3 or 16.4",
      "title": "Section title",
      "content": "The FULL text content of this section, preserving all sub-points (a, b, c etc), lists, and rules. Do not truncate or summarise - include every rule and sub-rule.",
      "subsections": [
        {
          "number": "e.g. Intro.1.1 or 1.1.1",
          "title": "Subsection title",
          "content": "Full text of this subsection"
        }
      ]
    }
  ]
}

IMPORTANT: 
- Include ALL sections and subsections from this chapter, do not skip any
- Preserve ALL rule text verbatim - do not paraphrase or summarise
- Include lettered sub-points (a, b, c) within the content field
- If a section has no subsections, leave subsections as an empty array`;
    }

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      model: 'gemini_3_1_pro',
      add_context_from_internet: true,
      response_json_schema: searchQuery ? {
        type: 'object',
        properties: {
          results: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                chapter: { type: 'string' },
                section: { type: 'string' },
                sectionTitle: { type: 'string' },
                excerpt: { type: 'string' },
                context: { type: 'string' },
              }
            }
          }
        }
      } : {
        type: 'object',
        properties: {
          chapterTitle: { type: 'string' },
          chapterIntro: { type: 'string' },
          sections: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                number: { type: 'string' },
                title: { type: 'string' },
                content: { type: 'string' },
                subsections: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      number: { type: 'string' },
                      title: { type: 'string' },
                      content: { type: 'string' },
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    return Response.json({ success: true, data: result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});