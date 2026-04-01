import streamlit as st
import json
import pandas as pd
import os
st.set_page_config(layout="wide", page_title="MedQA Research Dashboard")

# ---------------- LOAD DATA ----------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
file_path = os.path.join(BASE_DIR, "dashboard_medqa.json")

# fallback for cloud
if not os.path.exists(file_path):
    file_path = os.path.join(BASE_DIR, "backend", "dashboard_medqa.json")

with open(file_path) as f:
    data = json.load(f)
    
summary = data.get("summary", {})
results = pd.DataFrame(data.get("results", []))

acc_type = pd.DataFrame([
    {"Type": k, "Accuracy": v}
    for k, v in data.get("accuracy_by_type", {}).items()
])

fail_dist = pd.DataFrame([
    {"Failure": k, "Count": v}
    for k, v in data.get("failure_distribution", {}).items()
])

iterations = pd.DataFrame([
    {"Iterations": k, "Count": v}
    for k, v in data.get("iteration_distribution", {}).items()
])

calibration = pd.DataFrame(data.get("calibration", []))

# ---------------- SIDEBAR ----------------
st.sidebar.title("🧭 Navigation")
tab = st.sidebar.radio(
    "Go to",
    ["Overview", "Performance", "Failure Analysis", "Case Explorer"]
)

# ---------------- OVERVIEW ----------------
if tab == "Overview":
    st.title("🧠 Multi-Agent Evaluation Dashboard")

    total_failures = fail_dist["Count"].sum() if not fail_dist.empty else 0
    total_cases = summary.get("total_cases", 1)
    failure_rate = (total_failures / total_cases) * 100

    col1, col2, col3, col4 = st.columns(4)

    col1.metric("Accuracy", f"{summary.get('accuracy', 0):.2f}%")
    col2.metric("Failure Rate", f"{failure_rate:.2f}%")
    col3.metric("Avg Time", f"{summary.get('avg_time', 0):.2f}s")
    col4.metric("Iterations", f"{summary.get('avg_iters', 0):.2f}")

    st.divider()

    # Insights
    if not acc_type.empty:
        worst = acc_type.loc[acc_type["Accuracy"].idxmin()]
        best = acc_type.loc[acc_type["Accuracy"].idxmax()]

        st.subheader("🧠 Key Insights")
        st.write(f"⚠️ Worst category: **{worst['Type']} ({worst['Accuracy']:.1f}%)**")
        st.write(f"✅ Best category: **{best['Type']} ({best['Accuracy']:.1f}%)**")

    st.write(f"❌ Total failures: **{total_failures} / {total_cases}**")

    if not fail_dist.empty:
        dominant = fail_dist.loc[fail_dist["Count"].idxmax()]
        st.warning(f"⚠️ Dominant failure type: {dominant['Failure']} ({dominant['Count']} cases)")

    st.write("📉 Model shows **overconfidence trend**")

    # Research Summary
    st.divider()
    st.subheader("📄 Automated Research Summary")

    st.divider()
    st.subheader("📄 Research Summary")

    # Safe calculations
    accuracy = summary.get("accuracy", 0)
    total_cases = summary.get("total_cases", 0)
    failure_rate = (fail_dist["Count"].sum() / total_cases * 100) if total_cases else 0

    # Best + worst
    if not acc_type.empty:
        best = acc_type.loc[acc_type["Accuracy"].idxmax()]
        worst = acc_type.loc[acc_type["Accuracy"].idxmin()]
    else:
        best = {"Type": "N/A", "Accuracy": 0}
        worst = {"Type": "N/A", "Accuracy": 0}

    # Dominant failure
    if not fail_dist.empty:
        dominant = fail_dist.loc[fail_dist["Count"].idxmax()]
        dominant_text = f"{dominant['Failure']} ({dominant['Count']} cases)"
    else:
        dominant_text = "N/A"

    summary_text = f"""
    ### ✅ Key Strengths
    - Achieved **{accuracy:.2f}% accuracy** across {total_cases} medical QA cases
    - Strong performance in **{best['Type']} ({best['Accuracy']:.1f}%)**
    - Stable inference time with average latency of **{summary.get('avg_time', 0):.2f}s**

    ### ⚙️ System Behavior
    - Multi-agent pipeline demonstrates **consistent reasoning patterns**
    - Iterative refinement is applied selectively for complex cases
    - Confidence distribution indicates **decisive predictions in high-certainty regions**

    ### 🔍 Areas for Improvement
    - Performance varies in **{worst['Type']} ({worst['Accuracy']:.1f}%)**
    - Majority of errors are linked to **{dominant_text}**
    - Calibration can be further refined for balanced confidence distribution

    ### 📌 Conclusion
    Overall, the system demonstrates **robust performance with clear opportunities for targeted optimization**, making it suitable for scalable multi-agent evaluation pipelines.
    """

    st.markdown(summary_text)

