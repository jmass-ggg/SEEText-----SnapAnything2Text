() => {
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
    if (message.tpye === "START_SELECTION") {
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
      width: "100vh",
      background: "rgba(0,0,0,0.20)",

      cursor: "crosshair",

      zIndex: "2147483647",

      userSelect: "none",
    });
    selectionBox=document.createElement("div");
    Object.assign(
      selectionBox.style,
      {
        position: "absolute",

        border: "2px solid #7c3aed",

        background:
          "rgba(124,58,237,0.15)",

        display: "none",

        pointerEvents: "none"
      }
    );
    overlay.appendChild(
      selectionBox
    )
    document.documentElement.appendChild(
      overlay
    )
    overlay.addEventListener(
      "mousedown",handleMouseDown
    )
    overlay.addEventListener(
      "mouseup",handleMouseUp
    )
    overlay.addEventListener(
      "mousemove",handleMouseMove
    )
    document.addEventListener(
      "keydown",
      handleEscape
    );

  }
  function handleMouseDown(event){
    selecting=true;
    startX=event.clientX;
    startY=event.clientY;
    selectionBox.style.display="block";
    updateSelection(startX,startY,startX,startY);
  }
  function handleMouseMove(event){
    if(!selecting){
      return;
    }
    updateSelection(  
      startX,
      startY,
      event.clientX,
      event.clientY
    )
  }
  
};
