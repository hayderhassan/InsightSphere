from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

import pandas as pd
from pandas.api.types import is_numeric_dtype

logger = logging.getLogger(__name__)


def _safe_get_column(df: pd.DataFrame, name: Optional[str]) -> Optional[pd.Series]:
    if not name:
        return None
    if name not in df.columns:
        return None
    return df[name]


def _compute_target_distribution(
    df: pd.DataFrame, target_col: str
) -> List[Dict[str, Any]]:
    series = _safe_get_column(df, target_col)
    if series is None:
        return []

    series = series.dropna()
    if series.empty:
        return []

    vc = series.value_counts(normalize=False)
    total = float(series.shape[0]) if series.shape[0] > 0 else 1.0

    rows: List[Dict[str, Any]] = []
    for value, count in vc.items():
        try:
            pct = float(count) / total * 100.0
        except Exception:
            pct = 0.0
        rows.append(
            {
                "target": str(value),
                "count": int(count),
                "pct": pct,
            }
        )

    return rows


def _compute_metrics_by_target(
    df: pd.DataFrame,
    target_col: Optional[str],
    metric_cols: List[str],
) -> Dict[str, List[Dict[str, Any]]]:
    result: Dict[str, List[Dict[str, Any]]] = {}
    if not target_col:
        return result
    if target_col not in df.columns:
        return result

    for metric in metric_cols:
        if metric not in df.columns:
            continue
        series = df[metric]
        if not is_numeric_dtype(series):
            continue

        try:
            grouped = (
                df[[target_col, metric]]
                .dropna(subset=[target_col])
                .groupby(target_col)[metric]
                .agg(["mean", "median", "count"])
            )
        except Exception:
            logger.exception("Failed computing metrics_by_target for %s", metric)
            continue

        rows: List[Dict[str, Any]] = []
        for idx, row in grouped.iterrows():
            rows.append(
                {
                    "target": str(idx),
                    "mean": float(row.get("mean"))
                    if row.get("mean") is not None
                    else None,
                    "median": float(row.get("median"))
                    if row.get("median") is not None
                    else None,
                    "count": int(row.get("count"))
                    if row.get("count") is not None
                    else 0,
                }
            )
        result[metric] = rows

    return result


def _bucket_time_column(series: pd.Series) -> Optional[pd.Series]:
    if series.isna().all():
        return None

    try:
        dt = pd.to_datetime(series, errors="coerce", utc=True)
    except Exception:
        logger.exception("Failed to parse time column to datetime")
        return None

    dt = dt.dropna()
    if dt.empty:
        return None

    span = dt.max() - dt.min()
    span_days = span.days if hasattr(span, "days") else 0

    if span_days <= 31:
        freq = "D"
        fmt = "%Y-%m-%d"
    elif span_days <= 365:
        freq = "W"
        fmt = "%Y-%m-%d"
    else:
        freq = "M"
        fmt = "%Y-%m"

    bucket = pd.to_datetime(series, errors="coerce", utc=True)
    if freq == "D":
        return bucket.dt.strftime(fmt)
    if freq == "W":
        return bucket.dt.to_period("W").astype(str)
    return bucket.dt.to_period("M").astype(str)


def _compute_metrics_over_time(
    df: pd.DataFrame,
    time_col: Optional[str],
    metric_cols: List[str],
) -> Dict[str, List[Dict[str, Any]]]:
    result: Dict[str, List[Dict[str, Any]]] = {}
    if not time_col:
        return result
    if time_col not in df.columns:
        return result

    time_series = df[time_col]
    bucket_series = _bucket_time_column(time_series)
    if bucket_series is None:
        return result

    work = df.copy()
    work["_time_bucket"] = bucket_series
    work = work.dropna(subset=["_time_bucket"])

    for metric in metric_cols:
        if metric not in work.columns:
            continue
        series = work[metric]
        if not is_numeric_dtype(series):
            continue

        try:
            grouped = (
                work[["_time_bucket", metric]]
                .dropna(subset=[metric])
                .groupby("_time_bucket")[metric]
                .agg(["mean", "count"])
            )
        except Exception:
            logger.exception("Failed computing metrics_over_time for %s", metric)
            continue

        rows: List[Dict[str, Any]] = []
        for idx, row in grouped.iterrows():
            rows.append(
                {
                    "bucket": str(idx),
                    "mean": float(row.get("mean"))
                    if row.get("mean") is not None
                    else None,
                    "count": int(row.get("count"))
                    if row.get("count") is not None
                    else 0,
                }
            )
        result[metric] = rows

    return result


def compute_semantic_aggregates(
    df: pd.DataFrame,
    semantic_config: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Compute semantic aggregates used to drive smart charts.


    The shape is:


    semantic_aggregates = {
            "target_distribution": [...],
            "metrics_by_target": {metric_name: [...]},
            "metrics_over_time": {metric_name: [...]},
    }
    """
    config = semantic_config or {}
    target_col = config.get("target_column") or None
    metric_cols = list(config.get("metric_columns") or [])
    time_col = config.get("time_column") or None

    try:
        target_distribution = (
            _compute_target_distribution(df, target_col) if target_col else []
        )
        metrics_by_target = _compute_metrics_by_target(df, target_col, metric_cols)
        metrics_over_time = _compute_metrics_over_time(df, time_col, metric_cols)
    except Exception:
        logger.exception("Failed computing semantic aggregates")
        return {}

    return {
        "target_distribution": target_distribution,
        "metrics_by_target": metrics_by_target,
        "metrics_over_time": metrics_over_time,
    }
