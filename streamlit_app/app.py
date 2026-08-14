import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import io
import os

# ── Page config ──────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="Ad Campaign Performance Analyzer",
    page_icon="📊",
    layout="wide",
)

# ── Data loading & cleaning ───────────────────────────────────────────────────

DEFAULT_CSV_PATH = os.path.join(
    os.path.dirname(__file__),
    "..",
    "artifacts",
    "ad-campaign-analyzer",
    "public",
    "social_media_advertising_sample.csv",
)


def clean_data(df: pd.DataFrame) -> pd.DataFrame:
    """Clean and enrich the raw CSV dataframe."""
    df = df.copy()

    # Drop rows missing critical fields
    required = ["Clicks", "Impressions", "Conversion_Rate", "ROI"]
    df = df.dropna(subset=required)

    # Acquisition_Cost → Spend (strip $ and commas, cast to float)
    if "Acquisition_Cost" in df.columns:
        df["Spend"] = (
            df["Acquisition_Cost"]
            .astype(str)
            .str.replace(r"[$,]", "", regex=True)
            .str.strip()
        )
        df["Spend"] = pd.to_numeric(df["Spend"], errors="coerce").fillna(0.0)

    # Duration → Duration_Days (extract numeric)
    if "Duration" in df.columns:
        df["Duration_Days"] = (
            df["Duration"]
            .astype(str)
            .str.extract(r"(\d+)")[0]
            .pipe(pd.to_numeric, errors="coerce")
            .fillna(0)
            .astype(int)
        )

    # Date → datetime
    if "Date" in df.columns:
        df["Date"] = pd.to_datetime(df["Date"], errors="coerce")
        df = df.dropna(subset=["Date"])

    # Numeric casts
    for col in ["Clicks", "Impressions", "Conversion_Rate", "ROI", "Engagement_Score"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

    # Derived Conversions
    df["Conversions"] = (df["Clicks"] * df["Conversion_Rate"]).round().astype(int)

    return df


@st.cache_data
def load_default_data() -> pd.DataFrame:
    df = pd.read_csv(DEFAULT_CSV_PATH)
    return clean_data(df)


def load_uploaded_data(uploaded_file) -> pd.DataFrame:
    df = pd.read_csv(uploaded_file)
    return clean_data(df)


# ── Metric helpers ────────────────────────────────────────────────────────────

def compute_metrics(df: pd.DataFrame) -> dict:
    if df.empty:
        return {k: 0 for k in ["total_spend", "total_conversions", "ctr", "cpc", "avg_cvr", "cpa", "avg_roi"]}

    total_spend = df["Spend"].sum()
    total_conversions = df["Conversions"].sum()
    total_clicks = df["Clicks"].sum()
    total_impressions = df["Impressions"].sum()

    ctr = (total_clicks / total_impressions * 100) if total_impressions > 0 else 0
    cpc = (total_spend / total_clicks) if total_clicks > 0 else 0
    avg_cvr = df["Conversion_Rate"].mean() * 100
    cpa = (total_spend / total_conversions) if total_conversions > 0 else 0
    avg_roi = df["ROI"].mean()

    return {
        "total_spend": total_spend,
        "total_conversions": total_conversions,
        "ctr": ctr,
        "cpc": cpc,
        "avg_cvr": avg_cvr,
        "cpa": cpa,
        "avg_roi": avg_roi,
    }


def compute_platform_metrics(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return pd.DataFrame()

    grp = df.groupby("Channel_Used").agg(
        Total_Spend=("Spend", "sum"),
        Total_Clicks=("Clicks", "sum"),
        Total_Impressions=("Impressions", "sum"),
        Total_Conversions=("Conversions", "sum"),
        Avg_ROI=("ROI", "mean"),
    ).reset_index()

    grp["CTR"] = (grp["Total_Clicks"] / grp["Total_Impressions"] * 100).round(2)
    grp["CPC"] = (grp["Total_Spend"] / grp["Total_Clicks"]).round(2)
    return grp


# ── Formatting helpers ────────────────────────────────────────────────────────

def fmt_currency(v: float) -> str:
    return f"${v:,.2f}"


def fmt_pct(v: float) -> str:
    return f"{v:.1f}%"


def fmt_num(v: float) -> str:
    return f"{v:,.0f}"


# ── Sidebar ───────────────────────────────────────────────────────────────────

def render_sidebar(df: pd.DataFrame):
    st.sidebar.title("Ad Campaign Analyzer")
    st.sidebar.markdown("*Performance Dashboard*")
    st.sidebar.markdown("---")

    # CSV upload
    uploaded = st.sidebar.file_uploader("Upload Custom CSV", type=["csv"])
    if uploaded:
        try:
            df = load_uploaded_data(uploaded)
            st.session_state["data"] = df
        except Exception as e:
            st.sidebar.error(f"Error loading CSV: {e}")

    st.sidebar.markdown("---")
    st.sidebar.header("Filters")

    # Date range
    min_date = df["Date"].min().date()
    max_date = df["Date"].max().date()

    date_from = st.sidebar.date_input("From", value=min_date, min_value=min_date, max_value=max_date)
    date_to = st.sidebar.date_input("To", value=max_date, min_value=min_date, max_value=max_date)

    # Multi-selects
    channels = sorted(df["Channel_Used"].dropna().unique().tolist())
    selected_channels = st.sidebar.multiselect("Platform (Channel)", channels, default=channels)

    goals = sorted(df["Campaign_Goal"].dropna().unique().tolist())
    selected_goals = st.sidebar.multiselect("Campaign Goal", goals, default=goals)

    segments = sorted(df["Customer_Segment"].dropna().unique().tolist())
    selected_segments = st.sidebar.multiselect("Customer Segment", segments, default=segments)

    # Reset button
    if st.sidebar.button("Reset Filters", use_container_width=True):
        selected_channels = channels
        selected_goals = goals
        selected_segments = segments
        date_from = min_date
        date_to = max_date
        st.rerun()

    return {
        "date_from": pd.Timestamp(date_from),
        "date_to": pd.Timestamp(date_to),
        "channels": selected_channels,
        "goals": selected_goals,
        "segments": selected_segments,
    }


def apply_filters(df: pd.DataFrame, filters: dict) -> pd.DataFrame:
    mask = (
        (df["Date"] >= filters["date_from"])
        & (df["Date"] <= filters["date_to"])
        & (df["Channel_Used"].isin(filters["channels"]))
        & (df["Campaign_Goal"].isin(filters["goals"]))
        & (df["Customer_Segment"].isin(filters["segments"]))
    )
    return df[mask].copy()


# ── Tab renderers ─────────────────────────────────────────────────────────────

def render_overview(df: pd.DataFrame):
    if df.empty:
        st.info("No data for selected filters — try adjusting your filters.")
        return

    m = compute_metrics(df)

    # KPI cards
    c1, c2, c3, c4, c5 = st.columns(5)
    c1.metric("Total Spend", fmt_currency(m["total_spend"]))
    c2.metric("Total Conversions", fmt_num(m["total_conversions"]))
    c3.metric("Avg CTR", fmt_pct(m["ctr"]))
    c4.metric("Avg CPC", fmt_currency(m["cpc"]))
    c5.metric("Avg ROI", f"{m['avg_roi']:.2f}%")

    st.markdown("---")

    # Spend vs Conversions over time
    daily = (
        df.groupby("Date")
        .agg(Spend=("Spend", "sum"), Conversions=("Conversions", "sum"))
        .reset_index()
        .sort_values("Date")
    )

    fig = make_subplots(specs=[[{"secondary_y": True}]])
    fig.add_trace(
        go.Scatter(
            x=daily["Date"], y=daily["Spend"],
            name="Spend", line=dict(color="#0079F2", width=2),
            fill="tozeroy", fillcolor="rgba(0,121,242,0.12)",
        ),
        secondary_y=False,
    )
    fig.add_trace(
        go.Scatter(
            x=daily["Date"], y=daily["Conversions"],
            name="Conversions", line=dict(color="#795EFF", width=2),
        ),
        secondary_y=True,
    )
    fig.update_layout(
        title="Spend vs Conversions Over Time",
        height=380,
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
        margin=dict(l=0, r=0, t=40, b=0),
        plot_bgcolor="rgba(0,0,0,0)",
        paper_bgcolor="rgba(0,0,0,0)",
        xaxis=dict(showgrid=True, gridcolor="#e5e5e5"),
        yaxis=dict(showgrid=True, gridcolor="#e5e5e5", tickprefix="$"),
        yaxis2=dict(showgrid=False),
    )
    st.plotly_chart(fig, use_container_width=True)


def render_platform_performance(df: pd.DataFrame):
    if df.empty:
        st.info("No data for selected filters — try adjusting your filters.")
        return

    platform_df = compute_platform_metrics(df)

    # Grouped bar chart
    fig = go.Figure()
    colors = {"Total_Spend": "#0079F2", "Total_Conversions": "#795EFF", "Avg_ROI": "#009118"}

    fig.add_trace(go.Bar(
        name="Total Spend ($)",
        x=platform_df["Channel_Used"],
        y=platform_df["Total_Spend"],
        marker_color=colors["Total_Spend"],
        opacity=0.85,
        yaxis="y1",
    ))
    fig.add_trace(go.Bar(
        name="Total Conversions",
        x=platform_df["Channel_Used"],
        y=platform_df["Total_Conversions"],
        marker_color=colors["Total_Conversions"],
        opacity=0.85,
        yaxis="y1",
    ))
    fig.add_trace(go.Bar(
        name="Avg ROI",
        x=platform_df["Channel_Used"],
        y=platform_df["Avg_ROI"],
        marker_color=colors["Avg_ROI"],
        opacity=0.85,
        yaxis="y2",
    ))

    fig.update_layout(
        title="Platform Comparison",
        barmode="group",
        height=380,
        yaxis=dict(title="Spend / Conversions", showgrid=True, gridcolor="#e5e5e5"),
        yaxis2=dict(title="Avg ROI", overlaying="y", side="right", showgrid=False),
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
        margin=dict(l=0, r=0, t=40, b=0),
        plot_bgcolor="rgba(0,0,0,0)",
        paper_bgcolor="rgba(0,0,0,0)",
    )
    st.plotly_chart(fig, use_container_width=True)

    # Summary table
    st.subheader("Platform Summary")
    display_df = platform_df.copy()
    display_df["Total_Spend"] = display_df["Total_Spend"].apply(fmt_currency)
    display_df["Total_Clicks"] = display_df["Total_Clicks"].apply(fmt_num)
    display_df["Total_Conversions"] = display_df["Total_Conversions"].apply(fmt_num)
    display_df["CTR"] = display_df["CTR"].apply(fmt_pct)
    display_df["CPC"] = display_df["CPC"].apply(fmt_currency)
    display_df["Avg_ROI"] = display_df["Avg_ROI"].round(2)
    display_df.columns = ["Channel", "Total Spend", "Total Clicks", "Total Impressions", "Total Conversions", "Avg ROI", "CTR", "CPC"]
    st.dataframe(display_df[["Channel", "Total Spend", "Total Clicks", "Total Conversions", "CTR", "CPC", "Avg ROI"]], use_container_width=True, hide_index=True)


def render_campaign_deep_dive(df: pd.DataFrame):
    if df.empty:
        st.info("No data for selected filters — try adjusting your filters.")
        return

    col_left, col_right = st.columns([3, 2])

    with col_left:
        st.subheader("Campaign Table")
        search = st.text_input("Search by Campaign ID or Company", placeholder="e.g. C001 or AlphaMedia")

        table_df = df[["Campaign_ID", "Company", "Channel_Used", "Campaign_Goal",
                        "Spend", "Clicks", "Impressions", "Conversions", "Conversion_Rate", "ROI"]].copy()
        table_df["CTR"] = (table_df["Clicks"] / table_df["Impressions"] * 100).round(2)
        table_df["Conversion_Rate"] = (table_df["Conversion_Rate"] * 100).round(2)

        if search:
            mask = (
                table_df["Campaign_ID"].astype(str).str.contains(search, case=False, na=False) |
                table_df["Company"].astype(str).str.contains(search, case=False, na=False)
            )
            table_df = table_df[mask]

        # Format for display
        display = table_df.copy()
        display["Spend"] = display["Spend"].apply(fmt_currency)
        display["Clicks"] = display["Clicks"].apply(fmt_num)
        display["Impressions"] = display["Impressions"].apply(fmt_num)
        display["CTR"] = display["CTR"].apply(fmt_pct)
        display["Conversion_Rate"] = display["Conversion_Rate"].apply(fmt_pct)
        display = display.rename(columns={"Channel_Used": "Channel", "Campaign_Goal": "Goal", "Conversion_Rate": "CVR%"})

        st.dataframe(
            display[["Campaign_ID", "Company", "Channel", "Goal", "Spend", "Clicks", "Impressions", "Conversions", "CTR", "CVR%", "ROI"]],
            use_container_width=True,
            hide_index=True,
            height=400,
        )

    with col_right:
        st.subheader("Impressions → Clicks → Conversions")
        total_imp = int(df["Impressions"].sum())
        total_clk = int(df["Clicks"].sum())
        total_conv = int(df["Conversions"].sum())

        click_rate = (total_clk / total_imp * 100) if total_imp > 0 else 0
        conv_rate = (total_conv / total_clk * 100) if total_clk > 0 else 0

        # Use a horizontal bar chart so all three stages are always visible
        # regardless of scale differences between Impressions / Clicks / Conversions.
        stages = ["Impressions", "Clicks", "Conversions"]
        values = [total_imp, total_clk, total_conv]
        colors = ["#0079F2", "#795EFF", "#009118"]
        drop_labels = [
            "100%",
            f"{click_rate:.1f}% of Impressions",
            f"{conv_rate:.1f}% of Clicks",
        ]

        fig = go.Figure()
        for i, (stage, val, color, drop) in enumerate(
            zip(stages, values, colors, drop_labels)
        ):
            fig.add_trace(
                go.Bar(
                    name=stage,
                    y=[stage],
                    x=[val],
                    orientation="h",
                    marker_color=color,
                    marker_opacity=0.85,
                    text=f"  {val:,}  ({drop})",
                    textposition="outside",
                    textfont=dict(size=12),
                    showlegend=False,
                )
            )

        fig.update_layout(
            height=260,
            barmode="overlay",
            margin=dict(l=0, r=120, t=10, b=10),
            plot_bgcolor="rgba(0,0,0,0)",
            paper_bgcolor="rgba(0,0,0,0)",
            xaxis=dict(
                showgrid=True,
                gridcolor="#e5e5e5",
                tickformat=",",
            ),
            yaxis=dict(
                showgrid=False,
                autorange="reversed",
            ),
        )
        st.plotly_chart(fig, use_container_width=True)


def render_trends(df: pd.DataFrame):
    if df.empty:
        st.info("No data for selected filters — try adjusting your filters.")
        return

    metric_options = {
        "Spend": ("Spend", "$"),
        "Clicks": ("Clicks", ""),
        "Conversions": ("Conversions", ""),
        "ROI": ("ROI", ""),
    }

    selected = st.selectbox("Select Metric", list(metric_options.keys()))
    col, prefix = metric_options[selected]

    daily = (
        df.groupby("Date")
        .agg(**{col: (col, "sum" if col != "ROI" else "mean")})
        .reset_index()
        .sort_values("Date")
    )

    color_map = {"Spend": "#0079F2", "Clicks": "#795EFF", "Conversions": "#009118", "ROI": "#ec4899"}

    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=daily["Date"],
        y=daily[col],
        mode="lines",
        name=selected,
        line=dict(color=color_map[selected], width=2),
        fill="tozeroy",
        fillcolor=color_map[selected].replace("#", "rgba(") + ",0.1)".replace(",0.1)", "").replace("rgba(", "rgba(") + ",0.1)",
    ))
    fig.update_layout(
        title=f"{selected} Over Time",
        height=400,
        xaxis=dict(showgrid=True, gridcolor="#e5e5e5"),
        yaxis=dict(
            showgrid=True,
            gridcolor="#e5e5e5",
            tickprefix=prefix,
        ),
        margin=dict(l=0, r=0, t=40, b=0),
        plot_bgcolor="rgba(0,0,0,0)",
        paper_bgcolor="rgba(0,0,0,0)",
        showlegend=False,
    )
    st.plotly_chart(fig, use_container_width=True)


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    # Load data
    if "data" not in st.session_state:
        try:
            st.session_state["data"] = load_default_data()
        except Exception as e:
            st.error(f"Could not load default CSV: {e}")
            st.stop()

    df_raw: pd.DataFrame = st.session_state["data"]

    # Sidebar filters
    filters = render_sidebar(df_raw)

    # Apply filters
    df = apply_filters(df_raw, filters)

    # Header
    st.title("Ad Campaign Performance")
    st.caption("Analyze your marketing spend, conversions, and ROI across all channels.")
    st.markdown(f"**Showing {len(df):,} campaigns** after filters")
    st.markdown("---")

    # Tabs
    tab1, tab2, tab3, tab4 = st.tabs([
        "Overview",
        "Platform Performance",
        "Campaign Deep-Dive",
        "Trends Over Time",
    ])

    with tab1:
        render_overview(df)

    with tab2:
        render_platform_performance(df)

    with tab3:
        render_campaign_deep_dive(df)

    with tab4:
        render_trends(df)


if __name__ == "__main__":
    main()
