// DebugConsole.js
import { useEffect, useState } from "react";

export default function DebugConsole() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    // Lưu bản gốc console
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    // Ghi đè console.log / warn / error
    console.log = (...args) => {
      setLogs(curr => [...curr, { type: "log", message: args.join(" ") }]);
      originalLog(...args);
    };
    console.warn = (...args) => {
      setLogs(curr => [...curr, { type: "warn", message: args.join(" ") }]);
      originalWarn(...args);
    };
    console.error = (...args) => {
      setLogs(curr => [...curr, { type: "error", message: args.join(" ") }]);
      originalError(...args);
    };

    // Cleanup khi unmount
    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    };
  }, []);

  return (
    <div style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      maxHeight: "200px",
      overflowY: "auto",
      background: "#000",
      color: "#0f0",
      fontSize: "12px",
      zIndex: 9999,
      padding: "4px",
    }}>
      {logs.map((l, i) => (
        <div key={i} style={{ color: l.type === "error" ? "#f55" : l.type === "warn" ? "#ff5" : "#0f0" }}>
          [{l.type}] {l.message}
        </div>
      ))}
    </div>
  );
}
