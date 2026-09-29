chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "CAPTURE_SCREENSHOT") {
    captureScreenshot(sender)
      .then(sendResponse)
      .catch((error) =>
        sendResponse({ success: false, error: error.message })
      );
    return true;
  }
  if (message.type === "UPLOAD_IMAGE") {
    uploadImage(message.imageUrl)
      .then((result) => sendResponse({ success: true, result }))
      .catch((error) =>
        sendResponse({ success: false, error: error.message })
      );
    return true;
  }
});
async function captureScreenshot(sender) {
  const windowId = sender.tab?.windowId;
  if (windowId === undefined) {
    throw new Error("Could not find browser window");
  }
  const screenshot = await chrome.tabs.captureVisibleTab(windowId, {
    format: "png",
  });
  return {
    success: true,
    screenshot,
  };
}

async function uploadImage(imageUrl) {
  const imageBlob = await (await fetch(imageUrl)).blob();
  const formData = new FormData();
  formData.append("image", imageBlob, "capture.png");

  const response = await fetch("http://127.0.0.1:8000/extract", {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    throw new Error(`Backend error: ${response.status}`);
  }
  return response.json();
}
