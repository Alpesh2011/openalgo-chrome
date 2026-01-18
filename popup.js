document.addEventListener('DOMContentLoaded', function() {
  // Update status message to reflect new functionality
  const statusEl = document.querySelector('.status-text');
  if (statusEl) {
    statusEl.textContent = "🚀 Options Trading Ready\nConfigure strikes in settings";
    statusEl.classList.add('success');
  }
  
  // Add migration notice for existing users
  chrome.storage.sync.get(['symbols', 'baseSymbol'], function(settings) {
    const helpText = document.querySelector('.help-text');
    if (helpText) {
      if (settings.baseSymbol) {
        helpText.innerHTML = `
          <strong>Active Configuration:</strong><br>
          • Base: ${settings.baseSymbol}<br>
          • ${settings.symbols?.length || 0} strike(s) configured<br>
          • Use settings (⋮) to modify
        `;
      } else {
        helpText.innerHTML = `
          <strong>New Professional Features:</strong><br>
          • Base Symbol + Strikes builder<br>
          • Multi-strike options trading<br>
          • Resizable trading window<br>
          • Quick connection testing
        `;
      }
    }
  });
});