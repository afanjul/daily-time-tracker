chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ tasks: [] });
});

chrome.commands.onCommand.addListener((command) => {
  debugger;
  if (command === "toggle-tracking") {
    // Send a message to the popup script to toggle the tracking state
    chrome.runtime.sendMessage({action: "toggle-tracking"});
  }
});