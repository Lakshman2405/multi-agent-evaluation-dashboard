import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line, ResponsiveContainer, Cell
} from "recharts";

function App() {
  const [summary, setSummary] = useState({});
  const [accType, setAccType] = useState([]);
  const [failDist, setFailDist] = useState([]);
  const [calibration, setCalibration] = useState([]);
  const [iterations, setIterations] = useState([]);
  const [results, setResults] = useState([]);

  const [activeTab, setActiveTab] = useState("overview");
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("case");
  const [selectedCase, setSelectedCase] = useState(null);

  useEffect(() => {
    axios.get("http://127.0.0.1:8000/summary").then(res => setSummary(res.data));

    axios.get("http://127.0.0.1:8000/accuracy-by-type")
      .then(res => setAccType(Object.entries(res.data).map(([k, v]) => ({ name: k, value: v }))));

    axios.get("http://127.0.0.1:8000/failure-distribution")
      .then(res => setFailDist(Object.entries(res.data).map(([k, v]) => ({ name: k, value: v }))));

    axios.get("http://127.0.0.1:8000/calibration").then(res => setCalibration(res.data));

    axios.get("http://127.0.0.1:8000/iterations")
      .then(res => setIterations(Object.entries(res.data).map(([k, v]) => ({ name: k, value: v }))));

    axios.get("http://127.0.0.1:8000/results").then(res => setResults(res.data));
  }, []);

  // FILTER + SEARCH
  const filteredResults = results
    .filter(r => {
      if (filter === "CORRECT") return r.correct;
      if (filter === "WRONG") return !r.correct;
      return true;
    })
    .filter(r =>
      r.case.toString().includes(search) ||
      r.q_type.toLowerCase().includes(search.toLowerCase())
    );

  // SORT
  const sortedResults = [...filteredResults].sort((a, b) => {
    if (sortBy === "time") return b.time_s - a.time_s;
    return a.case - b.case;
  });

  // ANALYTICS
  const totalFailures = failDist.reduce((s, f) => s + f.value, 0);

  const worstType = accType.reduce((min, curr) =>
    curr.value < min.value ? curr : min, accType[0] || {});

  const accByIter = Object.values(
    results.reduce((acc, r) => {
      if (!acc[r.iters]) acc[r.iters] = { iter: r.iters, total: 0, correct: 0 };
      acc[r.iters].total++;
      if (r.correct) acc[r.iters].correct++;
      return acc;
    }, {})
  ).map(x => ({
    name: `Iter ${x.iter}`,
    value: (x.correct / x.total) * 100
  }));

  const failureMatrix = Object.values(
    results.reduce((acc, r) => {
      if (!r.correct) {
        const key = `${r.q_type}-${r.failure_type}`;
        acc[key] = acc[key] || { name: key, value: 0 };
        acc[key].value++;
      }
      return acc;
    }, {})
  );

  // EXPORT
  const exportCSV = () => {
    const headers = Object.keys(results[0]).join(",");
    const rows = results.map(r => Object.values(r).join(","));
    const blob = new Blob([headers + "\n" + rows.join("\n")]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "results.csv";
    a.click();
  };

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h1 style={{ textAlign: "center" }}>🧠 Multi-Agent Evaluation Dashboard</h1>

      {/* NAVBAR */}
      <div style={navBar}>
        {["overview", "performance", "failure", "cases"].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              ...tabBtn,
              background: activeTab === tab ? "#1976D2" : "#eee",
              color: activeTab === tab ? "#fff" : "#000"
            }}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {/* ================= OVERVIEW ================= */}
      {activeTab === "overview" && (
        <>
          <div style={{ display: "flex", gap: 15 }}>
            <Card title="Accuracy" value={`${summary.accuracy?.toFixed(2)}%`} color="green" />
            <Card title="Failure Rate" value={`${((totalFailures / summary.total_cases) * 100).toFixed(1)}%`} color="red" />
            <Card title="Avg Time" value={`${summary.avg_time?.toFixed(1)}s`} />
            <Card title="Iterations" value={summary.avg_iters?.toFixed(2)} />
          </div>

          <div style={panel}>
            <h3>Key Insights</h3>
            <p>Worst category: <b>{worstType?.name}</b></p>
            <p>Failures dominated by: <b>{failDist[0]?.name}</b></p>
            <p>Model is <b>overconfident</b></p>
          </div>
        </>
      )}

      {/* ================= PERFORMANCE ================= */}
      {activeTab === "performance" && (
        <Grid>
          <Chart title="Accuracy by Type" data={accType} color="#4CAF50" />
          <Chart title="Iteration Distribution" data={iterations} color="#FF9800" />
          <Chart title="Accuracy vs Iteration" data={accByIter} color="#2196F3" />
          <LinePanel title="Calibration" data={calibration} />
        </Grid>
      )}

      {/* ================= FAILURE ================= */}
      {activeTab === "failure" && (
        <Grid>
          <Chart title="Failure Distribution" data={failDist} color="#f44336" />
          <Chart title="Failure Matrix" data={failureMatrix} color="#9C27B0" />
        </Grid>
      )}

      {/* ================= CASES ================= */}
      {activeTab === "cases" && (
        <>
          <div>
            <select onChange={e => setFilter(e.target.value)}>
              <option value="ALL">All</option>
              <option value="CORRECT">Correct</option>
              <option value="WRONG">Wrong</option>
            </select>

            <select onChange={e => setSortBy(e.target.value)}>
              <option value="case">Sort by Case</option>
              <option value="time">Sort by Time</option>
            </select>

            <input placeholder="Search..." onChange={e => setSearch(e.target.value)} />

            <button onClick={exportCSV}>Export</button>
          </div>

          <table style={{ width: "100%", marginTop: 20 }}>
            <thead>
              <tr>
                <th>Case</th><th>Status</th><th>Type</th><th>Time</th><th>Conf</th>
              </tr>
            </thead>
            <tbody>
              {sortedResults.map(r => (
                <tr key={r.case}
                  onClick={() => setSelectedCase(r)}
                  style={{ background: r.correct ? "#e8f5e9" : "#ffebee", cursor: "pointer" }}>
                  <td>{r.case}</td>
                  <td>{r.correct ? "✅" : "❌"}</td>
                  <td>{r.q_type}</td>
                  <td>{r.time_s}</td>
                  <td>{r.confidence_bucket}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* MODAL */}
      {selectedCase && (
        <div style={modal}>
          <div style={modalBox}>
            <h3>Case {selectedCase.case}</h3>
            <p>Truth: {selectedCase.truth}</p>
            <p>Predicted: {selectedCase.predicted}</p>
            <p>Failure: {selectedCase.failure_type}</p>
            <p>Confidence: {selectedCase.confidence_bucket}</p>
            <button onClick={() => setSelectedCase(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

// COMPONENTS
const Card = ({ title, value, color }) => (
  <div style={{ flex: 1, padding: 15, background: "#f5f5f5", textAlign: "center" }}>
    <h4>{title}</h4>
    <h2 style={{ color }}>{value}</h2>
  </div>
);

const Chart = ({ title, data, color }) => {
  const min = Math.min(...data.map(d => d.value));
  return (
    <div style={panel}>
      <h3>{title}</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value">
            {data.map((d, i) => (
              <Cell key={i} fill={d.value === min ? "red" : color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const LinePanel = ({ title, data }) => (
  <div style={panel}>
    <h3>{title}</h3>
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="bin" />
        <YAxis />
        <Tooltip />
        <Line dataKey="accuracy" stroke="#2196F3" />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

const Grid = ({ children }) => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
    {children}
  </div>
);

// STYLES
const navBar = { display: "flex", gap: 10, marginBottom: 20 };
const tabBtn = { padding: 10, border: "none", cursor: "pointer", borderRadius: 5 };

const panel = {
  padding: 15,
  background: "#fff",
  borderRadius: 10,
  boxShadow: "0 2px 6px rgba(0,0,0,0.1)"
};

const modal = {
  position: "fixed",
  top: 0, left: 0,
  width: "100%", height: "100%",
  background: "rgba(0,0,0,0.5)",
  display: "flex", justifyContent: "center", alignItems: "center"
};

const modalBox = {
  background: "#fff",
  padding: 20,
  borderRadius: 10
};

export default App;