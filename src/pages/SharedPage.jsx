import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useLocation } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import HeadingBlock from '../components/pageBuilder/blocks/HeadingBlock';
import TextBlock from '../components/pageBuilder/blocks/TextBlock';
import ImageBlock from '../components/pageBuilder/blocks/ImageBlock';
import GalleryBlock from '../components/pageBuilder/blocks/GalleryBlock';
import ActionRequiredBlock from '../components/pageBuilder/blocks/ActionRequiredBlock';
import InteractiveBlock from '../components/pageBuilder/blocks/InteractiveBlock';

const blockComponents = {
  heading: HeadingBlock,
  text: TextBlock,
  image: ImageBlock,
  gallery: GalleryBlock,
  action_required: ActionRequiredBlock,
  interactive: InteractiveBlock,
};

export default function SharedPage() {
  const location = useLocation();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const pageId = location.pathname.split('/').pop();
    
    const fetchPage = async () => {
      try {
        const result = await base44.entities.CommunicationPage.filter({ page_id: pageId });
        if (result && result[0]) {
          setPage(result[0]);
          // Log view
          await base44.entities.PageView.create({
            page_id: pageId,
            viewed_date: new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error('Page not found');
      } finally {
        setLoading(false);
      }
    };

    fetchPage();
  }, [location]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h1>
          <p className="text-gray-600">This page doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white py-8">
        <div className="max-w-3xl mx-auto px-4">
          <h1 className="text-3xl font-bold">{page.title}</h1>
          {page.description && (
            <p className="text-white/80 mt-2">{page.description}</p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="space-y-6">
          {page.blocks && page.blocks.length > 0 ? (
            page.blocks.map((block) => {
              const BlockComponent = blockComponents[block.type];
              if (!BlockComponent) return null;
              
              return (
                <div key={block.id} className="bg-white rounded-lg p-6 shadow-sm">
                  <BlockComponent
                    data={block.data}
                    onUpdate={() => {}}
                    isEditing={false}
                    setIsEditing={() => {}}
                  />
                </div>
              );
            })
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-gray-600">No content available</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}