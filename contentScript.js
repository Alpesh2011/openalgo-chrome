// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "injectButtons") {
    injectTradingButtons();
    sendResponse({success: true});
  }
  return true;
});

// Automatically inject trading buttons when page loads
document.addEventListener('DOMContentLoaded', function() {
  injectTradingButtons();
});

if (document.readyState === 'interactive' || document.readyState === 'complete') {
  injectTradingButtons();
}

function injectTradingButtons() {
  if (document.getElementById('openalgo-controls')) {
    return;
  }
  
  // Inject CSS first
  injectCSS();
  
  // Create main container
  const container = document.createElement('div');
  container.id = 'openalgo-controls';
  container.className = 'openalgo-controls-container';
  
  // Create buttons row
  const buttonsContainer = document.createElement('div');
  buttonsContainer.className = 'openalgo-buttons-row';
  
  // Entry/Exit buttons
  const entryBtn = document.createElement('button');
  entryBtn.id = 'entry-button';
  entryBtn.className = 'openalgo-button btn-success';
  entryBtn.textContent = 'ENTRY';
  entryBtn.title = 'Enter all positions';
  entryBtn.addEventListener('click', () => handleButtonClick('entry'));
  
  const exitBtn = document.createElement('button');
  exitBtn.id = 'exit-button';
  exitBtn.className = 'openalgo-button btn-error';
  exitBtn.textContent = 'EXIT';
  exitBtn.title = 'Exit all positions';
  exitBtn.addEventListener('click', () => handleButtonClick('exit'));
  
  // Settings button
  const settingsBtn = document.createElement('button');
  settingsBtn.className = 'openalgo-settings-icon';
  settingsBtn.innerHTML = '⚙️';
  settingsBtn.title = 'OpenAlgo Settings';
  settingsBtn.addEventListener('click', toggleSettings);
  
  // Add buttons to container
  buttonsContainer.appendChild(entryBtn);
  buttonsContainer.appendChild(exitBtn);
  buttonsContainer.appendChild(settingsBtn);
  container.appendChild(buttonsContainer);
  
  // Add to page
  document.body.appendChild(container);
  
  // Load settings
  chrome.storage.sync.get(['hostUrl', 'apiKey', 'symbols', 'baseSymbol', 'exchange', 'product', 'quantity', 'panelPosition'], function(settings) {
    if (settings.panelPosition) {
      try {
        container.style.top = settings.panelPosition.top || '100px';
        container.style.left = settings.panelPosition.left || '20px';
      } catch (err) {}
    }
  });
  
  // Make draggable
  makeDraggable(container);
}

function injectCSS() {
  const style = document.createElement('style');
  style.textContent = `
    /* CSS is now in external content.css file */
  `;
  document.head.appendChild(style);
}

function createSettingsPanel() {
  // Remove existing settings panel if any
  const existingPanel = document.getElementById('openalgo-settings-panel');
  const existingOverlay = document.getElementById('openalgo-settings-overlay');
  if (existingPanel) existingPanel.remove();
  if (existingOverlay) existingOverlay.remove();
  
  // Create overlay
  const overlay = document.createElement('div');
  overlay.id = 'openalgo-settings-overlay';
  overlay.className = 'settings-overlay';
  overlay.addEventListener('click', closeSettings);
  
  // Create settings panel
  const settingsPanel = document.createElement('div');
  settingsPanel.id = 'openalgo-settings-panel';
  settingsPanel.className = 'openalgo-settings-panel';
  
  // Load settings and initialize panel
  chrome.storage.sync.get(['hostUrl', 'apiKey', 'symbols', 'baseSymbol', 'exchange', 'product', 'quantity'], function(settings) {
    initializeSettingsPanel(settingsPanel, settings);
  });
  
  document.body.appendChild(overlay);
  document.body.appendChild(settingsPanel);
  
  // Show with animation
  setTimeout(() => {
    overlay.classList.add('active');
    settingsPanel.classList.remove('hidden');
  }, 10);
  
  // Make resizable
  makeResizable(settingsPanel);
}

