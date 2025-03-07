// This script helps handle page refreshes in SPAs
(function() {
  // If we're not on the root path and not using hash routing
  if (window.location.pathname !== '/' && !window.location.hash) {
    // Store the current path
    const path = window.location.pathname;
    
    // Redirect to the root with the path as a hash
    window.location.href = '/#' + path;
  }
})(); 