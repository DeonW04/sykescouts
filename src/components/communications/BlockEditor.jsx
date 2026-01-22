import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, Edit2, GripVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export default function BlockEditor({ blocks = [], onBlocksChange }) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingBlock, setEditingBlock] = useState(null);
  const [blockType, setBlockType] = useState('heading');
  const [blockData, setBlockData] = useState({});

  const blockTypes = [
    { id: 'heading', label: 'Heading', icon: 'H' },
    { id: 'text', label: 'Text Block', icon: 'T' },
    { id: 'image', label: 'Image', icon: 'I' },
    { id: 'gallery', label: 'Gallery', icon: 'G' },
    { id: 'question', label: 'Question', icon: 'Q' },
    { id: 'vote', label: 'Poll/Vote', icon: 'V' },
  ];

  const handleAddBlock = () => {
    const newBlock = {
      id: Math.random().toString(36).substring(7),
      type: blockType,
      order: blocks.length,
      data: blockData,
    };
    onBlocksChange([...blocks, newBlock]);
    setBlockType('heading');
    setBlockData({});
    setShowAddDialog(false);
  };

  const handleUpdateBlock = () => {
    const updated = blocks.map(b => b.id === editingBlock.id ? { ...b, data: blockData } : b);
    onBlocksChange(updated);
    setEditingBlock(null);
    setBlockData({});
  };

  const handleDeleteBlock = (id) => {
    onBlocksChange(blocks.filter(b => b.id !== id));
  };

  const handleDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination) return;

    const newBlocks = Array.from(blocks);
    const [removed] = newBlocks.splice(source.index, 1);
    newBlocks.splice(destination.index, 0, removed);

    const reordered = newBlocks.map((b, idx) => ({ ...b, order: idx }));
    onBlocksChange(reordered);
  };

  const getBlockPreview = (block) => {
    const previews = {
      heading: `Heading: ${block.data.text || 'Untitled'}`,
      text: `Text: ${block.data.content?.substring(0, 50) || 'No content'}...`,
      image: `Image: ${block.data.url ? 'Uploaded' : 'No image'}`,
      gallery: `Gallery: ${block.data.images?.length || 0} images`,
      question: `Question: ${block.data.question || 'No question'}`,
      vote: `Poll: ${block.data.question || 'No question'}`,
    };
    return previews[block.type] || 'Block';
  };

  return (
    <div className="space-y-4">
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="blocks">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
              {blocks.length === 0 ? (
                <div className="p-8 border-2 border-dashed border-gray-300 rounded-lg text-center text-gray-500">
                  No blocks yet. Add one to get started.
                </div>
              ) : (
                blocks.map((block, index) => (
                  <Draggable key={block.id} draggableId={block.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`${snapshot.isDragging ? 'opacity-50' : ''}`}
                      >
                        <Card>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <div {...provided.dragHandleProps} className="cursor-grab">
                                <GripVertical className="w-5 h-5 text-gray-400" />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium">{getBlockPreview(block)}</p>
                                <p className="text-xs text-gray-500">{block.type}</p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingBlock(block);
                                    setBlockType(block.type);
                                    setBlockData(block.data);
                                  }}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 hover:bg-red-50"
                                  onClick={() => handleDeleteBlock(block.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
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

      <Button onClick={() => setShowAddDialog(true)} className="w-full bg-blue-600 hover:bg-blue-700">
        <Plus className="w-4 h-4 mr-2" />
        Add Block
      </Button>

      {/* Add/Edit Block Dialog */}
      <Dialog open={showAddDialog || !!editingBlock} onOpenChange={(open) => {
        if (!open) {
          setShowAddDialog(false);
          setEditingBlock(null);
          setBlockData({});
        }
      }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBlock ? 'Edit Block' : 'Add New Block'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!editingBlock && (
              <div>
                <label className="text-sm font-medium block mb-2">Block Type</label>
                <Select value={blockType} onValueChange={setBlockType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {blockTypes.map(type => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Block-specific fields */}
            {blockType === 'heading' && (
              <div>
                <label className="text-sm font-medium block mb-2">Heading Text</label>
                <Input
                  value={blockData.text || ''}
                  onChange={(e) => setBlockData({ ...blockData, text: e.target.value })}
                  placeholder="Enter heading..."
                />
              </div>
            )}

            {blockType === 'text' && (
              <div>
                <label className="text-sm font-medium block mb-2">Content</label>
                <Textarea
                  value={blockData.content || ''}
                  onChange={(e) => setBlockData({ ...blockData, content: e.target.value })}
                  placeholder="Enter text content..."
                  className="min-h-32"
                />
              </div>
            )}

            {blockType === 'image' && (
              <div>
                <label className="text-sm font-medium block mb-2">Image URL</label>
                <Input
                  value={blockData.url || ''}
                  onChange={(e) => setBlockData({ ...blockData, url: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            )}

            {blockType === 'gallery' && (
              <div>
                <label className="text-sm font-medium block mb-2">Gallery Title</label>
                <Input
                  value={blockData.title || ''}
                  onChange={(e) => setBlockData({ ...blockData, title: e.target.value })}
                  placeholder="Gallery title..."
                />
              </div>
            )}

            {blockType === 'question' && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium block mb-2">Question</label>
                  <Input
                    value={blockData.question || ''}
                    onChange={(e) => setBlockData({ ...blockData, question: e.target.value })}
                    placeholder="Ask a question..."
                  />
                </div>
              </div>
            )}

            {blockType === 'vote' && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium block mb-2">Poll Question</label>
                  <Input
                    value={blockData.question || ''}
                    onChange={(e) => setBlockData({ ...blockData, question: e.target.value })}
                    placeholder="What should they vote on?"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-2">Options (comma-separated)</label>
                  <Input
                    value={blockData.options?.join(', ') || ''}
                    onChange={(e) => setBlockData({ ...blockData, options: e.target.value.split(',').map(o => o.trim()) })}
                    placeholder="Option 1, Option 2, Option 3"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddDialog(false);
                setEditingBlock(null);
                setBlockData({});
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={editingBlock ? handleUpdateBlock : handleAddBlock}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {editingBlock ? 'Update' : 'Add'} Block
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}