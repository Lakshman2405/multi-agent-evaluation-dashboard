from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import json

app = FastAPI()

# Allow React to access backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load data
with open("dashboard_medqa.json") as f:
    data = json.load(f)


# =========================
# API ENDPOINTS
# =========================

@app.get("/")
def root():
    return {"message": "MedQA Dashboard API running"}


@app.get("/summary")
def get_summary():
    return data["summary"]


@app.get("/results")
def get_results():
    return data["results"]


@app.get("/accuracy-by-type")
def accuracy_by_type():
    return data["accuracy_by_type"]


@app.get("/failure-distribution")
def failure_distribution():
    return data["failure_distribution"]


@app.get("/iteration-distribution")
def iteration_distribution():
    return data["iteration_distribution"]

@app.get("/calibration")
def get_calibration():
    return data["calibration"]

@app.get("/iterations")
def get_iterations():
    return data["iteration_distribution"]



@app.get("/dataset-comparison")
def dataset_comparison():
    return data.get("dataset_comparison", [])

@app.get("/failure-analysis")
def failure_analysis():
    return data.get("failure_analysis", [])

@app.get("/agent-trace/{case_id}")
def agent_trace(case_id: int):
    traces = data.get("agent_traces", {})
    return traces.get(str(case_id), [])

@app.get("/export")
def export_data():
    return data