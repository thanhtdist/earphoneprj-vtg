// DebugConsoleAdvanced.js
import { useEffect, useState } from "react";

const LOG_TYPES = ["log", "warn", "error"];

export default function DebugConsoleAdvanced() {
  const [logs, setLogs] = useState([]);
  const [visible, setVisible] = useState(true);
  const [filter, setFilter] = useState({
    log: true,
    warn: true,
    error: true,
  });

  useEffect(() => {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

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

    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    };
  }, []);

  const toggleFilter = (type) => {
    setFilter(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const clearLogs = () => setLogs([]);

  // Hiển thị panel chỉ khi debug=true hoặc env development
  const showConsole = window.location.search.includes("debug=true") || process.env.NODE_ENV === "development";

  if (!showConsole) return null;

  return (
    <div style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      maxHeight: visible ? "200px" : "30px",
      overflowY: "auto",
      background: "#000",
      color: "#0f0",
      fontSize: "12px",
      zIndex: 9999,
      padding: "4px",
      borderTop: "2px solid #555",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          {LOG_TYPES.map(type => (
            <button
              key={type}
              onClick={() => toggleFilter(type)}
              style={{
                marginRight: 4,
                background: filter[type] ? "#0f0" : "#555",
                color: "#000",
                border: "none",
                padding: "2px 6px",
                cursor: "pointer"
              }}
            >
              {type}
            </button>
          ))}
        </div>
        <div>
          <button onClick={clearLogs} style={{ marginRight: 4, cursor: "pointer" }}>Clear</button>
          <button onClick={() => setVisible(!visible)} style={{ cursor: "pointer" }}>
            {visible ? "Minimize" : "Expand"}
          </button>
        </div>
      </div>

      {/* Log messages */}
      {visible && logs.filter(l => filter[l.type]).map((l, i) => (
        <div key={i} style={{ color: l.type === "error" ? "#f55" : l.type === "warn" ? "#ff5" : "#0f0" }}>
          [{l.type}] {l.message}
        </div>
      ))}
    </div>
  );
}
