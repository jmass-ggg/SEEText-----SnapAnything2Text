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

     

      

      const uploaded = await chrome.runtime.sendMessage({
        type: "UPLOAD_IMAGE",
        imageUrl: croppedImage,
      });

      if (!uploaded?.success) {
        throw new Error(uploaded?.error || "Upload failed");
      }
      const extractedText=uploaded.result.result;
      
      showPreview(croppedImage,extractedText);
      console.log("Backend result", uploaded.result);
      console.log("result is ",extractedText)
    } catch (error) {
      console.log("Capture failed", error);
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
  function showPreview(imageUrl,extractedText) {
    const old = document.getElementById("codecapture-preview");

    if (old) {
      old.remove();
    }

    const panel = document.createElement("div");

    panel.id = "codecapture-preview";

    Object.assign(panel.style, {
    position: "fixed",

    top: "24px",
    right: "24px",

    width: "420px",

    padding: "18px",

    background:
      "rgba(15, 23, 42, 0.88)",

    backdropFilter:
      "blur(16px)",

    WebkitBackdropFilter:
      "blur(16px)",

    border:
      "1px solid rgba(255,255,255,0.12)",

    borderRadius: "14px",

    boxShadow:
      "0 20px 60px rgba(0,0,0,0.45)",

    color: "#f8fafc",

    zIndex: "2147483647",

    fontFamily:
      "Inter, Arial, sans-serif"
  });
  const header=document.createElement("div");
  Object.assign(header.style,{
    display:"flex",
    alignItems: "center",
    justifyContent: "space-between",

    marginBottom: "14px"
  })
  const title=document.createElement("div");
  title.textContent =
    "CodeCapture Preview";

  Object.assign(title.style, {
    fontSize: "16px",
    fontWeight: "600"
  });
    const actions =
    document.createElement("div");

  Object.assign(actions.style, {
    display: "flex",
    alignItems: "center",
    gap: "8px"
  });
  const copyButton=document.createElement("button");
  copyButton.textContent="Copy";
  Object.assign(copyButton.style, {
    padding: "7px 12px",

    border: "1px solid rgba(255,255,255,0.12)",

    borderRadius: "7px",

    background:
      "rgba(124,58,237,0.20)",

    color: "#ddd6fe",

    fontSize: "12px",
    fontWeight: "600",

    cursor: "pointer"
  });

  const closeBtn=document.createElement("button");
  closeBtn.textContent="X";
  Object.assign(closeBtn.style,{
    width: "30px",
    height: "30px",

    border: "none",

    borderRadius: "7px",

    background:
      "rgba(255,255,255,0.06)",

    color: "#cbd5e1",

    fontSize: "20px",

    cursor: "pointer"
  });
  actions.append(copyButton,closeBtn);
  header.append(title,actions);
  const imageContainer=document.createElement("div");
  Object.assign(imageContainer.style, {
    width: "100%",

    maxHeight: "180px",

    background:
      "rgba(2, 6, 23, 0.65)",

    border:
      "1px solid rgba(255,255,255,0.08)",

    borderRadius: "10px",

    overflow: "hidden",

    display: "flex",
    alignItems: "center",
    justifyContent: "center",

    marginBottom: "16px"
  });


  // CAPTURED IMAGE
  const image =
    document.createElement("img");

  image.src = imageUrl;


  Object.assign(image.style, {
    width: "100%",

    maxHeight: "180px",

    objectFit: "contain",

    display: "block"
  });
  imageContainer.appendChild(
    image
  );
  const textLabel =
    document.createElement("div");

  textLabel.textContent =
    "Extracted Text";
     Object.assign(textLabel.style, {
    fontSize: "13px",

    fontWeight: "600",

    color: "#cbd5e1",

    marginBottom: "7px"
  });
   const textArea =
    document.createElement("textarea");

  textArea.value =
    extractedText ||
    "No text detected.";
    Object.assign(textArea.style, {
    width: "100%",

    minHeight: "150px",

    maxHeight: "300px",

    padding: "12px",

    background:
      "rgba(2, 6, 23, 0.72)",

    color: "#e2e8f0",

    border:
      "1px solid rgba(148,163,184,0.20)",

    borderRadius: "9px",

    outline: "none",

    resize: "vertical",

    fontFamily:
      "JetBrains Mono, Consolas, monospace",

    fontSize: "13px",

    lineHeight: "1.6",

    boxSizing: "border-box"
  });
// When textarea gets focus
  textArea.addEventListener(
    "focus",
    () => {

      textArea.style.border =
        "1px solid #7c3aed";

    }
  );
  textArea.addEventListener(
    "blur",
    () => {

      textArea.style.border =
        "1px solid rgba(148,163,184,0.20)";

    }
  );
  copyButton.onclick=async ()=>{
    try {

        await navigator.clipboard.writeText(
          textArea.value
        );
        copyButton.textContent="Copied ✓";
        setTimeout(()=>{
          copyButton.textContent="Copy"
        },1400)
  }catch(error){
    console.error(
          "Copy failed:",
          error
        );
  }


  }
  closeBtn.onclick=()=>{
    panel.remove()
  }
  panel.append(
    header,imageContainer,textLabel,textArea
  );
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
