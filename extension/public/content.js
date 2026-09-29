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

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "START_SELECTION") {
      startSelection();
    }
  });
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
  function handleMouseDown(event) {
    selecting = true;
    startX = event.clientX;
    startY = event.clientY;
    selectionBox.style.display = "block";
    updateSelection(startX, startY, startX, startY);
  }
  function handleMouseMove(event) {
    if (!selecting) {
      return;
    }
    updateSelection(startX, startY, event.clientX, event.clientY);
  }
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
    } catch (error) {
      console.error("Capture failed", error);
    }
  }
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
  function removeOverlay() {
    if (overlay) {
      overlay.remove();
      overlay = null;
    }
    selectionBox = null;
    document.removeEventListener("keydown", handleEscape);
  }
  function handleEscape() {
    if (event.key === "Escape") {
      selecting = false;
      removeOverlay();
    }
  }
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();

      image.onload = () => resolve(image);

      image.onerror = reject;

      image.src = src;
    });
  }
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
  function styleButton(button) {
    Object.assign(button.style, {
      flex: "1",

      padding: "8px",

      border: "none",

      borderRadius: "6px",

      cursor: "pointer",
    });
  }
  function waitForPaint() {
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(resolve);
      });
    });
  }
})();
