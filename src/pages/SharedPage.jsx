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
import FileAttachmentBlock from '../components/pageBuilder/blocks/FileAttachmentBlock';

export default function SharedPage() {
  const location = useLocation();
  const [pageId, setPageId] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    if (id) {
      setPageId(id);
    }
  }, [location]);

  const { data: page, isLoading, error } = useQuery({
    queryKey: ['shared-page', pageId],
    queryFn: async () => {
      if (!pageId) return null;
      try {
        const response = await base44.functions.invoke('getSharedPage', { pageId });
        return response.data;
      } catch (err) {
        throw err;
      }
    },
    enabled: !!pageId,
  });

  const blockComponents = {
    heading: HeadingBlock,
    text: TextBlock,
    image: ImageBlock,
    gallery: GalleryBlock,
    file_attachment: FileAttachmentBlock,
    action_required: ActionRequiredBlock,
    question: InteractiveBlock,
    poll: InteractiveBlock,
    text_input: InteractiveBlock,
    interactive: InteractiveBlock,
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Header Bar */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69540f3779bf32f5ccc6335b/e8eca937a_image.png" 
                alt="40th Rochdale (Syke) Scouts" 
                className="h-12 w-auto"
              />
              <span className="text-lg font-bold text-gray-900 hidden sm:inline">40th Rochdale (Syke) Scouts</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-block px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full mb-4">
            <p className="text-sm font-semibold">Shared Update</p>
          </div>
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
                <BlockComponent
                  key={block.id || index}
                  data={{ ...block.data, id: block.id }}
                  pageId={page.page_id}
                  pageType={page.type}
                  isEditing={false}
                  setIsEditing={() => {}}
                  onUpdate={() => {}}
                  isPublicView={true}
                />
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