function initializeSettingsPanel(settingsPanel, settings) {
  settingsPanel.innerHTML = `
    <div class="settings-header">
      <h2 class="settings-title">OpenAlgo Trading Configuration</h2>
      <button class="close-settings" title="Close Settings">×</button>
    </div>
    <div class="settings-content-area">
      <div class="settings-nav">
        <div class="nav-item active" data-tab="connection">Connection</div>
        <div class="nav-item" data-tab="trading">Trading Settings</div>
        <div class="nav-item" data-tab="strikes">Options Strikes</div>
      </div>
      <div class="settings-main">
        <div class="settings-scroll-container">
          <!-- Connection Tab -->
          <div class="settings-section" id="connection-tab">
            <h3 class="section-title">API Connection</h3>
            
            <div class="form-group">
              <label for="hostUrl">Host URL</label>
              <input type="text" id="hostUrl" value="${settings.hostUrl || 'http://127.0.0.1:5000'}" class="input" placeholder="http://127.0.0.1:5000">
              <div style="font-size: 12px; color: #718096; margin-top: 4px;">
                Enter the URL where your OpenAlgo server is running
              </div>
            </div>
            
            <div class="form-group">
              <label for="apiKey">API Key</label>
              <input type="text" id="apiKey" value="${settings.apiKey || ''}" class="input" placeholder="Your API Key">
              <div style="font-size: 12px; color: #718096; margin-top: 4px;">
                Your unique API key from OpenAlgo
              </div>
            </div>
            
            <div class="form-group">
              <button id="test-connection" class="btn btn-test" style="max-width: 200px;">Test Connection</button>
            </div>
          </div>
          
          <!-- Trading Settings Tab -->
          <div class="settings-section hidden" id="trading-tab">
            <h3 class="section-title">Trading Parameters</h3>
            
            <div class="form-row">
              <div class="form-group compact">
                <label for="exchange">Exchange</label>
                <select id="exchange" class="select">
                  <option value="NSE" ${settings.exchange === 'NSE' ? 'selected' : ''}>NSE</option>
                  <option value="NFO" ${settings.exchange === 'NFO' ? 'selected' : ''}>NFO</option>
                  <option value="BSE" ${settings.exchange === 'BSE' ? 'selected' : ''}>BSE</option>
                  <option value="MCX" ${settings.exchange === 'MCX' ? 'selected' : ''}>MCX</option>
                </select>
              </div>
              <div class="form-group compact">
                <label for="product">Product Type</label>
                <select id="product" class="select">
                  <option value="MIS" ${settings.product === 'MIS' ? 'selected' : ''}>MIS</option>
                  <option value="NRML" ${settings.product === 'NRML' ? 'selected' : ''}>NRML</option>
                  <option value="CNC" ${settings.product === 'CNC' ? 'selected' : ''}>CNC</option>
                </select>
              </div>
            </div>
            
            <div class="form-group">
              <label for="quantity">Quantity</label>
              <input type="number" id="quantity" value="${settings.quantity || ''}" class="input" placeholder="Enter quantity">
              <div style="font-size: 12px; color: #718096; margin-top: 4px;">
                Number of units to trade per order
              </div>
            </div>
            
            <div class="form-group">
              <label for="baseSymbol">Base Symbol</label>
              <input type="text" id="baseSymbol" value="${settings.baseSymbol || ''}" class="input" placeholder="e.g., NIFTY20OCT25">
              <div style="font-size: 12px; color: #718096; margin-top: 4px;">
                Base symbol for options (without strike price)
              </div>
            </div>
          </div>
          
          <!-- Strikes Tab -->
          <div class="settings-section hidden" id="strikes-tab">
            <h3 class="section-title">Options Strikes Management</h3>
            
            <div class="strikes-section">
              <div class="section-header">
                <label>Configure Strikes</label>
                <span class="strike-count" id="strike-count">0</span>
              </div>
              <div style="font-size: 13px; color: #718096; margin-bottom: 16px;">
                Add multiple strikes with their option types and actions
              </div>
              <div class="strikes-container" id="strikes-container"></div>
              <button type="button" id="add-strike" class="btn btn-add" style="max-width: 150px;">+ Add Strike</button>
            </div>
          </div>
        </div>
        
        <div class="settings-footer">
          <button id="save-settings" class="btn btn-save">Save All Settings</button>
        </div>
      </div>
    </div>
    <div class="resize-handle"></div>
  `;
  
  initializeStrikesContainer(settings);
  setupTabNavigation();
  setupEventListeners(settingsPanel);
}

function setupTabNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const tabs = document.querySelectorAll('.settings-section');
  
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      // Remove active class from all items and tabs
      navItems.forEach(nav => nav.classList.remove('active'));
      tabs.forEach(tab => tab.classList.add('hidden'));
      
      // Add active class to clicked item
      item.classList.add('active');
      
      // Show corresponding tab
      const tabId = `${item.dataset.tab}-tab`;
      const activeTab = document.getElementById(tabId);
      if (activeTab) {
        activeTab.classList.remove('hidden');
      }
    });
  });
}

