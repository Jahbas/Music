import { useOutletContext } from "react-router-dom";

export type DragContext = {
  dragActive: boolean;
  draggingTrackIds: string[];
  onDragStart: (trackIds: string[]) => void;
  onDragEnd: () => void;
};

export const useDragContext = () => useOutletContext<DragContext>();
