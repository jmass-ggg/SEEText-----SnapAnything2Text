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
});
async function captureScreenshot(sender) {
  const windowId = sender.tab?.windowId;
  if (windowId === undefined) {
    throw new error("Could now find browser window");
  }
  const screenshot = await chrome.tab.captureVisibleTab(windowId, {
    format: ".png",
  });
  return {
    success: true,
    screenshot,
  };
}