function setupEventListeners(settingsPanel) {
  // Close button
  settingsPanel.querySelector('.close-settings').addEventListener('click', closeSettings);
  
  // Add strike button
  settingsPanel.querySelector('#add-strike').addEventListener('click', (e) => {
    e.stopPropagation();
    addStrikeRow();
    updateStrikeCount();
  });
  
  // Test connection button
  settingsPanel.querySelector('#test-connection').addEventListener('click', (e) => {
    e.stopPropagation();
    testConnection();
  });
  
  // Save settings button
  settingsPanel.querySelector('#save-settings').addEventListener('click', (e) => {
    e.stopPropagation();
    saveSettings();
  });
}

function initializeStrikesContainer(settings) {
  const container = document.getElementById('strikes-container');
  if (!container) return;
  
  container.innerHTML = '';
  
  let symbols = settings.symbols || [{ strike: '', optionType: 'CE', action: 'BUY' }];
  
  symbols.forEach((symbolConfig, index) => {
    addStrikeRow(symbolConfig, index);
  });
  
  updateStrikeCount();
}

function addStrikeRow(symbolConfig = { strike: '', optionType: 'CE', action: 'BUY' }, index) {
  const container = document.getElementById('strikes-container');
  if (!container) return;
  
  const strikeRow = document.createElement('div');
  strikeRow.className = 'strike-row';
  strikeRow.innerHTML = `
    <input type="number" class="strike-input" placeholder="Strike Price" value="${symbolConfig.strike || ''}" data-index="${index}">
    <select class="option-type" data-index="${index}">
      <option value="CE" ${symbolConfig.optionType === 'CE' ? 'selected' : ''}>Call (CE)</option>
      <option value="PE" ${symbolConfig.optionType === 'PE' ? 'selected' : ''}>Put (PE)</option>
    </select>
    <select class="action-type" data-index="${index}">
      <option value="BUY" ${symbolConfig.action === 'BUY' ? 'selected' : ''}>BUY</option>
      <option value="SELL" ${symbolConfig.action === 'SELL' ? 'selected' : ''}>SELL</option>
    </select>
    <button type="button" class="btn-remove" ${index === 0 ? 'disabled' : ''} title="Remove Strike">×</button>
  `;
  
  container.appendChild(strikeRow);
  
  const strikeInput = strikeRow.querySelector('.strike-input');
  strikeInput.addEventListener('input', updateStrikeCount);
  
  if (index > 0) {
    const removeBtn = strikeRow.querySelector('.btn-remove');
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      strikeRow.remove();
      updateStrikeIndexes();
      updateStrikeCount();
    });
  }
}

function updateStrikeCount() {
  const strikeInputs = document.querySelectorAll('.strike-input');
  const validStrikes = Array.from(strikeInputs).filter(input => input.value.trim() !== '');
  const strikeCount = document.getElementById('strike-count');
  if (strikeCount) {
    strikeCount.textContent = validStrikes.length;
  }
}

function updateStrikeIndexes() {
  const strikeRows = document.querySelectorAll('.strike-row');
  strikeRows.forEach((row, index) => {
    row.querySelectorAll('[data-index]').forEach(input => {
      input.setAttribute('data-index', index);
    });
    const removeBtn = row.querySelector('.btn-remove');
    if (removeBtn) {
      removeBtn.disabled = index === 0;
    }
  });
}

function saveSettings() {
  const baseSymbol = document.querySelector('#baseSymbol')?.value.trim() || '';
  const strikeInputs = document.querySelectorAll('.strike-input');
  const optionTypeSelects = document.querySelectorAll('.option-type');
  const actionSelects = document.querySelectorAll('.action-type');
  
  const symbols = [];
  strikeInputs.forEach((input, index) => {
    if (input.value.trim() !== '' && baseSymbol) {
      const fullSymbol = `${baseSymbol}${input.value.trim()}${optionTypeSelects[index].value}`;
      symbols.push({
        symbol: fullSymbol,
        strike: input.value.trim(),
        optionType: optionTypeSelects[index].value,
        action: actionSelects[index].value
      });
    }
  });
  
  const newSettings = {
    hostUrl: document.querySelector('#hostUrl')?.value || '',
    apiKey: document.querySelector('#apiKey')?.value || '',
    baseSymbol: baseSymbol,
    symbols: symbols,
    exchange: document.querySelector('#exchange')?.value || 'NSE',
    product: document.querySelector('#product')?.value || 'MIS',
    quantity: document.querySelector('#quantity')?.value || ''
  };
  
  chrome.storage.sync.set(newSettings, function() {
    showNotification('Settings saved successfully!', 'success');
    updateStrikeCount();
    // Close settings after save
    setTimeout(closeSettings, 1000);
  });
}

