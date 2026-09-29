chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== "CAPTURE_SCREENSHOT") {
    return;
  }
  captureScreenshot(sender)
    .then(sendResponse)
    .catch((error) => {
      console.error(error);

      sendResponse({
        success: false,
        error: error.message,
      });
    });
    return true;
});
async function captureScreenshot(sender) {
  const windowId = sender.tab?.windowId;
  if (windowId === undefined) {
    throw new Error("Could now find browser window");
  }
  const screenshot = await chrome.tabs.captureVisibleTab(windowId, {
    format: "png",
  });
  return {
    success: true,
    screenshot,
  };
}
