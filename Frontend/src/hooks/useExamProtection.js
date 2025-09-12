import { useEffect, useRef } from "react";

export const useExamProtection = (onViolation, onMaxViolations) => {
  const lastViolationRef = useRef(0);
  const violationCountRef = useRef(0);

  const triggerViolation = (msg) => {
    const now = Date.now();
    if (now - lastViolationRef.current < 10000) return; // cooldown 10s
    lastViolationRef.current = now;

    violationCountRef.current += 1;
    const remaining = 10 - violationCountRef.current;

    if (typeof onViolation === "function") {
      if (remaining > 0 && remaining <= 3) {
        onViolation(`${msg}\n⚠️ Only ${remaining} warnings left!`);
      } else {
        onViolation(msg);
      }
    }

    if (violationCountRef.current >= 8) {
      if (typeof onMaxViolations === "function") {
        onMaxViolations();
      } else {
        console.error("🚨 Max violations reached! Quiz will be submitted.");
      }
    }

    console.warn(`[Violation #${violationCountRef.current}] ${msg}`);
  };

  useEffect(() => {
    console.log("🔒 Exam protection hook mounted");

    // ✅ Camera + Microphone permission check
    // replace checkMediaPermissions in your hook
    // const checkMediaPermissions = async () => {
    //     if (!navigator.permissions) {
    //         console.warn("⚠️ Permissions API not supported");
    //         return;
    //     }

    //     try {
    //         const result = await navigator.permissions.query({ name: "camera" });
    //         console.log("📷 Camera permission:", result.state);
    //         if (result.state === "denied") {
    //         triggerViolation("❌ Camera access denied by user");
    //         }
    //     } catch (err) {
    //         console.warn("⚠️ Permissions check failed:", err.message);
    //     }
    // };


    // checkMediaPermissions();

    // Force fullscreen immediately
    const forceFullscreen = () => {
      if (!document.fullscreenElement) {
        document.documentElement
          .requestFullscreen()
          .catch((err) => console.warn("⚠️ Fullscreen failed:", err.message));
      }
    };
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
    // const handleBlur = () => {
    //   triggerViolation("🚨 Window focus lost!");
    //   forceFullscreen();
    // };
    // window.addEventListener("blur", handleBlur);

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
      // window.removeEventListener("blur", handleBlur);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onViolation, onMaxViolations]);
};

