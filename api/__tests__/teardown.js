// Custom Jest teardown to handle async cleanup
module.exports = async () => {
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
  
  // Clear any remaining timers
  if (global.clearTimeout) {
    // Clear any pending timeouts
    const originalSetTimeout = global.setTimeout;
    const originalClearTimeout = global.clearTimeout;
    
    // Restore original functions
    global.setTimeout = originalSetTimeout;
    global.clearTimeout = originalClearTimeout;
  }
  
  // Wait for any remaining async operations
  await new Promise(resolve => setTimeout(resolve, 50));
};
