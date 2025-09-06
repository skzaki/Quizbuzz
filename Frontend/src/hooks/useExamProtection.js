import { useEffect, useRef } from "react";

export const useExamProtection = (onViolation) => {
  const lastViolationRef = useRef(0);

  const triggerViolation = (msg) => {
    const now = Date.now();
    if (now - lastViolationRef.current < 2000) return; // cooldown 2s
    lastViolationRef.current = now;

    if (typeof onViolation === "function") onViolation(msg);
    console.warn(msg);
  };

  useEffect(() => {
    console.log("🔒 Exam protection hook mounted");

    // Force fullscreen immediately
    const forceFullscreen = () => {
      if (!document.fullscreenElement) {
        document.documentElement
          .requestFullscreen()
          .catch((err) => console.warn("⚠️ Fullscreen failed:", err.message));
      }
    };

    // Try on load
    forceFullscreen();

    // If user exits fullscreen → force again
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        triggerViolation("⚠️ Fullscreen exited. Re-enabling...");
        forceFullscreen();
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    // Disable right-click
    const disableContextMenu = (e) => e.preventDefault();
    document.addEventListener("contextmenu", disableContextMenu);

    // Disable copy, cut, paste
    const disableCopy = (e) => e.preventDefault();
    ["copy", "cut", "paste"].forEach((evt) =>
      document.addEventListener(evt, disableCopy)
    );

    // Tab switching
    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerViolation("🚨 Tab switch detected!");
        forceFullscreen();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Window blur
    const handleBlur = () => {
      triggerViolation("🚨 Window focus lost!");
      forceFullscreen();
    };
    window.addEventListener("blur", handleBlur);

    // Detect forbidden keys
    const handleKeyDown = (e) => {
      if (e.key === "PrintScreen") {
        try {
          navigator.clipboard.writeText("");
        } catch {}
        triggerViolation("🚫 Screenshot attempt detected!");
      }

      if (
        (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "i") ||
        (e.ctrlKey && e.key.toLowerCase() === "u") ||
        e.key === "F12"
      ) {
        e.preventDefault();
        triggerViolation("🚫 Developer tools attempt detected!");
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("contextmenu", disableContextMenu);
      ["copy", "cut", "paste"].forEach((evt) =>
        document.removeEventListener(evt, disableCopy)
      );
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onViolation]);
};
