import React, { useEffect, useState } from 'react';
import { ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * A component that adds scroll helpers to table containers
 * This helps users navigate tables on smaller screens
 */
const TableScrollHelper: React.FC = () => {
  const [scrollButtons, setScrollButtons] = useState<HTMLButtonElement[]>([]);
  const [horizontalScrollButtons, setHorizontalScrollButtons] = useState<{left: HTMLButtonElement, right: HTMLButtonElement}[]>([]);

  useEffect(() => {
    // Find all table containers
    const tableContainers = document.querySelectorAll('.overflow-x-auto');
    
    // Create scroll buttons for each container
    const buttons: HTMLButtonElement[] = [];
    const hScrollButtons: {left: HTMLButtonElement, right: HTMLButtonElement}[] = [];
    
    tableContainers.forEach((container) => {
      // Only add button if container has a table
      if (container.querySelector('table')) {
        // Create vertical scroll button
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
        
        // Create horizontal scroll buttons (only visible on small screens)
        const leftButton = document.createElement('button');
        leftButton.className = 'fixed left-2 top-1/2 -translate-y-1/2 bg-blue-500 text-white rounded-full p-2 shadow-lg opacity-0 transition-opacity duration-200 hover:bg-blue-600 focus:outline-none';
        leftButton.style.zIndex = '50';
        leftButton.style.display = 'none';
        
        const leftIcon = document.createElement('span');
        leftIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>`;
        leftButton.appendChild(leftIcon);
        
        const rightButton = document.createElement('button');
        rightButton.className = 'fixed right-2 top-1/2 -translate-y-1/2 bg-blue-500 text-white rounded-full p-2 shadow-lg opacity-0 transition-opacity duration-200 hover:bg-blue-600 focus:outline-none';
        rightButton.style.zIndex = '50';
        rightButton.style.display = 'none';
        
        const rightIcon = document.createElement('span');
        rightIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>`;
        rightButton.appendChild(rightIcon);
        
        document.body.appendChild(leftButton);
        document.body.appendChild(rightButton);
        hScrollButtons.push({ left: leftButton, right: rightButton });
        
        // Add scroll event listener to container for vertical scrolling
        container.addEventListener('scroll', () => {
          // Vertical scroll button
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
          
          // Horizontal scroll buttons (only on small screens)
          if (window.innerWidth < 768 && container.scrollWidth > container.clientWidth) {
            // Show/hide left button based on scroll position
            if (container.scrollLeft > 20) {
              leftButton.style.display = 'block';
              setTimeout(() => {
                leftButton.style.opacity = '1';
              }, 10);
            } else {
              leftButton.style.opacity = '0';
              setTimeout(() => {
                leftButton.style.display = 'none';
              }, 200);
            }
            
            // Show/hide right button based on scroll position
            if (container.scrollLeft < container.scrollWidth - container.clientWidth - 20) {
              rightButton.style.display = 'block';
              setTimeout(() => {
                rightButton.style.opacity = '1';
              }, 10);
            } else {
              rightButton.style.opacity = '0';
              setTimeout(() => {
                rightButton.style.display = 'none';
              }, 200);
            }
          }
        });
        
        // Add resize event listener to show/hide horizontal scroll buttons
        window.addEventListener('resize', () => {
          if (window.innerWidth < 768 && container.scrollWidth > container.clientWidth) {
            // Check if we need to show the buttons based on scroll position
            if (container.scrollLeft > 20) {
              leftButton.style.display = 'block';
              leftButton.style.opacity = '1';
            }
            
            if (container.scrollLeft < container.scrollWidth - container.clientWidth - 20) {
              rightButton.style.display = 'block';
              rightButton.style.opacity = '1';
            }
          } else {
            // Hide buttons on larger screens
            leftButton.style.display = 'none';
            rightButton.style.display = 'none';
          }
        });
        
        // Add click event to vertical scroll button
        button.addEventListener('click', () => {
          container.scrollTo({
            top: 0,
            behavior: 'smooth'
          });
        });
        
        // Add click events to horizontal scroll buttons
        leftButton.addEventListener('click', () => {
          container.scrollBy({
            left: -200,
            behavior: 'smooth'
          });
        });
        
        rightButton.addEventListener('click', () => {
          container.scrollBy({
            left: 200,
            behavior: 'smooth'
          });
        });
      }
    });
    
    setScrollButtons(buttons);
    setHorizontalScrollButtons(hScrollButtons);
    
    // Cleanup function
    return () => {
      buttons.forEach(button => {
        document.body.removeChild(button);
      });
      
      hScrollButtons.forEach(({ left, right }) => {
        document.body.removeChild(left);
        document.body.removeChild(right);
      });
    };
  }, []);
  
  // This component doesn't render anything directly
  return null;
};

export default TableScrollHelper; 