let agentWindowId = null;

chrome.action.onClicked.addListener(() => {
  if (agentWindowId !== null) {
    chrome.windows.get(agentWindowId, (win) => {
      if (chrome.runtime.lastError || !win) {
        openAgentWindow();
      } else {
        chrome.windows.update(agentWindowId, { focused: true });
      }
    });
  } else {
    openAgentWindow();
  }
});

function openAgentWindow() {
  chrome.windows.create({
    url: chrome.runtime.getURL('popup.html'),
    type: 'popup',
    width: 480,
    height: 680
  }, (win) => {
    agentWindowId = win.id;
  });
}

chrome.windows.onRemoved.addListener((windowId) => {
  if (windowId === agentWindowId) {
    agentWindowId = null;
  }
});
