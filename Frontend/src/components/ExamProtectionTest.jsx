// ExamProtectionTest.jsx
import { useExamProtection } from "../hooks/useExamProtection.js";

const ExamProtectionTest = () => {
  useExamProtection((msg) => {
    console.warn("⚠️ Violation detected:", msg);
    alert(msg);
  });

  return (
    <div style={{ padding: "2rem" }}>
      <h1>🔒 Exam Protection Test</h1>
      <p>Try the following:</p>
      <ul>
        <li>Right click → should be blocked</li>
        <li>Copy/Paste text → should be blocked</li>
        <li>Switch tab → should alert</li>
        <li>Press F12 / Ctrl+Shift+I / Ctrl+U → should alert</li>
        <li>Press PrintScreen → should alert & clear clipboard</li>
      </ul>
    </div>
  );
};

export default ExamProtectionTest;
