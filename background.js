// background.js
// Acts as a proxy for network requests to bypass CORS when content scripts run on third-party sites.

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request && request.action === "placeOrder") {
    (async () => {
      try {
        const res = await fetch(request.url, {
          method: request.method || 'POST',
          headers: Object.assign({'Content-Type': 'application/json'}, request.headers || {}),
          body: request.body || (request.data ? JSON.stringify(request.data) : undefined)
        });
        const ct = res.headers.get('content-type') || '';
        let responseBody = ct.includes('application/json') ? await res.json() : await res.text();
        sendResponse({ success: true, status: res.status, body: responseBody });
      } catch (err) {
        sendResponse({ success: false, error: err.message || String(err) });
      }
    })();
    return true; // Keep channel open for async sendResponse
  }
});