function testConnection() {
  const hostUrl = document.querySelector('#hostUrl')?.value || '';
  const apiKey = document.querySelector('#apiKey')?.value || '';
  
  if (!hostUrl || !apiKey) {
    showNotification('Please enter Host URL and API Key', 'error');
    return;
  }
  
  showNotification('Testing connection...', 'info');
  
  const url = `${hostUrl.replace(/\/+$/,'')}/api/v1/placeorder`;
  const testData = {
    apikey: apiKey,
    strategy: "Chrome",
    symbol: "TEST",
    action: "BUY",
    exchange: "NSE",
    pricetype: "MARKET",
    product: "MIS",
    quantity: "1"
  };
  
  makeApiCall(url, testData, 'Connection Test', 'TEST')
    .then(() => showNotification('Connection successful!', 'success'))
    .catch(error => showNotification(`Connection failed: ${error.message || 'Unknown error'}`, 'error'));
}

function toggleSettings() {
  createSettingsPanel();
}

function closeSettings() {
  const settingsPanel = document.getElementById('openalgo-settings-panel');
  const overlay = document.getElementById('openalgo-settings-overlay');
  
  if (settingsPanel) {
    settingsPanel.classList.add('hidden');
  }
  if (overlay) {
    overlay.classList.remove('active');
  }
  
  // Remove elements after animation
  setTimeout(() => {
    if (settingsPanel) settingsPanel.remove();
    if (overlay) overlay.remove();
  }, 400);
}

function makeDraggable(element) {
  let isDragging = false;
  let offsetX, offsetY;
  
  element.style.position = 'fixed';
  element.style.zIndex = '10000';
  
  const handle = document.createElement('div');
  handle.className = 'drag-handle';
  element.appendChild(handle);
  
  handle.addEventListener('mousedown', startDrag);
  
  function startDrag(e) {
    isDragging = true;
    offsetX = e.clientX - element.getBoundingClientRect().left;
    offsetY = e.clientY - element.getBoundingClientRect().top;
    
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDrag);
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
    chrome.storage.sync.set({
      panelPosition: { top: element.style.top, left: element.style.left }
    });
    document.removeEventListener('mousemove', drag);
    document.removeEventListener('mouseup', stopDrag);
  }
}

function makeResizable(element) {
  let isResizing = false;
  let startX, startY, startWidth, startHeight;
  
  const handle = element.querySelector('.resize-handle');
  
  handle.addEventListener('mousedown', function(e) {
    isResizing = true;
    startX = e.clientX;
    startY = e.clientY;
    startWidth = parseInt(document.defaultView.getComputedStyle(element).width, 10);
    startHeight = parseInt(document.defaultView.getComputedStyle(element).height, 10);
    
    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResize);
    e.preventDefault();
  });
  
  function resize(e) {
    if (isResizing) {
      const newWidth = startWidth + (e.clientX - startX);
      const newHeight = startHeight + (e.clientY - startY);
      
      // Set minimum size
      if (newWidth > 600) element.style.width = newWidth + 'px';
      if (newHeight > 400) element.style.height = newHeight + 'px';
    }
  }
  
  function stopResize() {
    isResizing = false;
    document.removeEventListener('mousemove', resize);
    document.removeEventListener('mouseup', stopResize);
  }
}

// ... (rest of the existing functions remain the same - handleButtonClick, executeEntryOrders, executeExitOrders, processOrderResults, placeOrder, placeSmartOrder, makeApiCall, showNotification)

let isProcessing = false;

function handleButtonClick(action) {
  if (isProcessing) {
    showNotification('Please wait...', 'warning', false, 3000);
    return;
  }
  
  isProcessing = true;
  
  chrome.storage.sync.get(['hostUrl', 'apiKey', 'symbols', 'exchange', 'product', 'quantity'], function(settings) {
    if (!settings.hostUrl || !settings.apiKey || !settings.symbols || 
        !settings.exchange || !settings.product || !settings.quantity) {
      showNotification('Please complete settings first!', 'error');
      toggleSettings();
      isProcessing = false;
      return;
    }
    
    const validSymbols = settings.symbols.filter(s => s.symbol && s.symbol.trim() !== '');
    if (validSymbols.length === 0) {
      showNotification('Please add at least one strike', 'error');
      isProcessing = false;
      return;
    }
    
    if (action === 'entry') {
      executeEntryOrders(validSymbols, settings);
    } else if (action === 'exit') {
      executeExitOrders(validSymbols, settings);
    } else {
      isProcessing = false;
    }
  });
}

