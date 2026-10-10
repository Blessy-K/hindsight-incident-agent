
import { useEffect, useRef, useState } from "react";
import "./App.css";

const API_BASE_URL = "https://hindsight-incident-agent.onrender.com";

const DEMO_INCIDENT =
  "The Payment API is returning HTTP 503 errors after deployment v2.9.1. Checkout requests are failing intermittently and database connections appear unusually high.";

const MAX_LOG_FILE_SIZE = 2 * 1024 * 1024;
const MAX_TOTAL_LOG_SIZE = 5 * 1024 * 1024;
const MAX_SCREENSHOT_SIZE = 5 * 1024 * 1024;

// Hindsight currently returns a Python-style representation of its recall
// results. Extract individual records for display, with a safe fallback.
function parseRecalledMemories(raw) {
  if (!raw || typeof raw !== "string") return [];

  const memories = [];
  const pattern =
    /RecallResult\(id=['"]([^'"]+)['"],\s*type=['"]([^'"]+)['"],\s*text=(['"])([\s\S]*?)\3(?=,\s*\w+=|\))/g;

  let match;

  while ((match = pattern.exec(raw)) !== null) {
    const text = match[4]
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t")
      .replace(/\\'/g, "'")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");

    memories.push({
      id: match[1],
      type: match[2],
      text,
    });
  }

  // If Hindsight changes its response representation, keep the original
  // result available instead of silently hiding it.
  if (memories.length === 0 && raw.trim()) {
    return [{ id: "raw-memory", type: "recall result", text: raw }];
  }

  // Avoid displaying duplicate copies of the same memory.
  const unique = [];
  const seen = new Set();

  for (const memory of memories) {
    const key = memory.text.trim();

    if (key && !seen.has(key)) {
      seen.add(key);
      unique.push(memory);
    }
  }

  return unique;
}

function App() {
  const [incident, setIncident] = useState(DEMO_INCIDENT);
  const [service, setService] = useState("Payment API");
  const [environment, setEnvironment] = useState("Production");
  const [severity, setSeverity] = useState("High");
  const [version, setVersion] = useState("v2.9.1");
  const [recentChanges, setRecentChanges] = useState("");

  // Voice input
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const recognitionRef = useRef(null);
  const voiceBaseRef = useRef("");
  const voiceFinalRef = useRef("");

  // Diagnostic files
  const [logFiles, setLogFiles] = useState([]);
  const [logContents, setLogContents] = useState("");
  const [logError, setLogError] = useState("");
  const [pastedLogs, setPastedLogs] = useState("");

  // JSON import
  const [incidentJsonError, setIncidentJsonError] = useState("");
  const [importedJsonName, setImportedJsonName] = useState("");

  // Screenshot preview
  const [screenshot, setScreenshot] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState("");
  const [imageError, setImageError] = useState("");

  // Analysis
  const [memoryResult, setMemoryResult] = useState(null);
  const [noMemoryResult, setNoMemoryResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Save incident
  const [remembering, setRemembering] = useState(false);
  const [remembered, setRemembered] = useState(false);
  const [rootCause, setRootCause] = useState("");
  const [resolution, setResolution] = useState("");
  const [lesson, setLesson] = useState("");

  useEffect(() => {
    return () => {
      if (screenshotPreview) {
        URL.revokeObjectURL(screenshotPreview);
      }

      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [screenshotPreview]);

  function buildIncidentText() {
    const parts = [
      `Incident description:\n${incident.trim()}`,
      `Service: ${service || "Not specified"}`,
      `Environment: ${environment || "Not specified"}`,
      `Severity: ${severity || "Not specified"}`,
      `Deployment version: ${version || "Not specified"}`,
    ];

    if (recentChanges.trim()) {
      parts.push(`Recent changes:\n${recentChanges.trim()}`);
    }

    if (logContents.trim()) {
      parts.push(`Uploaded diagnostic files:\n${logContents}`);
    }

    if (pastedLogs.trim()) {
      parts.push(`Pasted logs:\n${pastedLogs.trim()}`);
    }

    return parts.join("\n\n");
  }

  function toggleVoiceInput() {
    setVoiceError("");

    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceError(
        "Voice input is not supported in this browser. Try Chrome or Edge."
      );
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "en-IN";
    recognition.continuous = true;
    recognition.interimResults = true;

    voiceBaseRef.current = incident.trim();
    voiceFinalRef.current = "";

    recognition.onstart = () => setListening(true);

    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          finalText += transcript + " ";
        } else {
          interimText += transcript;
        }
      }

      voiceFinalRef.current += finalText;

      const spokenText = voiceFinalRef.current + interimText;
      const existingText = voiceBaseRef.current;

      setIncident(
        [existingText, spokenText.trim()]
          .filter(Boolean)
          .join(existingText ? " " : "")
      );
    };

    recognition.onerror = (event) => {
      setVoiceError(
        event.error === "not-allowed"
          ? "Microphone permission was denied. Allow microphone access in your browser."
          : `Voice input error: ${event.error}`
      );

      setListening(false);
    };

    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      setVoiceError("Could not start voice input. Please try again.");
      setListening(false);
    }
  }

  async function handleLogUpload(event) {
    const files = Array.from(event.target.files || []);
    setLogError("");

    if (!files.length) return;

    const allowedExtensions = /\.(log|txt|json|csv|xml)$/i;

    if (files.some((file) => !allowedExtensions.test(file.name))) {
      setLogError("Supported files: .log, .txt, .json, .csv and .xml.");
      event.target.value = "";
      return;
    }

    if (files.some((file) => file.size > MAX_LOG_FILE_SIZE)) {
      setLogError("Each diagnostic file must be 2 MB or smaller.");
      event.target.value = "";
      return;
    }

    const existingSize = logFiles.reduce((total, file) => total + file.size, 0);
    const newSize = files.reduce((total, file) => total + file.size, 0);

    if (existingSize + newSize > MAX_TOTAL_LOG_SIZE) {
      setLogError("Total diagnostic file size cannot exceed 5 MB.");
      event.target.value = "";
      return;
    }

    const existingNames = new Set(logFiles.map((file) => file.name));
    const duplicate = files.find((file) => existingNames.has(file.name));

    if (duplicate) {
      setLogError(
        `${duplicate.name} is already uploaded. Remove it before uploading it again.`
      );
      event.target.value = "";
      return;
    }

    try {
      const newFiles = await Promise.all(
        files.map(async (file) => ({
          name: file.name,
          size: file.size,
          content: await file.text(),
        }))
      );

      setLogFiles((previous) => [...previous, ...newFiles]);

      setLogContents((previous) =>
        [previous, ...newFiles.map(
          (file) => `--- ${file.name} ---\n${file.content}`
        )]
          .filter(Boolean)
          .join("\n\n")
      );
    } catch {
      setLogError("Could not read the selected diagnostic files.");
    }

    event.target.value = "";
  }

  function removeLogFile(indexToRemove) {
    const remainingFiles = logFiles.filter(
      (_, index) => index !== indexToRemove
    );

    setLogFiles(remainingFiles);

    setLogContents(
      remainingFiles
        .map((file) => `--- ${file.name} ---\n${file.content}`)
        .join("\n\n")
    );
  }

  async function handleIncidentJsonImport(event) {
    const file = event.target.files?.[0];

    setIncidentJsonError("");
    setImportedJsonName("");

    if (!file) return;

    if (file.size > 1024 * 1024) {
      setIncidentJsonError("JSON file must be 1 MB or smaller.");
      event.target.value = "";
      return;
    }

    try {
      const data = JSON.parse(await file.text());

      if (!data || typeof data !== "object" || Array.isArray(data)) {
        throw new Error("Expected a JSON object.");
      }

      const pick = (...keys) => {
        for (const key of keys) {
          if (typeof data[key] === "string") return data[key];
        }
        return "";
      };

      const description = pick(
        "incident", "description", "symptoms", "message"
      );
      if (description) setIncident(description);

      const importedService = pick("service", "service_name");
      const importedEnvironment = pick("environment");
      const importedSeverity = pick("severity");
      const importedVersion = pick(
        "version", "deployment", "deployment_version"
      );
      const importedChanges = pick(
        "recent_changes", "recentChanges", "changes"
      );

      if (importedService) setService(importedService);
      if (importedVersion) setVersion(importedVersion);
      if (importedChanges) setRecentChanges(importedChanges);

      if (importedEnvironment) {
        const match = [
          "Production", "Staging", "Development", "Testing"
        ].find(
          (item) => item.toLowerCase() === importedEnvironment.toLowerCase()
        );

        if (match) setEnvironment(match);
      }

      if (importedSeverity) {
        const match = ["Critical", "High", "Medium", "Low"].find(
          (item) => item.toLowerCase() === importedSeverity.toLowerCase()
        );

        if (match) setSeverity(match);
      }

      const knownKeys = [
        "incident", "description", "symptoms", "message",
        "service", "service_name", "environment", "severity",
        "version", "deployment", "deployment_version",
        "recent_changes", "recentChanges", "changes",
      ];

      const extraDetails = Object.entries(data)
        .filter(
          ([key, value]) =>
            !knownKeys.includes(key) &&
            ["string", "number", "boolean"].includes(typeof value)
        )
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n");

      if (extraDetails) {
        setPastedLogs((previous) =>
          [previous, extraDetails].filter(Boolean).join("\n")
        );
      }

      setImportedJsonName(file.name);
    } catch (err) {
      setIncidentJsonError(`Could not import JSON: ${err.message}`);
    }

    event.target.value = "";
  }

  async function pasteFromClipboard() {
    setLogError("");

    try {
      const text = await navigator.clipboard.readText();

      if (!text.trim()) {
        setLogError("Your clipboard is empty.");
        return;
      }

      setPastedLogs((previous) =>
        [previous, text].filter(Boolean).join("\n")
      );
    } catch {
      setLogError(
        "Clipboard access failed. You can paste directly into the log box."
      );
    }
  }

  function handleScreenshotChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setImageError("");

    const allowedTypes = ["image/png", "image/jpeg", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setImageError("Upload a PNG, JPG, or WEBP image.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_SCREENSHOT_SIZE) {
      setImageError("Screenshot must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    if (screenshotPreview) URL.revokeObjectURL(screenshotPreview);

    setScreenshot(file);
    setScreenshotPreview(URL.createObjectURL(file));
  }

  function removeScreenshot() {
    if (screenshotPreview) URL.revokeObjectURL(screenshotPreview);

    setScreenshot(null);
    setScreenshotPreview("");
    setImageError("");

    const input = document.getElementById("incident-screenshot");
    if (input) input.value = "";
  }

  async function analyzeIncident() {
    if (!incident.trim()) {
      setError("Please describe the incident before analyzing it.");
      return;
    }

    setLoading(true);
    setError("");
    setMemoryResult(null);
    setNoMemoryResult(null);
    setRemembered(false);

    try {
      const fullIncident = buildIncidentText();

      async function requestAnalysis(useMemory) {
        const response = await fetch(`${API_BASE_URL}/incidents/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            incident: fullIncident,
            use_memory: useMemory,
          }),
        });

        if (!response.ok) {
          const details = await response.text();
          throw new Error(
            `Analysis failed (${response.status}): ${details}`
          );
        }

        return response.json();
      }

      const withMemory = await requestAnalysis(true);
      setMemoryResult(withMemory);

      const withoutMemory = await requestAnalysis(false);
      setNoMemoryResult(withoutMemory);
    } catch (err) {
      console.error("RecallOps analysis error:", err);
      setError(`Could not analyze the incident: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function rememberIncident() {
    if (!rootCause.trim() || !resolution.trim() || !lesson.trim()) {
      setError("Enter the root cause, resolution, and lesson before saving.");
      return;
    }

    setRemembering(true);
    setError("");
    setRemembered(false);

    try {
      const response = await fetch(`${API_BASE_URL}/incidents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incident_id: `INC-${Date.now()}`,
          service,
          environment,
          deployment: version,
          symptoms: buildIncidentText(),
          investigation:
            "Investigated the incident using the supplied description, structured details, and diagnostic logs.",
          root_cause: rootCause,
          attempted_actions:
            "Reviewed incident details and supplied diagnostic information.",
          successful_resolution: resolution,
          lesson,
        }),
      });

      if (!response.ok) {
        const details = await response.text();
        throw new Error(details || `Request failed (${response.status})`);
      }

      setRemembered(true);
    } catch (err) {
      console.error("RecallOps save error:", err);
      setError(`Could not save the incident: ${err.message}`);
    } finally {
      setRemembering(false);
    }
  }

  const memoryAnalysis =
    memoryResult?.analysis || memoryResult?.result || "";

  const noMemoryAnalysis =
    noMemoryResult?.analysis || noMemoryResult?.result || "";

  const recalledMemories = parseRecalledMemories(
    memoryResult?.recalled_memory
  );

  const recalledText =
  memoryResult?.recalled_memory ??
  memoryResult?.memories ??
  "";

const memoryFound =
  memoryResult?.memory_found === true ||
  (typeof recalledText === "string" &&
    recalledText.trim() !== "" &&
    recalledText.trim() !== "None");

const memoryActuallyUsed = memoryResult?.memory_used === true;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">R</div>
          <div>
            <div className="brand-name">RecallOps</div>
            <div className="brand-subtitle">Incident Memory Intelligence</div>
          </div>
        </div>

        <div className="status">
          <span className="status-dot" />
          Hindsight Memory Connected
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="eyebrow">PRODUCTION INCIDENT RESPONSE</div>
          <h1>
            Your engineering team
            <br />
            should not have to solve the same incident twice.
          </h1>
          <p>
            RecallOps uses persistent organizational memory to find relevant
            past incidents and turn previous lessons into actionable
            recommendations.
          </p>
        </section>

        <section className="workspace">
          <div className="incident-panel">
            <div className="section-label">NEW INCIDENT</div>
            <label htmlFor="incident">What is happening?</label>
            <div className="live-badge"><span /> LIVE</div>

            <textarea
              id="incident"
              value={incident}
              onChange={(event) => setIncident(event.target.value)}
              placeholder="Describe the incident..."
            />

            <div className="input-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={toggleVoiceInput}
              >
                {listening ? "■ Stop voice input" : "🎙 Speak incident"}
              </button>
              <span className="input-hint">
                {listening ? "Listening..." : "Type or dictate your incident"}
              </span>
            </div>

            {voiceError && <p className="upload-error">{voiceError}</p>}

            <div className="structured-inputs">
              <div className="section-label">INCIDENT DETAILS</div>

              <div className="form-grid">
                <div className="form-field">
                  <label htmlFor="service">Service</label>
                  <input
                    id="service"
                    value={service}
                    onChange={(event) => setService(event.target.value)}
                    placeholder="e.g. Payment API"
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="environment">Environment</label>
                  <select
                    id="environment"
                    value={environment}
                    onChange={(event) => setEnvironment(event.target.value)}
                  >
                    <option>Production</option>
                    <option>Staging</option>
                    <option>Development</option>
                    <option>Testing</option>
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="severity">Severity</label>
                  <select
                    id="severity"
                    value={severity}
                    onChange={(event) => setSeverity(event.target.value)}
                  >
                    <option>Critical</option>
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="version">Deployment version</label>
                  <input
                    id="version"
                    value={version}
                    onChange={(event) => setVersion(event.target.value)}
                    placeholder="e.g. v2.9.1"
                  />
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="recentChanges">Recent changes</label>
                <textarea
                  id="recentChanges"
                  className="small-textarea"
                  value={recentChanges}
                  onChange={(event) => setRecentChanges(event.target.value)}
                  placeholder="Deployments, configuration changes, database migrations..."
                />
              </div>
            </div>

            <div className="extra-inputs">
              <div className="section-label">IMPORT INCIDENT</div>
              <div className="form-field">
                <label htmlFor="incident-json">Import from JSON</label>
                <input
                  id="incident-json"
                  type="file"
                  accept=".json,application/json"
                  onChange={handleIncidentJsonImport}
                />

                {importedJsonName && (
                  <p className="upload-help">Imported: {importedJsonName}</p>
                )}
                {incidentJsonError && (
                  <p className="upload-error">{incidentJsonError}</p>
                )}
              </div>
            </div>

            <div className="upload-section">
              <label htmlFor="incident-logs">
                Upload diagnostic files <span>(optional)</span>
              </label>
              <input
                id="incident-logs"
                type="file"
                accept=".log,.txt,.json,.csv,.xml,text/plain,application/json,text/csv,application/xml,text/xml"
                multiple
                onChange={handleLogUpload}
              />
              <p className="upload-help">
                LOG, TXT, JSON, CSV, XML · Maximum 2 MB per file and 5 MB total.
              </p>

              {logError && <p className="upload-error">{logError}</p>}

              {logFiles.length > 0 && (
                <div className="uploaded-files">
                  {logFiles.map((file, index) => (
                    <div
                      className="uploaded-file"
                      key={`${file.name}-${index}`}
                    >
                      <span>📄 {file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeLogFile(index)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="upload-section">
              <label htmlFor="pasted-logs">
                Paste logs or error output <span>(optional)</span>
              </label>
              <textarea
                id="pasted-logs"
                value={pastedLogs}
                onChange={(event) => setPastedLogs(event.target.value)}
                placeholder="Paste stack traces, exceptions, terminal output, or monitoring alerts..."
              />
              <button
                type="button"
                className="secondary-button"
                onClick={pasteFromClipboard}
              >
                Paste from clipboard
              </button>
            </div>

            <div className="upload-section">
              <label htmlFor="incident-screenshot">
                Incident screenshot <span>(optional)</span>
              </label>
              <input
                id="incident-screenshot"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleScreenshotChange}
              />

              {imageError && <p className="upload-error">{imageError}</p>}

              {screenshotPreview && (
                <div className="image-preview">
                  <img
                    src={screenshotPreview}
                    alt="Incident screenshot preview"
                  />
                  <div className="image-preview-footer">
                    <span>{screenshot?.name}</span>
                    <button type="button" onClick={removeScreenshot}>
                      Remove image
                    </button>
                  </div>
                </div>
              )}

              <p className="upload-help">
                PNG, JPG, WEBP · Maximum 5 MB. Preview only; image analysis
                is not connected yet.
              </p>
            </div>

            <button
              className="analyze-button"
              onClick={analyzeIncident}
              disabled={loading}
            >
              {loading ? "Analyzing..." : "Analyze with Memory →"}
            </button>

            {error && <div className="error-box">{error}</div>}

            <div className="process">
              <div className="process-item">
                <div className="process-number">01</div>
                <div>
                  <strong>Recall</strong>
                  <span>Search organizational memory</span>
                </div>
              </div>
              <div className="process-item">
                <div className="process-number">02</div>
                <div>
                  <strong>Reason</strong>
                  <span>Combine memory with current context</span>
                </div>
              </div>
              <div className="process-item">
                <div className="process-number">03</div>
                <div>
                  <strong>Recommend</strong>
                  <span>Generate actionable response</span>
                </div>
              </div>
            </div>
          </div>

          <div className="memory-panel">
            <div className="section-label">LIVE MEMORY MATCH</div>
            <h2>What have we seen before?</h2>

            <div className="memory-status">
              <span>●</span>
              {!memoryResult
                ? "WAITING FOR ANALYSIS"
                : memoryFound
                  ? "PAST MEMORY FOUND"
                  : "NO MEMORY CONFIRMED"}
            </div>

            {!memoryResult && (
              <div className="memory-card">
                <h3>Waiting for your incident</h3>
                <p>
                  Run an analysis to retrieve real Hindsight memories. This
                  panel will display the returned records instead of a
                  hard-coded example.
                </p>
              </div>
            )}

            {memoryResult && (
              <>
                <div className="memory-card">
                  <div className="memory-card-top">
                    <span className="memory-tag">
                      {memoryFound ? "LIVE RESULT" : "NO MATCH"}
                    </span>
                    <span className="relevant">
                      {memoryActuallyUsed ? "MEMORY USED" : "MEMORY NOT CONFIRMED"}
                    </span>
                  </div>

                  <h3>
                    {memoryFound
                      ? `${recalledMemories.length} recalled memory record${
                          recalledMemories.length === 1 ? "" : "s"
                        }`
                      : "No usable past memory confirmed"}
                  </h3>

                  <p>
                    {memoryFound
                      ? "These records were returned by the Hindsight recall request for this incident."
                      : "The backend did not confirm that usable historical memory was found. Review the analysis below."}
                  </p>
                </div>

                {recalledMemories.length > 0 && (
                  <div className="recalled-memory-list">
                    {recalledMemories.slice(0, 8).map((memory, index) => (
                      <article
                        className="memory-card"
                        key={`${memory.id}-${index}`}
                      >
                        <div className="memory-card-top">
                          <span className="memory-tag">
                            {memory.type}
                          </span>
                          <span className="relevant">
                            {memory.id === "raw-memory"
                              ? "RAW RESPONSE"
                              : memory.id}
                          </span>
                        </div>

                        <p className="recalled-memory-text">
                          {memory.text}
                        </p>
                      </article>
                    ))}
                  </div>
                )}

                {memoryResult.recalled_memory && (
                  <details className="raw-memory-details">
                    <summary>View full Hindsight response</summary>
                    <pre className="analysis-text">
                      {memoryResult.recalled_memory}
                    </pre>
                  </details>
                )}
              </>
            )}
          </div>
        </section>

        <section className="comparison-section">
          <div className="section-label">THE MEMORY DIFFERENCE</div>
          <h2>Generic AI vs organizational memory</h2>

          <div className="comparison-grid">
            <div className="comparison-card">
              <div className="comparison-icon">○</div>
              <div className="comparison-label">WITHOUT MEMORY</div>
              <h3>Generic troubleshooting</h3>
              <ul>
                <li>Check network and load balancer health</li>
                <li>Check downstream services</li>
                <li>Check database health</li>
                <li>Inspect deployment configuration</li>
                <li>Investigate broadly</li>
              </ul>
              <div className="comparison-note">
                Generated without retrieving organizational memory.
              </div>

              {noMemoryResult && (
                <pre className="analysis-text">
                  {noMemoryAnalysis ||
                    JSON.stringify(noMemoryResult, null, 2)}
                </pre>
              )}
            </div>

            <div className="comparison-card with-memory">
              <div className="comparison-icon">✦</div>
              <div className="comparison-label">WITH HINDSIGHT</div>
              <h3>Memory-informed response</h3>
              <ul>
                <li>Retrieve relevant past incidents</li>
                <li>Compare previous symptoms and causes</li>
                <li>Use lessons from earlier resolutions</li>
                <li>Prioritize evidence-based actions</li>
                <li>Reduce repeated troubleshooting</li>
              </ul>
              <div className="comparison-note">
                Shows the analysis returned by your live backend.
              </div>

              {memoryResult && (
                <pre className="analysis-text">
                  {memoryAnalysis ||
                    JSON.stringify(memoryResult, null, 2)}
                </pre>
              )}
            </div>
          </div>
        </section>

        {memoryResult && (
          <section className="analysis-section">
            <div className="analysis-header">
              <div>
                <div className="section-label">AI INCIDENT ANALYSIS</div>
                <h2>Remember this incident</h2>
              </div>
              <div className="ai-badge">Hindsight + AI</div>
            </div>

            <div className="analysis-card">
              <h3>Analysis with memory</h3>
              <pre className="analysis-text">
                {memoryAnalysis ||
                  JSON.stringify(memoryResult, null, 2)}
              </pre>
            </div>

            <div className="remember-section">
              <div className="remember-header">
                <div>
                  <div className="section-label">CLOSE THE LOOP</div>
                  <h2>Save the incident lesson</h2>
                  <p>
                    Record the verified root cause, resolution, and lesson
                    for future investigations.
                  </p>
                </div>
              </div>

              <div className="remember-grid">
                <div className="remember-field">
                  <label htmlFor="rootCause">Root cause</label>
                  <textarea
                    id="rootCause"
                    value={rootCause}
                    onChange={(event) => setRootCause(event.target.value)}
                    placeholder="What caused the incident?"
                  />
                </div>

                <div className="remember-field">
                  <label htmlFor="resolution">Successful resolution</label>
                  <textarea
                    id="resolution"
                    value={resolution}
                    onChange={(event) => setResolution(event.target.value)}
                    placeholder="What fixed the incident?"
                  />
                </div>

                <div className="remember-field">
                  <label htmlFor="lesson">Lesson learned</label>
                  <textarea
                    id="lesson"
                    value={lesson}
                    onChange={(event) => setLesson(event.target.value)}
                    placeholder="What should the team remember?"
                  />
                </div>
              </div>

              <button
                className="remember-button"
                onClick={rememberIncident}
                disabled={remembering || remembered}
              >
                {remembering
                  ? "Saving..."
                  : remembered
                    ? "✓ Saved"
                    : "Remember This Incident →"}
              </button>

              {remembered && (
  <div className="remember-success" role="status">
    ✓ Incident submitted successfully to Hindsight.
  </div>
)}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
