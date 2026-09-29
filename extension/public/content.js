(() => {
  if (window.__CODECAPTURE_LOADED__) {
    return;
  }

  window.__CODECAPTURE_LOADED__ = true;

  let overlay;
  let selectionBox;

  let startX = 0;
  let startY = 0;

  let selecting = false;

  // Listens for messages from the popup/background and starts selection when START_SELECTION is received.
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "START_SELECTION") {
      startSelection();
    }
  });

  // Creates the dark overlay and selection rectangle and attaches mouse events.
  function startSelection() {
    removeOverlay();

    overlay = document.createElement("div");

    Object.assign(overlay.style, {
      position: "fixed",

      top: "0",

      left: "0",

      height: "100vh",
      width: "100vw",

      background: "rgba(0,0,0,0.20)",

      cursor: "crosshair",

      zIndex: "2147483647",

      userSelect: "none",
    });

    selectionBox = document.createElement("div");

    Object.assign(selectionBox.style, {
      position: "absolute",

      border: "2px solid #7c3aed",

      background: "rgba(124,58,237,0.15)",

      display: "none",

      pointerEvents: "none",
    });

    overlay.appendChild(selectionBox);

    document.documentElement.appendChild(overlay);

    overlay.addEventListener("mousedown", handleMouseDown);

    overlay.addEventListener("mouseup", handleMouseUp);

    overlay.addEventListener("mousemove", handleMouseMove);

    document.addEventListener("keydown", handleEscape);
  }

  // Saves where the user started dragging and shows the selection rectangle.
  function handleMouseDown(event) {
    selecting = true;

    startX = event.clientX;

    startY = event.clientY;

    selectionBox.style.display = "block";

    updateSelection(startX, startY, startX, startY);
  }

  // Tracks the mouse while dragging and updates the size of the selection rectangle.
  function handleMouseMove(event) {
    if (!selecting) {
      return;
    }

    updateSelection(startX, startY, event.clientX, event.clientY);
  }

  // Finishes the selection, calculates the selected area, captures the screenshot, crops it, sends it to the backend, and shows the preview.
  async function handleMouseUp(event) {
    if (!selecting) {
      return;
    }

    selecting = false;

    const endX = event.clientX;

    const endY = event.clientY;

    const rect = {
      x: Math.min(startX, endX),

      y: Math.min(startY, endY),

      width: Math.abs(endX - startX),

      height: Math.abs(endY - startY),
    };

    const viewpoint = {
      width: window.innerWidth,

      height: window.innerHeight,

      devicePixelRatio: window.devicePixelRatio,
    };

    removeOverlay();

    await waitForPaint();

    try {
      const response = await chrome.runtime.sendMessage({
        type: "CAPTURE_SCREENSHOT",
      });

      if (!response?.success) {
        console.error(response?.error);

        return;
      }

      const croppedImage = await cropScreenShot(
        response.screenshot,
        rect,
        viewpoint,
      );

     

      showPreview(croppedImage);

      const uploaded = await chrome.runtime.sendMessage({
        type: "UPLOAD_IMAGE",
        imageUrl: croppedImage,
      });

      if (!uploaded?.success) {
        throw new Error(uploaded?.error || "Upload failed");
      }

      console.log("Backend result", uploaded.result);
    } catch (error) {
      console.error("Capture failed", error);
    }
  }

  // Takes the full screenshot and crops only the selected area using Canvas.
  async function cropScreenShot(screenshot, rect, viewport) {
    const image = await loadImage(screenshot);

    const scaleX = image.naturalWidth / viewport.width;

    const scaleY = image.naturalHeight / viewport.height;

    const sourceX = Math.round(rect.x * scaleX);

    const sourceY = Math.round(rect.y * scaleY);

    const sourceWidth = Math.round(rect.width * scaleX);

    const sourceHeight = Math.round(rect.height * scaleY);

    const canvas = document.createElement("canvas");

    canvas.width = sourceWidth;

    canvas.height = sourceHeight;

    const context = canvas.getContext("2d");

    context.drawImage(
      image,

      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,

      0,
      0,
      sourceWidth,
      sourceHeight,
    );

    return canvas.toDataURL("image/png");
  }

  // Converts the image Data URL into a Blob so the image can be uploaded like a file.
  function dataUrlToBob(dataURL) {
    const parts = dataURL.split(",");

    const mime = parts[0].match(/:(.*?);/)[1];

    const binary = atob(parts[1]);

    const array = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }

    return new Blob([array], {
      type: mime,
    });
  }

  // Updates the position and size of the visible selection rectangle while the user drags the mouse.
  function updateSelection(x1, y1, x2, y2) {
    const left = Math.min(x1, x2);

    const top = Math.min(y1, y2);

    const width = Math.abs(x1 - x2);

    const height = Math.abs(y1 - y2);

    Object.assign(selectionBox.style, {
      left: `${left}px`,

      top: `${top}px`,

      width: `${width}px`,

      height: `${height}px`,
    });
  }

  // Removes the selection overlay and keyboard listener from the webpage.
  function removeOverlay() {
    if (overlay) {
      overlay.remove();

      overlay = null;
    }

    selectionBox = null;

    document.removeEventListener("keydown", handleEscape);
  }

  // Cancels the selection when the user presses the Escape key.
  function handleEscape(event) {
    if (event.key === "Escape") {
      selecting = false;

      removeOverlay();
    }
  }

  // Converts the screenshot Data URL into an Image object so Canvas can use it.
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();

      image.onload = () => resolve(image);

      image.onerror = reject;

      image.src = src;
    });
  }

  // Creates and displays a preview panel containing the cropped screenshot.
  function showPreview(imageUrl) {
    const old = document.getElementById("codecapture-preview");

    if (old) {
      old.remove();
    }

    const panel = document.createElement("div");

    panel.id = "codecapture-preview";

    Object.assign(panel.style, {
      position: "fixed",

      top: "20px",

      right: "20px",

      width: "360px",

      padding: "14px",

      background: "#0f172a",

      color: "white",

      borderRadius: "10px",

      boxShadow: "0 15px 40px rgba(0,0,0,.5)",

      zIndex: "2147483647",

      fontFamily: "Arial, sans-serif",
    });

    const title = document.createElement("div");

    title.textContent = "CodeCapture Preview";

    title.style.fontWeight = "bold";

    title.style.marginBottom = "10px";

    const image = document.createElement("img");

    image.src = imageUrl;

    Object.assign(image.style, {
      width: "100%",

      maxHeight: "300px",

      objectFit: "contain",

      borderRadius: "6px",

      background: "white",
    });

    const buttons = document.createElement("div");

    buttons.style.display = "flex";

    buttons.style.gap = "8px";

    buttons.style.marginTop = "10px";

    const download = document.createElement("button");

    download.textContent = "Save Image";

    const close = document.createElement("button");

    close.textContent = "Close";

    styleButton(download);

    styleButton(close);

    download.onclick = () => {
      const link = document.createElement("a");

      link.href = imageUrl;

      link.download = "capture.png";

      link.click();
    };

    close.onclick = () => {
      panel.remove();
    };

    buttons.append(download, close);

    panel.append(title, image, buttons);

    document.documentElement.appendChild(panel);
  }

  // Applies reusable CSS styles to buttons inside the preview panel.
  function styleButton(button) {
    Object.assign(button.style, {
      flex: "1",

      padding: "8px",

      border: "none",

      borderRadius: "6px",

      cursor: "pointer",
    });
  }

  // Waits for the browser to repaint twice so the overlay disappears before the screenshot is taken.
  function waitForPaint() {
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(resolve);
      });
    });
  }
})();
