import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { useLocation } from 'react-router-dom';
import HeadingBlock from '../components/pageBuilder/blocks/HeadingBlock';
import TextBlock from '../components/pageBuilder/blocks/TextBlock';
import ImageBlock from '../components/pageBuilder/blocks/ImageBlock';
import GalleryBlock from '../components/pageBuilder/blocks/GalleryBlock';
import ActionRequiredBlock from '../components/pageBuilder/blocks/ActionRequiredBlock';
import InteractiveBlock from '../components/pageBuilder/blocks/InteractiveBlock';

export default function SharedPage() {
  const location = useLocation();
  const [pageId, setPageId] = useState(null);

  useEffect(() => {
    const id = location.pathname.split('/').pop();
    setPageId(id);
  }, [location]);

  const { data: page, isLoading, error } = useQuery({
    queryKey: ['shared-page', pageId],
    queryFn: async () => {
      if (!pageId) return null;
      const response = await base44.functions.invoke('getSharedPage');
      return response.data;
    },
    enabled: !!pageId,
  });

  // Record page view
  useEffect(() => {
    if (page?.page_id) {
      base44.entities.PageView.create({
        page_id: page.page_id,
        viewed_date: new Date().toISOString(),
        session_id: sessionId,
      });

      // Increment view count
      base44.entities.CommunicationPage.update(page.id, {
        view_count: (page.view_count || 0) + 1,
      });
    }
  }, [page?.id, page?.page_id]);

  const blockComponents = {
    heading: HeadingBlock,
    text: TextBlock,
    image: ImageBlock,
    gallery: GalleryBlock,
    action_required: ActionRequiredBlock,
    question: InteractiveBlock,
    poll: InteractiveBlock,
    text_input: InteractiveBlock,
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-12 text-center">
            <p className="text-gray-600">Page not found or has been removed.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{page.title}</h1>
          {page.description && (
            <p className="text-lg text-gray-600">{page.description}</p>
          )}
        </div>

        {/* Content Blocks */}
        <div className="space-y-6">
          {(!page.blocks || page.blocks.length === 0) ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-gray-500">No content available</p>
              </CardContent>
            </Card>
          ) : (
            page.blocks.map((block, index) => {
              const BlockComponent = blockComponents[block.type];
              
              if (!BlockComponent) {
                return (
                  <Card key={block.id || index}>
                    <CardContent className="p-6 text-center text-gray-500">
                      Unknown block type: {block.type}
                    </CardContent>
                  </Card>
                );
              }

              return (
                <div key={block.id || index} className="bg-white rounded-lg shadow-sm p-6">
                  <BlockComponent
                    block={block}
                    pageId={page.page_id}
                    isPreview={true}
                  />
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>Published on {new Date(page.published_date).toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}