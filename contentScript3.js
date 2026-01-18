// contentScript.js
// Injected trading controls (modified to route API calls via background service worker)

let isProcessing = false;

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "injectButtons") {
    injectTradingButtons();
    sendResponse({success: true});
  } else if (request.action === "updateSettings") {
    // Update settings from popup if needed
    sendResponse({success: true});
  }
  return true;
});

// Automatically inject trading buttons when page loads
document.addEventListener('DOMContentLoaded', function() {
  injectTradingButtons();
});

// In case the document is already loaded
if (document.readyState === 'interactive' || document.readyState === 'complete') {
  injectTradingButtons();
}

// Function to inject trading buttons into the page
function injectTradingButtons() {
  // Check if buttons already exist
  if (document.getElementById('openalgo-controls')) {
    return;
  }
  
  // Create container for buttons
  const container = document.createElement('div');
  container.id = 'openalgo-controls';
  container.className = 'openalgo-controls-container';
  
  // Add draggable functionality
  makeDraggable(container);
  
  // Create buttons
  const buttons = [
    { id: 'le-button', text: 'LE', color: 'success', action: 'longEntry', tooltip: 'Long Entry' },
    { id: 'lx-button', text: 'LX', color: 'warning', action: 'longExit', tooltip: 'Long Exit' },
    { id: 'se-button', text: 'SE', color: 'error', action: 'shortEntry', tooltip: 'Short Entry' },
    { id: 'sx-button', text: 'SX', color: 'info', action: 'shortExit', tooltip: 'Short Exit' }
  ];
  
  // Create buttons container
  const buttonsContainer = document.createElement('div');
  buttonsContainer.className = 'openalgo-buttons-row';
  
  buttons.forEach(button => {
    const btn = document.createElement('button');
    btn.id = button.id;
    btn.textContent = button.text;
    btn.className = `openalgo-button btn-${button.color}`;
    btn.setAttribute('title', button.tooltip);
    btn.addEventListener('click', () => handleButtonClick(button.action));
    buttonsContainer.appendChild(btn);
  });
  
  // Add settings icon to the buttons container
  const settingsIcon = document.createElement('button');
  settingsIcon.className = 'openalgo-settings-icon';
  settingsIcon.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
      <circle cx="8" cy="4" r="1.5"/>
      <circle cx="8" cy="8" r="1.5"/>
      <circle cx="8" cy="12" r="1.5"/>
    </svg>
  `;
  settingsIcon.addEventListener('click', toggleSettings);
  settingsIcon.setAttribute('title', 'OpenAlgo Settings');
  buttonsContainer.appendChild(settingsIcon);
  
  // Add the buttons container to the main container
  container.appendChild(buttonsContainer);
  
  // Create settings panel
  const settingsPanel = document.createElement('div');
  settingsPanel.id = 'openalgo-settings-panel';
  settingsPanel.className = 'openalgo-settings-panel hidden';
  
  // Make sure settings panel receives all mouse events
  settingsPanel.addEventListener('mousedown', (e) => {
    e.stopPropagation();
  });
  
  // Load settings from storage
  chrome.storage.sync.get(['hostUrl', 'apiKey', 'symbol','symbol1', 'exchange', 'product', 'quantity', 'panelPosition'], function(settings) {
    settingsPanel.innerHTML = `
      <div class="card-body p-3">
        <h3 class="card-title text-xs">Settings</h3>
        <div class="settings-form">
          <div class="form-group">
            <label for="hostUrl">Host URL</label>
            <input type="text" id="hostUrl" value="${settings.hostUrl || 'http://127.0.0.1:5000'}" class="input input-bordered input-xs" placeholder="Host URL">
          </div>
          <div class="form-group">
            <label for="apiKey">API Key</label>
            <input type="text" id="apiKey" value="${settings.apiKey || ''}" class="input input-bordered input-xs" placeholder="API Key">
          </div>
          <div class="form-group">
            <label for="symbol">Symbol</label>
            <input type="text" id="symbol" value="${settings.symbol || ''}" class="input input-bordered input-xs" placeholder="Symbol">
          </div>
          <div class="form-group">
            <label for="symbol1">Symbol1</label>
            <input type="text" id="symbol1" value="${settings.symbol1 || ''}" class="input input-bordered input-xs" placeholder="Symbol1 (Optional)">
          </div>
          <div class="form-group">
            <label for="exchange">Exchange</label>
            <select id="exchange" class="select select-bordered select-xs">
              <option value="NSE" ${settings.exchange === 'NSE' ? 'selected' : ''}>NSE</option>
              <option value="BSE" ${settings.exchange === 'BSE' ? 'selected' : ''}>BSE</option>
              <option value="BFO" ${settings.exchange === 'BFO' ? 'selected' : ''}>BFO</option>
              <option value="NFO" ${settings.exchange === 'NFO' ? 'selected' : ''}>NFO</option>
              <option value="MCX" ${settings.exchange === 'MCX' ? 'selected' : ''}>MCX</option>
              <option value="CDS" ${settings.exchange === 'CDS' ? 'selected' : ''}>CDS</option>
            </select>
          </div>
          <div class="form-group">
            <label for="product">Product</label>
            <select id="product" class="select select-bordered select-xs">
              <option value="MIS" ${settings.product === 'MIS' ? 'selected' : ''}>MIS</option>
              <option value="NRML" ${settings.product === 'NRML' ? 'selected' : ''}>NRML</option>
              <option value="CNC" ${settings.product === 'CNC' ? 'selected' : ''}>CNC</option>
            </select>
          </div>
          <div class="form-group">
            <label for="quantity">Quantity</label>
            <input type="number" id="quantity" value="${settings.quantity || ''}" class="input input-bordered input-xs" placeholder="Quantity">
          </div>
          <button id="saveSettings" class="btn btn-primary btn-xs w-full mt-2">Save</button>
        </div>
      </div>
    `;
    
    // Attach event listeners to all inputs to stop propagation
    const inputs = settingsPanel.querySelectorAll('input, select');
    inputs.forEach(input => {
      input.addEventListener('mousedown', (e) => {
        e.stopPropagation();
      });
      
      input.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    });
    
    // Save settings button handler
    settingsPanel.querySelector('#saveSettings').addEventListener('click', function(e) {
      e.stopPropagation();
      
      const newSettings = {
        hostUrl: settingsPanel.querySelector('#hostUrl').value,
        apiKey: settingsPanel.querySelector('#apiKey').value,
        symbol: settingsPanel.querySelector('#symbol').value,
        symbol1: settingsPanel.querySelector('#symbol1').value,
        exchange: settingsPanel.querySelector('#exchange').value,
        product: settingsPanel.querySelector('#product').value,
        quantity: settingsPanel.querySelector('#quantity').value
      };
      
      chrome.storage.sync.set(newSettings, function() {
        showNotification('Settings saved successfully!', 'success');
        toggleSettings();
      });
    });
    
    // Apply saved panel position if available
    if (settings.panelPosition) {
      try {
        container.style.top = settings.panelPosition.top || container.style.top;
        container.style.left = settings.panelPosition.left || container.style.left;
      } catch (err) {
        // ignore
      }
    }
  });
  
  container.appendChild(settingsPanel);
  
  // Default position for all sites
  container.style.top = '100px';
  container.style.left = '20px';
  document.body.appendChild(container);
}

// Toggle settings panel
function toggleSettings() {
  const settingsPanel = document.getElementById('openalgo-settings-panel');
  settingsPanel.classList.toggle('hidden');
}

// Make an element draggable
function makeDraggable(element) {
  let isDragging = false;
  let offsetX, offsetY;
  
  element.style.position = 'fixed';
  element.style.zIndex = '10000';
  
  // Add handle for dragging
  const handle = document.createElement('div');
  handle.className = 'openalgo-drag-handle';
  element.appendChild(handle);
  
  element.addEventListener('mousedown', startDrag);
  
  function startDrag(e) {
    // Don't start dragging if clicked on a form element or the settings panel
    if (e.target.tagName === 'INPUT' || 
        e.target.tagName === 'SELECT' || 
        e.target.tagName === 'BUTTON' || 
        e.target.closest('#openalgo-settings-panel')) {
      return;
    }
    
    isDragging = true;
    offsetX = e.clientX - element.getBoundingClientRect().left;
    offsetY = e.clientY - element.getBoundingClientRect().top;
    
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDrag);
    
    // Prevent text selection during drag
    e.preventDefault();
  }
  
  function drag(e) {
    if (isDragging) {
      element.style.left = (e.clientX - offsetX) + 'px';
      element.style.top = (e.clientY - offsetY) + 'px';
    }
  }
  
  function stopDrag() {
    isDragging = false;
    // persist position
    chrome.storage.sync.set({
      panelPosition: { top: element.style.top, left: element.style.left }
    });
    document.removeEventListener('mousemove', drag);
    document.removeEventListener('mouseup', stopDrag);
  }
}

// Handle button clicks and API calls
function handleButtonClick(action) {
  if (isProcessing) {
    showNotification('Please wait — processing previous request', 'warning', false, 3000);
    return;
  }
  isProcessing = true;
  chrome.storage.sync.get(['hostUrl', 'apiKey', 'symbol', 'symbol1', 'exchange', 'product', 'quantity'], function(settings) {
    if (!settings.hostUrl || !settings.apiKey || !settings.symbol || !settings.exchange || !settings.product || !settings.quantity) {
      showNotification('Error: Please complete all settings first!', 'error');
      toggleSettings(); // Show settings panel if settings are incomplete
      isProcessing = false;
      return;
    }
    
    // Collect symbols to trade
    const symbols = [settings.symbol];
    if (settings.symbol1 && settings.symbol1.trim() !== '') {
      symbols.push(settings.symbol1);
    }
    
    // Helper function to create clean settings object for each symbol
    const createSymbolSettings = (symbol) => ({
      hostUrl: settings.hostUrl,
      apiKey: settings.apiKey,
      symbol: symbol,
      exchange: settings.exchange,
      product: settings.product,
      quantity: settings.quantity
    });
    
    // Execute orders in parallel for all symbols (no delay)
    const executeOrdersInParallel = (orderFunction, transactionType, actionText) => {
      showNotification(`Processing ${actionText} for ${symbols.length} symbol(s)...`, 'info');
      
      const orderPromises = symbols.map(symbol => {
        return new Promise((resolve, reject) => {
          const symbolSettings = createSymbolSettings(symbol);
          orderFunction(transactionType, symbolSettings, symbol)
            .then(result => resolve({ symbol, result }))
            .catch(error => reject({ symbol, error }));
        });
      });
      
      // Wait for all orders to complete
      Promise.allSettled(orderPromises).then(results => {
        const successful = results.filter(r => r.status === 'fulfilled');
        const failed = results.filter(r => r.status === 'rejected');
        
        // Build detailed notification message
        let messages = [];
        successful.forEach(result => {
          const orderid = result.value.result?.orderid || 'N/A';
          messages.push(`✓ ${result.value.symbol}: Success (Order ID: ${orderid})`);
        });
        failed.forEach(result => {
          console.error('Order failed for', result.reason.symbol, result.reason.error);
          const errorMsg = result.reason.error?.message || 
                          result.reason.error?.data?.message || 
                          JSON.stringify(result.reason.error) || 
                          'Unknown error';
          messages.push(`✗ ${result.reason.symbol}: ${errorMsg}`);
        });
        
        if (failed.length > 0 && successful.length > 0) {
          showNotification(`Mixed results: ${successful.length} successful, ${failed.length} failed\n${messages.join('\n')}`, 'warning', false, 8000);
        } else if (failed.length > 0) {
          showNotification(`All orders failed:\n${messages.join('\n')}`, 'error', false, 8000);
        } else {
          showNotification(`All ${successful.length} orders placed successfully!\n${messages.join('\n')}`, 'success', false, 8000);
        }
        isProcessing = false;
      }).catch(err => {
        console.error('Unexpected error waiting for orders:', err);
        showNotification('Unexpected error while placing orders', 'error');
        isProcessing = false;
      });
    };
    
    switch (action) {
      case 'longEntry':
        executeOrdersInParallel(placeOrder, 'BUY', 'Long Entry');
        break;
      case 'longExit':
        executeOrdersInParallel(placeSmartOrder, 'BUY', 'Long Exit');
        break;
      case 'shortEntry':
        executeOrdersInParallel(placeOrder, 'SELL', 'Short Entry');
        break;
      case 'shortExit':
        executeOrdersInParallel(placeSmartOrder, 'SELL', 'Short Exit');
        break;
      default:
        isProcessing = false;
    }
  });
}

// Place a regular order (LE or SE)
function placeOrder(action, settings, symbolName) {
  return new Promise((resolve, reject) => {
    const url = `${settings.hostUrl.replace(/\/+$/,'')}/api/v1/placeorder`;
    
    const data = {
      apikey: settings.apiKey,
      strategy: "Chrome",
      symbol: symbolName,
      action: action,
      exchange: settings.exchange,
      pricetype: "MARKET",
      product: settings.product,
      quantity: settings.quantity
    };
    
    console.log(`Placing order for ${symbolName}:`, data);
    
    makeApiCall(url, data, action === 'BUY' ? 'Long Entry' : 'Short Entry', symbolName)
      .then(responseData => resolve(responseData))
      .catch(error => reject(error));
  });
}

// Place a smart order (LX or SX)
function placeSmartOrder(action, settings, symbolName) {
  return new Promise((resolve, reject) => {
    const url = `${settings.hostUrl.replace(/\/+$/,'')}/api/v1/placesmartorder`;
    
    const data = {
      apikey: settings.apiKey,
      strategy: "chrome",
      exchange: settings.exchange,
      symbol: symbolName,
      action: action,
      product: settings.product,
      pricetype: "MARKET",
      quantity: "0",
      position_size: "0"
    };
    
    console.log(`Placing smart order for ${symbolName}:`, data);
    
    makeApiCall(url, data, action === 'BUY' ? 'Long Exit' : 'Short Exit', symbolName)
      .then(responseData => resolve(responseData))
      .catch(error => reject(error));
  });
}

// Make API call via background proxy (to avoid CORS when running on third-party sites)
function makeApiCall(url, data, actionText, symbolName) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: "placeOrder", url: url, data: data }, (response) => {
      if (!response) {
        reject({ message: 'No response from background script', symbol: symbolName });
        return;
      }
      if (!response.success) {
        reject({ message: response.error || 'Background fetch failed', symbol: symbolName, data: response });
        return;
      }
      const body = response.body;
      // If backend returned JSON with a 'status' field, use that logic
      if (body && typeof body === 'object' && body.status === 'success') {
        resolve(body);
      } else if (body && typeof body === 'object' && body.status) {
        // backend returned something else
        reject({ message: body.message || 'API returned non-success status', data: body, symbol: symbolName });
      } else {
        // If body is text or unknown, resolve with body if HTTP status is 200
        if (response.status >= 200 && response.status < 300) {
          resolve({ data: body });
        } else {
          reject({ message: 'Non-2xx response', data: body, status: response.status, symbol: symbolName });
        }
      }
    });
  });
}

// Show notification on the page
function showNotification(message, type, isPersistent = false, duration = 5000) {
  const notification = document.createElement('div');
  notification.className = `openalgo-notification ${type}`;
  
  // Support multi-line messages
  notification.innerHTML = message.replace(/\n/g, '<br>');
  
  document.body.appendChild(notification);
  
  if (!isPersistent) {
    setTimeout(() => {
      notification.classList.add('fadeOut');
      setTimeout(() => {
        notification.remove();
      }, 500);
    }, duration);
  }
  
  return notification;
}

// Inject CSS for buttons (if you prefer inlined styles, otherwise content.css from extension will be used)
function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
    /* Scope all styles to avoid affecting host pages */
    .openalgo-controls-container { /* minimal fallback styles */ }
  `;
  document.head.appendChild(style);
}

// Inject styles on content script load
injectStyles();
