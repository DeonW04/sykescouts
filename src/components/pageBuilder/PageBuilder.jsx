import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, GripVertical, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import HeadingBlock from './blocks/HeadingBlock';
import TextBlock from './blocks/TextBlock';
import ImageBlock from './blocks/ImageBlock';
import GalleryBlock from './blocks/GalleryBlock';
import ActionRequiredBlock from './blocks/ActionRequiredBlock';
import InteractiveBlock from './blocks/InteractiveBlock';

const blockTypes = [
  { id: 'heading', label: 'Heading', icon: '📝' },
  { id: 'text', label: 'Text', icon: '📄' },
  { id: 'image', label: 'Image', icon: '🖼️' },
  { id: 'gallery', label: 'Gallery', icon: '🎨' },
  { id: 'action_required', label: 'Action Required', icon: '✅' },
  { id: 'interactive', label: 'Interactive', icon: '❓' },
];

const blockComponents = {
  heading: HeadingBlock,
  text: TextBlock,
  image: ImageBlock,
  gallery: GalleryBlock,
  action_required: ActionRequiredBlock,
  interactive: InteractiveBlock,
};

export default function PageBuilder({ blocks = [], onBlocksChange, pageType }) {
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState(null);

  const addBlock = (blockType) => {
    const newBlock = {
      id: `block_${Date.now()}`,
      type: blockType,
      order: blocks.length,
      data: {},
    };
    onBlocksChange([...blocks, newBlock]);
    setShowBlockDialog(false);
  };

  const updateBlock = (blockId, blockData) => {
    const updated = blocks.map(b => b.id === blockId ? { ...b, data: blockData } : b);
    onBlocksChange(updated);
  };

  const deleteBlock = (blockId) => {
    onBlocksChange(blocks.filter(b => b.id !== blockId));
  };

  const handleDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination) return;
    if (source.index === destination.index) return;

    const reorderedBlocks = Array.from(blocks);
    const [movedBlock] = reorderedBlocks.splice(source.index, 1);
    reorderedBlocks.splice(destination.index, 0, movedBlock);
    onBlocksChange(reorderedBlocks);
  };

  const renderBlock = (block) => {
    const BlockComponent = blockComponents[block.type];
    if (!BlockComponent) return null;

    return (
      <Card key={block.id} className="p-4 bg-white border-l-4 border-l-blue-500">
        <div className="flex items-start gap-3">
          <GripVertical className="w-5 h-5 text-gray-400 mt-1 cursor-grab" />
          <div className="flex-1">
            <BlockComponent
              data={{ ...block.data, id: block.id }}
              onUpdate={(data) => updateBlock(block.id, data)}
              isEditing={editingBlockId === block.id}
              setIsEditing={(isEditing) => setEditingBlockId(isEditing ? block.id : null)}
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:bg-red-50"
            onClick={() => deleteBlock(block.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {/* Add Block Button */}
      <Button onClick={() => setShowBlockDialog(true)} className="bg-blue-600 hover:bg-blue-700 w-full">
        <Plus className="w-4 h-4 mr-2" />
        Add Block
      </Button>

      {/* Block Type Dialog */}
      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Block</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {blockTypes.map(type => (
              <Button
                key={type.id}
                variant="outline"
                className="h-auto flex-col py-4"
                onClick={() => addBlock(type.id)}
              >
                <span className="text-2xl mb-2">{type.icon}</span>
                <span className="text-sm">{type.label}</span>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Blocks */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="blocks">
          {(provided, snapshot) => (
            <div
              className={`space-y-3 ${snapshot.isDraggingOver ? 'bg-blue-50 p-3 rounded' : ''}`}
              {...provided.droppableProps}
              ref={provided.innerRef}
            >
              {blocks.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p>No blocks yet. Add one to get started.</p>
                </div>
              ) : (
                blocks.map((block, index) => (
                  <Draggable key={block.id} draggableId={block.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={snapshot.isDragging ? 'opacity-50' : ''}
                      >
                        <div {...provided.dragHandleProps} className="flex items-start gap-3">
                          <div className="flex-1">{renderBlock(block)}</div>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}