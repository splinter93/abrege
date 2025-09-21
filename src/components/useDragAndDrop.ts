import { PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { DRAG_SENSOR_CONFIG } from '@/constants/dragAndDropConfig';

interface UseDragAndDropProps<T> {
  items: T[];
  onReorder: (newItems: T[]) => void;
  getId: (item: T) => string;
}

export function useDragAndDrop<T>({ items, onReorder, getId }: UseDragAndDropProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: DRAG_SENSOR_CONFIG.items })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((item) => getId(item) === active.id);
    const newIndex = items.findIndex((item) => getId(item) === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const newItems = arrayMove(items, oldIndex, newIndex);
    onReorder(newItems);
  };

  return {
    sensors,
    handleDragEnd,
    SortableContext,
    strategy: verticalListSortingStrategy,
  };
} 