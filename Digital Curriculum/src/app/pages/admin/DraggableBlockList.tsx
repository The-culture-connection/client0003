/**
 * Draggable Block List Component
 * Handles drag-and-drop reordering of blocks
 */

import { useState } from "react";
import { useDrag, useDrop } from "react-dnd";
import { Button } from "../../components/ui/button";
import { Trash2, GripVertical } from "lucide-react";
import { Block } from "../../lib/curriculum";

interface DraggableBlockListProps {
  blocks: Block[];
  selectedBlockId: string | null;
  onSelectBlock: (blockId: string | null) => void;
  onDeleteBlock: (blockId: string) => void;
  onReorderBlocks: (newOrder: string[]) => void;
}

const ItemType = "BLOCK";

interface DraggableBlockItemProps {
  block: Block;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onMove: (dragIndex: number, hoverIndex: number) => void;
}

function DraggableBlockItem({
  block,
  index,
  isSelected,
  onSelect,
  onDelete,
  onMove,
}: DraggableBlockItemProps) {
  const [{ isDragging }, drag] = useDrag({
    type: ItemType,
    item: { id: block.id, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: ItemType,
    hover: (draggedItem: { id: string; index: number }) => {
      if (draggedItem.id !== block.id) {
        onMove(draggedItem.index, index);
        draggedItem.index = index;
      }
    },
  });

  const opacity = isDragging ? 0.5 : 1;

  return (
    <div
      ref={(node) => drag(drop(node))}
      className={`
        p-3 border rounded-lg cursor-pointer transition-colors flex items-center gap-2
        ${isSelected ? "border-accent bg-accent/10" : "border-border hover:bg-muted/50"}
      `}
      style={{ opacity }}
      onClick={onSelect}
    >
      <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
      <span className="text-sm font-medium capitalize flex-1">{block.type}</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}

export function DraggableBlockList({
  blocks,
  selectedBlockId,
  onSelectBlock,
  onDeleteBlock,
  onReorderBlocks,
}: DraggableBlockListProps) {
  const sortedBlocks = [...blocks].sort((a, b) => (a.order || 0) - (b.order || 0));
  const [blockOrder, setBlockOrder] = useState<string[]>(
    sortedBlocks.map((b) => b.id || "").filter(Boolean)
  );

  const moveBlock = (dragIndex: number, hoverIndex: number) => {
    const newOrder = [...blockOrder];
    const [removed] = newOrder.splice(dragIndex, 1);
    newOrder.splice(hoverIndex, 0, removed);
    setBlockOrder(newOrder);
    onReorderBlocks(newOrder);
  };

  return (
    <div className="space-y-2">
      {sortedBlocks.map((block, index) => {
        const actualIndex = blockOrder.indexOf(block.id || "");
        if (actualIndex === -1) return null;

        return (
          <DraggableBlockItem
            key={block.id}
            block={block}
            index={actualIndex}
            isSelected={selectedBlockId === block.id}
            onSelect={() => onSelectBlock(block.id || null)}
            onDelete={() => {
              if (block.id) {
                onDeleteBlock(block.id);
                setBlockOrder(blockOrder.filter((id) => id !== block.id));
              }
            }}
            onMove={moveBlock}
          />
        );
      })}
    </div>
  );
}
