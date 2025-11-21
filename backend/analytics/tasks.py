import logging
import traceback
from typing import Any, Dict, List, Optional

import pandas as pd
from celery import shared_task
from pandas.api.types import (
    is_bool_dtype,
    is_datetime64_any_dtype,
    is_numeric_dtype,
)

from .models import AnalysisResult, Dataset, DatasetSemanticConfig

logger = logging.getLogger(__name__)


@shared_task
def test_task(x: int, y: int) -> int:
    logger.info("Running test_task with %s and %s", x, y)
    return x + y


def _infer_col_type(series: pd.Series) -> str:
    """
    Default backend inference used when no semantic override exists.
    """
    try:
        if is_bool_dtype(series):
            return "boolean"
        if is_datetime64_any_dtype(series):
            return "datetime"
        if is_numeric_dtype(series):
            return "numeric"

        # For object dtype, try numeric coercion
        if series.dtype == "object":
            numeric = pd.to_numeric(series, errors="coerce")
            non_na_ratio = numeric.notna().mean()
            if non_na_ratio > 0.9:
                return "numeric"
            if series.nunique(dropna=True) <= 50:
                return "categorical"
            return "other"

        # fallback
        if series.nunique(dropna=True) <= 50:
            return "categorical"
        return "other"
    except Exception:
        return "other"


def _build_numeric_histogram(
    series: pd.Series, max_bins: int = 20
) -> List[Dict[str, Any]]:
    bins: List[Dict[str, Any]] = []
    try:
        numeric = pd.to_numeric(series, errors="coerce").dropna()
        if numeric.empty:
            return bins

        import math

        bin_count = min(max_bins, max(1, int(math.sqrt(len(numeric)))))

        vc = numeric.value_counts(bins=bin_count).sort_index()
        for interval, count in vc.items():
            try:
                label = f"{float(interval.left):.2f}–{float(interval.right):.2f}"
            except Exception:
                label = str(interval)
            bins.append(
                {
                    "bin": label,
                    "count": int(count),
                }
            )
    except Exception:
        logger.exception("Failed to build numeric histogram")
    return bins


def _build_value_counts(series: pd.Series, limit: int = 20) -> List[Dict[str, Any]]:
    values: List[Dict[str, Any]] = []
    try:
        vc = series.value_counts(dropna=False).head(limit)
        for value, count in vc.items():
            label = "<NA>" if pd.isna(value) else str(value)
            values.append(
                {
                    "value": label,
                    "count": int(count),
                }
            )
    except Exception:
        logger.exception("Failed to build value_counts")
    return values


def _get_forced_type_for_column(
    column_name: str, semantic_config: Optional[DatasetSemanticConfig]
) -> Optional[str]:
    """
    Returns the forced logical type if user supplied one.
    """
    if semantic_config is None:
        return None

    types_map = semantic_config.column_types or {}
    forced = types_map.get(column_name)

    allowed = {
        "numeric",
        "categorical",
        "boolean",
        "datetime",
        "unknown",
        "id",
        "ignore",
    }

    if isinstance(forced, str) and forced in allowed:
        return forced

    return None


@shared_task
def run_analysis_task(dataset_id: int) -> None:
    try:
        analysis = AnalysisResult.objects.get(dataset_id=dataset_id)
    except AnalysisResult.DoesNotExist:
        logger.error("AnalysisResult missing for dataset %s", dataset_id)
        return

    analysis.status = "RUNNING"
    analysis.error_message = ""
    analysis.save(update_fields=["status", "error_message"])

    try:
        dataset = analysis.dataset
        file_path = dataset.original_file.path
        df = pd.read_csv(file_path)

        semantic_config: Optional[DatasetSemanticConfig] = (
            DatasetSemanticConfig.objects.filter(dataset=dataset).first()
        )

        result: Dict[str, Any] = {
            "row_count": int(len(df)),
            "column_count": int(len(df.columns)),
            "columns": {},
            "missing_values": df.isnull().sum().to_dict(),
        }

        for col_name in df.columns:
            series = df[col_name]
            col_summary: Dict[str, Any] = {}

            forced_type = _get_forced_type_for_column(col_name, semantic_config)

            if forced_type == "ignore":
                col_summary["type"] = "ignored"
                result["columns"][col_name] = col_summary
                continue

            if forced_type in {
                "numeric",
                "categorical",
                "boolean",
                "datetime",
                "unknown",
                "id",
            }:
                col_type = forced_type
            else:
                col_type = _infer_col_type(series)

            col_summary["type"] = col_type

            # Descriptive
            try:
                desc = series.describe(include="all")
                col_summary["describe"] = desc.to_dict()
            except Exception:
                col_summary["describe"] = {}

            if col_type == "numeric":
                hist = _build_numeric_histogram(series)
                if hist:
                    col_summary["histogram"] = hist

            if col_type in {"categorical", "boolean", "datetime"}:
                vc = _build_value_counts(series.astype(str))
                if vc:
                    col_summary["value_counts"] = vc

            result["columns"][col_name] = col_summary

        # Embed semantic config
        if semantic_config is not None:
            result["semantic_config"] = {
                "target_column": semantic_config.target_column,
                "time_column": semantic_config.time_column,
                "metric_columns": semantic_config.metric_columns,
                "column_types": semantic_config.column_types,
            }

        analysis.summary_json = result
        analysis.status = "COMPLETED"
        analysis.save(update_fields=["summary_json", "status"])

    except Exception:
        analysis.status = "FAILED"
        analysis.error_message = traceback.format_exc()
        analysis.save(update_fields=["status", "error_message"])
        logger.exception("Analysis task failed for dataset %s", dataset_id)
