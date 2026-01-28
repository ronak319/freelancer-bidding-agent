// Background Service Worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'openProject') {
        console.log("Background: Request to open project ->", message.url);

        // Use chrome.tabs.create which is more reliable than window.open in content scripts
        chrome.tabs.create({
            url: message.url,
            active: false // Open in background to not interrupt user
        }, (tab) => {
            console.log("Background: Tab created ->", tab.id);
            sendResponse({ success: true, tabId: tab.id });
        });

        return true; // Keep message channel open for async response
    }
});

console.log("Personal Bidding Agent: Background Script Active");
