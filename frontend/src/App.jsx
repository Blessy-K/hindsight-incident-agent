import { useState } from "react";
import "./App.css";
const API_BASE_URL = "https://hindsight-incident-agent.onrender.com";
const demoIncident =
  "The Payment API is returning HTTP 503 errors shortly after deployment v2.9.1. Checkout requests are failing intermittently and database connections appear unusually high.";

function getSection(text, title, nextTitle) {
  if (!text) return "";

  const start = text.indexOf(title);

  if (start === -1) return "";

  const contentStart = start + title.length;

  if (!nextTitle) {
    return text.slice(contentStart).trim();
  }

  const end = text.indexOf(nextTitle, contentStart);

  if (end === -1) {
    return text.slice(contentStart).trim();
  }

  return text.slice(contentStart, end).trim();
}

function cleanSection(text) {
  if (!text) return "";

  return text
    .replace(/\*\*/g, "")
    .replace(/```/g, "")
    .replace(/^[:\-\s]+/, "")
    .replace(/\n\s*\n/g, "\n")
    .trim();
}

function App() {
  const [incident, setIncident] = useState(demoIncident);
  const [memoryResult, setMemoryResult] = useState(null);
  const [noMemoryResult, setNoMemoryResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [remembering, setRemembering] = useState(false);
  const [remembered, setRemembered] = useState(false);
  const [error, setError] = useState("");

  const [rootCause, setRootCause] = useState(
    "Database connection pool exhaustion after deployment."
  );

  const [successfulResolution, setSuccessfulResolution] = useState(
    "Increase the database connection pool and monitor connection usage."
  );

  const [lesson, setLesson] = useState(
    "Check database connection utilization before repeated restarts."
  );

  const analyzeIncident = async () => {
  if (!incident.trim()) {
    setError("Please describe the incident first.");
    return;
  }

  setLoading(true);
  setError("");
  setMemoryResult(null);
  setNoMemoryResult(null);

  try {
    console.log("Calling RecallOps backend:", API_BASE_URL);

    const memoryResponse = await fetch(
      `${API_BASE_URL}/incidents/analyze`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          incident,
          use_memory: true,
        }),
      }
    );

    console.log("Memory response:", memoryResponse.status);

    if (!memoryResponse.ok) {
      const errorText = await memoryResponse.text();
      throw new Error(
        `Memory analysis failed (${memoryResponse.status}): ${errorText}`
      );
    }

    const memoryData = await memoryResponse.json();
    setMemoryResult(memoryData);

    const noMemoryResponse = await fetch(
      `${API_BASE_URL}/incidents/analyze`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          incident,
          use_memory: false,
        }),
      }
    );

    console.log(
      "Without-memory response:",
      noMemoryResponse.status
    );

    if (!noMemoryResponse.ok) {
      const errorText = await noMemoryResponse.text();
      throw new Error(
        `Without-memory analysis failed (${noMemoryResponse.status}): ${errorText}`
      );
    }

    const noMemoryData = await noMemoryResponse.json();
    setNoMemoryResult(noMemoryData);

  } catch (err) {
    console.error("RecallOps API error:", err);
    setError(`Backend error: ${err.message}`);
  } finally {
    setLoading(false);
  }
};

  const rememberIncident = async () => {
    if (!incident.trim()) {
      setError("Please describe the incident first.");
      return;
    }

    if (!rootCause.trim() || !successfulResolution.trim() || !lesson.trim()) {
      setError("Please complete the root cause, resolution, and lesson fields.");
      return;
    }

    setRemembering(true);
    setError("");
    setRemembered(false);

    try {
      const response = await fetch("http://127.0.0.1:8000/incidents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          incident_id: `INC-${Date.now()}`,
          service: "Payment API",
          environment: "Production",
          deployment: "v2.9.1",
          symptoms: incident,
          investigation:
            "Reviewed API errors, database connection usage, deployment changes, and connection-pool behavior.",
          root_cause: rootCause,
          attempted_actions:
            "Checked application health, database metrics, deployment configuration, and connection usage.",
          successful_resolution: successfulResolution,
          lesson: lesson,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to store incident.");
      }

      setRemembered(true);
    } catch (err) {
      setError(
        "Could not save the incident to Hindsight. Make sure FastAPI is running on port 8000."
      );
    } finally {
      setRemembering(false);
    }
  };

  const memoryAnalysis = memoryResult?.analysis || "";

  const similarPastIncidents = cleanSection(
    getSection(
      memoryAnalysis,
      "SIMILAR PAST INCIDENTS:",
      "WHAT WE LEARNED:"
    )
  );

  const whatWeLearned = cleanSection(
    getSection(
      memoryAnalysis,
      "WHAT WE LEARNED:",
      "LIKELY CAUSE:"
    )
  );

  const likelyCause = cleanSection(
    getSection(
      memoryAnalysis,
      "LIKELY CAUSE:",
      "RECOMMENDED ACTIONS:"
    )
  );

  const recommendedActions = cleanSection(
    getSection(
      memoryAnalysis,
      "RECOMMENDED ACTIONS:",
      "WHY MEMORY MATTERS:"
    )
  );

  const whyMemoryMatters = cleanSection(
    getSection(memoryAnalysis, "WHY MEMORY MATTERS:")
  );

  return (
    <div className="app">

      {/* HEADER */}

      <header className="topbar">

        <div className="brand">

          <div className="brand-mark">
            R
          </div>

          <div>
            <div className="brand-name">
              RecallOps
            </div>

            <div className="brand-subtitle">
              Incident Memory Intelligence
            </div>
          </div>

        </div>

        <div className="status">
          <span className="status-dot"></span>
          Hindsight Memory Active
        </div>

      </header>


      <main>

        {/* HERO */}

        <section className="hero">

          <div className="eyebrow">
            PRODUCTION INCIDENT RESPONSE
          </div>

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


        {/* INCIDENT WORKSPACE */}

        <section className="workspace">

          <div className="incident-panel">

            <div className="section-label">
              NEW INCIDENT
            </div>

            <label htmlFor="incident">
              What is happening?
            </label>

            <div className="live-badge">
              <span></span>
              LIVE
            </div>

            <textarea
              id="incident"
              value={incident}
              onChange={(e) => setIncident(e.target.value)}
              placeholder="Describe the production incident..."
            />

            <button
              className="analyze-button"
              onClick={analyzeIncident}
              disabled={loading}
            >
              {loading
                ? "Analyzing..."
                : "Analyze with Memory →"}
            </button>

            {error && (
              <div className="error-box">
                {error}
              </div>
            )}

            <div className="process">

              <div className="process-item">

                <div className="process-number">
                  01
                </div>

                <div>
                  <strong>
                    Recall
                  </strong>

                  <span>
                    Search organizational memory
                  </span>
                </div>

              </div>


              <div className="process-item">

                <div className="process-number">
                  02
                </div>

                <div>
                  <strong>
                    Reason
                  </strong>

                  <span>
                    Combine memory with current context
                  </span>
                </div>

              </div>


              <div className="process-item">

                <div className="process-number">
                  03
                </div>

                <div>
                  <strong>
                    Recommend
                  </strong>

                  <span>
                    Generate actionable response
                  </span>
                </div>

              </div>

            </div>

          </div>


          {/* MEMORY MATCH */}

          <div className="memory-panel">

            <div className="section-label">
              MEMORY MATCH
            </div>

            <h2>
              What have we seen before?
            </h2>

            <div className="memory-status">
              <span>●</span>
              {memoryResult ? "RECALLED" : "READY"}
            </div>


            <div className="memory-card">

              <div className="memory-card-top">

                <span className="memory-tag">
                  INC-001
                </span>

                <span className="relevant">
                  RELEVANT MEMORY
                </span>

              </div>


              <h3>
                Payment API — HTTP 503
              </h3>


              <p>
                A previous Payment API incident showed the same pattern:
                deployment followed by 503 errors and unusually high
                database connections.
              </p>


              <div className="memory-detail">

                <span>
                  Previous resolution
                </span>

                <strong>
                  Database pool increased from 50 → 100
                </strong>

              </div>


              <div className="memory-detail">

                <span>
                  Lesson learned
                </span>

                <strong>
                  Check database connection utilization before repeated
                  restarts.
                </strong>

              </div>

            </div>

          </div>

        </section>


        {/* MEMORY DIFFERENCE */}

        <section className="comparison-section">

          <div className="section-label">
            THE MEMORY DIFFERENCE
          </div>

          <h2>
            Generic AI vs organizational memory
          </h2>


          <div className="comparison-grid">

            <div className="comparison-card">

              <div className="comparison-icon">
                ○
              </div>

              <div className="comparison-label">
                WITHOUT MEMORY
              </div>

              <h3>
                Generic troubleshooting
              </h3>

              <ul>

                <li>
                  Check network and load balancer health
                </li>

                <li>
                  Check downstream services
                </li>

                <li>
                  Check database health
                </li>

                <li>
                  Inspect deployment configuration
                </li>

                <li>
                  Investigate broadly
                </li>

              </ul>

              <div className="comparison-note">
                No organizational context from previous incidents.
              </div>

            </div>


            <div className="comparison-card with-memory">

              <div className="comparison-icon">
                ✦
              </div>

              <div className="comparison-label">
                WITH HINDSIGHT
              </div>

              <h3>
                Memory-informed response
              </h3>

              <ul>

                <li>
                  <strong>
                    INC-001 recalled
                  </strong>{" "}
                  with the same 503 pattern
                </li>

                <li>
                  <strong>
                    High DB connections identified
                  </strong>{" "}
                  as the key diagnostic signal
                </li>

                <li>
                  <strong>
                    Pool configuration prioritized
                  </strong>
                </li>

                <li>
                  <strong>
                    Previous resolution surfaced
                  </strong>
                </li>

                <li>
                  <strong>
                    v2.9.1 changes become the focus
                  </strong>
                </li>

              </ul>

              <div className="comparison-note">
                Hindsight supplies persistent organizational experience.
              </div>

            </div>

          </div>

        </section>


        {/* AI ANALYSIS */}

        {memoryResult && (

          <section className="analysis-section">

            <div className="analysis-header">

              <div>

                <div className="section-label">
                  AI INCIDENT ANALYSIS
                </div>

                <h2>
                  Recommended response
                </h2>

              </div>

              <div className="ai-badge">
                Hindsight + AI
              </div>

            </div>


            <div className="analysis-grid">

              <div className="analysis-card">

                <h3>
                  Similar Past Incidents
                </h3>

                <div className="analysis-text">
                  {similarPastIncidents}
                </div>

              </div>


              <div className="analysis-card">

                <h3>
                  What We Learned
                </h3>

                <div className="analysis-text">
                  {whatWeLearned}
                </div>

              </div>


              <div className="analysis-card">

                <h3>
                  Likely Cause
                </h3>

                <div className="analysis-text">
                  {likelyCause}
                </div>

              </div>


              <div className="analysis-card">

                <h3>
                  Recommended Actions
                </h3>

                <div className="analysis-text">
                  {recommendedActions}
                </div>

              </div>

            </div>


            <div className="why-memory">

              <div className="why-icon">
                ✦
              </div>

              <div>

                <div className="section-label">
                  WHY MEMORY MATTERS
                </div>

                <h3>
                  The previous incident changed the investigation.
                </h3>

                <p>
                  {whyMemoryMatters}
                </p>

              </div>

            </div>


            {/* REMEMBER THIS INCIDENT */}

            <div className="remember-section">

              <div className="remember-header">

                <div>
                  <div className="section-label">
                    CLOSE THE LOOP
                  </div>

                  <h2>
                    Remember this incident
                  </h2>

                  <p>
                    Save the resolution and lesson to Hindsight so future
                    incidents can benefit from this experience.
                  </p>
                </div>

                <div className="remember-badge">
                  LEARN
                </div>

              </div>


              <div className="remember-grid">

                <div className="remember-field">

                  <label htmlFor="rootCause">
                    Root cause
                  </label>

                  <textarea
                    id="rootCause"
                    value={rootCause}
                    onChange={(e) => setRootCause(e.target.value)}
                    placeholder="What caused the incident?"
                  />

                </div>


                <div className="remember-field">

                  <label htmlFor="resolution">
                    Successful resolution
                  </label>

                  <textarea
                    id="resolution"
                    value={successfulResolution}
                    onChange={(e) =>
                      setSuccessfulResolution(e.target.value)
                    }
                    placeholder="What fixed the incident?"
                  />

                </div>


                <div className="remember-field">

                  <label htmlFor="lesson">
                    Lesson learned
                  </label>

                  <textarea
                    id="lesson"
                    value={lesson}
                    onChange={(e) => setLesson(e.target.value)}
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
                  ? "Saving to Hindsight..."
                  : remembered
                  ? "✓ Remembered in Hindsight"
                  : "Remember This Incident →"}
              </button>


              {remembered && (
                <div className="remember-success">
                  ✓ Incident resolution and lesson were stored in
                  organizational memory.
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