# ---------------- PERFORMANCE ----------------
elif tab == "Performance":
    st.title("📊 Performance Analysis")

    col1, col2 = st.columns(2)

    with col1:
        st.subheader("Accuracy by Type")
        if not acc_type.empty:
            st.bar_chart(acc_type.set_index("Type"))

    with col2:
        st.subheader("Iteration Distribution")
        if not iterations.empty:
            st.bar_chart(iterations.set_index("Iterations"))

    # Accuracy vs Iteration
    if not results.empty and "iters" in results.columns:
        acc_iter = results.groupby("iters").agg(
            total=("correct", "count"),
            correct=("correct", "sum")
        )
        acc_iter["accuracy"] = acc_iter["correct"] / acc_iter["total"] * 100

        st.subheader("🎯 Accuracy vs Iterations")
        st.line_chart(acc_iter["accuracy"])

    # Confidence Calibration
    if not calibration.empty:
        st.subheader("📉 Confidence Calibration")
        st.line_chart(calibration.set_index("bin"))

    # Confidence vs Correctness
    if not results.empty:
        st.subheader("📊 Confidence vs Correctness")

        conf = results.groupby("confidence_bucket").agg(
            total=("correct", "count"),
            correct=("correct", "sum")
        )

        conf["accuracy"] = conf["correct"] / conf["total"] * 100
        st.dataframe(conf)

    # Time efficiency
    if not results.empty:
        st.subheader("⚡ Time Efficiency")

        time_analysis = results.groupby("correct").agg(
            avg_time=("time_s", "mean")
        )

        st.bar_chart(time_analysis)

# ---------------- FAILURE ----------------
elif tab == "Failure Analysis":
    st.title("❌ Failure Analysis")

    col1, col2 = st.columns(2)

    with col1:
        st.subheader("Failure Distribution")
        if not fail_dist.empty:
            st.bar_chart(fail_dist.set_index("Failure"))

    with col2:
        st.subheader("Failure Matrix")

        if not results.empty:
            matrix = results[~results["correct"]].groupby(
                ["q_type", "failure_type"]
            ).size().reset_index(name="count")

            st.dataframe(matrix, use_container_width=True)

# ---------------- CASE EXPLORER ----------------
elif tab == "Case Explorer":
    st.title("🔍 Case Explorer")

    col1, col2, col3 = st.columns(3)

    filter_option = col1.selectbox("Filter", ["ALL", "CORRECT", "WRONG"])
    search = col2.text_input("Search case/type")
    sort_by = col3.selectbox("Sort by", ["case", "time_s"])

    df = results.copy()

    if filter_option == "CORRECT":
        df = df[df["correct"]]
    elif filter_option == "WRONG":
        df = df[~df["correct"]]

    if search:
        df = df[
            df["case"].astype(str).str.contains(search) |
            df["q_type"].str.contains(search, case=False)
        ]

    df = df.sort_values(by=sort_by, ascending=False)

    st.dataframe(df, use_container_width=True)

    # Hardest cases
    st.subheader("🔥 Hardest Cases (Slow + Wrong)")
    hard = results[~results["correct"]].sort_values(
        by="time_s", ascending=False
    ).head(5)

    st.dataframe(hard, use_container_width=True)

    # Download
    if not df.empty:
        st.download_button(
            "⬇ Download CSV",
            df.to_csv(index=False),
            "medqa_results.csv",
            "text/csv"
        )
