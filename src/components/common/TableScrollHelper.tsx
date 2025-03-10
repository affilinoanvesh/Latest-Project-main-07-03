import React, { useEffect, useState } from 'react';
import { ChevronUp } from 'lucide-react';

/**
 * A component that adds a "scroll to top" button to table containers
 * This helps users quickly return to the top of a table after scrolling down
 */
const TableScrollHelper: React.FC = () => {
  const [scrollButtons, setScrollButtons] = useState<HTMLButtonElement[]>([]);

  useEffect(() => {
    // Find all table containers
    const tableContainers = document.querySelectorAll('.overflow-x-auto');
    
    // Create scroll buttons for each container
    const buttons: HTMLButtonElement[] = [];
    
    tableContainers.forEach((container) => {
      // Only add button if container has a table
      if (container.querySelector('table')) {
        // Create button element
        const button = document.createElement('button');
        button.className = 'fixed bottom-4 right-4 bg-blue-500 text-white rounded-full p-2 shadow-lg opacity-0 transition-opacity duration-200 hover:bg-blue-600 focus:outline-none';
        button.style.zIndex = '50';
        button.style.display = 'none';
        
        // Add icon
        const icon = document.createElement('span');
        icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>`;
        button.appendChild(icon);
        
        // Add to DOM
        document.body.appendChild(button);
        buttons.push(button);
        
        // Add scroll event listener to container
        container.addEventListener('scroll', () => {
          if (container.scrollTop > 100) {
            button.style.display = 'block';
            setTimeout(() => {
              button.style.opacity = '1';
            }, 10);
          } else {
            button.style.opacity = '0';
            setTimeout(() => {
              button.style.display = 'none';
            }, 200);
          }
        });
        
        // Add click event to button
        button.addEventListener('click', () => {
          container.scrollTo({
            top: 0,
            behavior: 'smooth'
          });
        });
      }
    });
    
    setScrollButtons(buttons);
    
    // Cleanup function
    return () => {
      buttons.forEach(button => {
        document.body.removeChild(button);
      });
    };
  }, []);
  
  // This component doesn't render anything directly
  return null;
};

export default TableScrollHelper; 