function executeEntryOrders(symbols, settings) {
  showNotification(`Placing entry orders for ${symbols.length} strike(s)...`, 'info');
  
  const orderPromises = symbols.map(symbolConfig => {
    return new Promise((resolve, reject) => {
      placeOrder(symbolConfig.action, settings, symbolConfig.symbol)
        .then(result => resolve({ symbol: symbolConfig.symbol, action: symbolConfig.action, result }))
        .catch(error => reject({ symbol: symbolConfig.symbol, action: symbolConfig.action, error }));
    });
  });
  
  processOrderResults(orderPromises, 'entry');
}

function executeExitOrders(symbols, settings) {
  showNotification(`Placing exit orders for ${symbols.length} strike(s)...`, 'info');
  
  const orderPromises = symbols.map(symbolConfig => {
    const exitAction = symbolConfig.action === 'BUY' ? 'SELL' : 'BUY';
    return new Promise((resolve, reject) => {
      placeSmartOrder(exitAction, settings, symbolConfig.symbol)
        .then(result => resolve({ symbol: symbolConfig.symbol, action: exitAction, result }))
        .catch(error => reject({ symbol: symbolConfig.symbol, action: exitAction, error }));
    });
  });
  
  processOrderResults(orderPromises, 'exit');
}

function processOrderResults(orderPromises, actionType) {
  Promise.allSettled(orderPromises).then(results => {
    const successful = results.filter(r => r.status === 'fulfilled');
    const failed = results.filter(r => r.status === 'rejected');
    
    let messages = [];
    
    successful.forEach(result => {
      const orderid = result.value.result?.orderid || 'N/A';
      const direction = actionType === 'entry' ? result.value.action : (result.value.action === 'BUY' ? 'SELL' : 'BUY');
      messages.push(`✓ ${result.value.symbol}: ${direction} (ID: ${orderid})`);
    });
    
    failed.forEach(result => {
      const errorMsg = result.reason.error?.message || 'Unknown error';
      const direction = actionType === 'entry' ? result.reason.action : (result.reason.action === 'BUY' ? 'SELL' : 'BUY');
      messages.push(`✗ ${result.reason.symbol}: ${direction} - ${errorMsg}`);
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
    showNotification('Unexpected error while placing orders', 'error');
    isProcessing = false;
  });
}

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
    
    makeApiCall(url, data, 'Order', symbolName)
      .then(resolve)
      .catch(reject);
  });
}

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
    
    makeApiCall(url, data, 'Smart Order', symbolName)
      .then(resolve)
      .catch(reject);
  });
}

function makeApiCall(url, data, actionText, symbolName) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ 
      action: "placeOrder", 
      url: url, 
      data: data 
    }, (response) => {
      if (!response) {
        reject({ message: 'No response from background script', symbol: symbolName });
        return;
      }
      
      if (!response.success) {
        reject({ message: response.error || 'Background fetch failed', symbol: symbolName, data: response });
        return;
      }
      
      const body = response.body;
      if (body && typeof body === 'object' && body.status === 'success') {
        resolve(body);
      } else if (body && typeof body === 'object' && body.status) {
        reject({ message: body.message || 'API returned non-success status', data: body, symbol: symbolName });
      } else {
        if (response.status >= 200 && response.status < 300) {
          resolve({ data: body });
        } else {
          reject({ message: 'Non-2xx response', data: body, status: response.status, symbol: symbolName });
        }
      }
    });
  });
}

function showNotification(message, type, isPersistent = false, duration = 5000) {
  const existingNotifications = document.querySelectorAll('.openalgo-notification');
  existingNotifications.forEach(notification => notification.remove());
  
  const notification = document.createElement('div');
  notification.className = `openalgo-notification ${type}`;
  notification.innerHTML = message.replace(/\n/g, '<br>');
  
  document.body.appendChild(notification);
  
  if (!isPersistent) {
    setTimeout(() => {
      if (notification.parentNode) {
        notification.classList.add('fadeOut');
        setTimeout(() => {
          if (notification.parentNode) {
            notification.remove();
          }
        }, 500);
      }
    }, duration);
  }
  
  return notification;
}