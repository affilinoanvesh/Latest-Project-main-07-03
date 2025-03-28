import { useEffect, useState } from 'react';
import { Droppable, DroppableProps } from 'react-beautiful-dnd';

/**
 * Wrapper for react-beautiful-dnd Droppable that enables it to work in StrictMode
 * 
 * This is a workaround for the known issue where react-beautiful-dnd doesn't work properly
 * with React's StrictMode due to the way it handles double-mounting components in development.
 */
export const StrictModeDroppable = ({ children, ...props }: DroppableProps) => {
  const [enabled, setEnabled] = useState(false);
  
  useEffect(() => {
    // This timeout allows the Droppable to mount properly in StrictMode
    const animation = requestAnimationFrame(() => setEnabled(true));
    
    return () => {
      cancelAnimationFrame(animation);
      setEnabled(false);
    };
  }, []);
  
  if (!enabled) {
    return null;
  }
  
  return <Droppable {...props}>{children}</Droppable>;
}; 