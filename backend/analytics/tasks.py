import logging
import traceback

import pandas as pd
from celery import shared_task
from pandas.api.types import (
    is_bool_dtype,
    is_datetime64_any_dtype,
    is_numeric_dtype,
)

from .models import AnalysisResult

logger = logging.getLogger(__name__)


def infer_column_type(series: pd.Series, name: str) -> str:
    """
    Infer a semantic column type with extra logic for:
    - boolean-like numeric (0/1)
    - boolean-like strings (true/false, yes/no, etc.)
    - datetime in object columns via to_datetime sampling
    """
    try:
        dtype_str = str(series.dtype)
        logger.debug("Inferring type for column '%s' with dtype '%s'", name, dtype_str)

        # 1) Explicit boolean dtype
        if is_bool_dtype(series):
            logger.debug("Column '%s' detected as boolean (native bool dtype)", name)
            return "boolean"

        # 2) Numeric with possible 0/1 boolean-like values
        if is_numeric_dtype(series):
            non_null = series.dropna()
            unique_non_null = pd.unique(non_null)
            # If only 0/1 (or subset), treat as boolean
            if len(unique_non_null) <= 2:
                try:
                    normalized = {int(v) for v in unique_non_null if pd.notna(v)}
                except Exception:
                    normalized = set()
                if normalized and normalized.issubset({0, 1}):
                    logger.debug(
                        "Column '%s' numeric but binary {0,1} -> treating as boolean",
                        name,
                    )
                    return "boolean"
            logger.debug("Column '%s' detected as numeric", name)
            return "numeric"

        # 3) Native datetime dtype
        if is_datetime64_any_dtype(series):
            logger.debug("Column '%s' detected as datetime (native datetime64)", name)
            return "datetime"

        # 4) Object-like: try boolean-like strings first
        if series.dtype == "object":
            sample = series.dropna()
            if not sample.empty:
                # Sample at most 50 distinct values
                sample_unique = pd.Series(sample.unique())
                if len(sample_unique) > 50:
                    sample_unique = sample_unique.sample(50, random_state=0)

                tokens = {str(v).strip().lower() for v in sample_unique}
                bool_pairs = [
                    {"true", "false"},
                    {"yes", "no"},
                    {"y", "n"},
                    {"t", "f"},
                    {"0", "1"},
                ]
                for pair in bool_pairs:
                    if tokens.issubset(pair):
                        logger.debug(
                            "Column '%s' object but boolean-like strings %s -> boolean",
                            name,
                            pair,
                        )
                        return "boolean"

            # 5) Try datetime coercion on object columns
            if not sample.empty:
                try:
                    parsed = pd.to_datetime(
                        sample, errors="coerce", utc=False, infer_datetime_format=True
                    )
                    non_null_ratio = float(parsed.notna().mean())
                    logger.debug(
                        "Column '%s' datetime coercion non-null ratio = %.3f",
                        name,
                        non_null_ratio,
                    )
                    if non_null_ratio >= 0.8:
                        logger.debug(
                            "Column '%s' treated as datetime (object -> datetime)",
                            name,
                        )
                        return "datetime"
                except Exception:
                    logger.debug(
                        "Column '%s' datetime coercion failed, leaving as categorical",
                        name,
                    )

            logger.debug("Column '%s' treated as categorical (object)", name)
            return "categorical"

        # 6) Fallback: other dtypes
        logger.debug("Column '%s' treated as 'other' (dtype=%s)", name, dtype_str)
        return "other"

    except Exception:
        logger.exception("Failed to infer type for column '%s'", name)
        return "other"


@shared_task
def test_task(x, y):
    logger.info("Running test_task with %s and %s", x, y)
    return x + y


@shared_task
def run_analysis_task(dataset_id: int):
    analysis = AnalysisResult.objects.get(dataset_id=dataset_id)
    analysis.status = "RUNNING"
    analysis.save()

    try:
        dataset = analysis.dataset
        file_path = dataset.original_file.path

        logger.info(
            "Starting analysis for dataset %s (id=%s, file='%s')",
            dataset.name,
            dataset_id,
            file_path,
        )

        df = pd.read_csv(file_path)
        logger.debug(
            "Loaded CSV for dataset %s into DataFrame with shape %s",
            dataset_id,
            df.shape,
        )
        logger.debug("DataFrame dtypes:\n%s", df.dtypes)

        result: dict = {
            "row_count": int(len(df)),
            "column_count": int(len(df.columns)),
            "columns": {},
            "missing_values": df.isnull().sum().to_dict(),
        }

        for col in df.columns:
            series = df[col]
            col_summary: dict = {}

            # Column type detection with enhanced logic
            col_type = infer_column_type(series, col)
            col_summary["type"] = col_type

            # Descriptive stats
            try:
                desc = series.describe(include="all")
                if hasattr(desc, "to_dict"):
                    col_summary["describe"] = desc.to_dict()
                else:
                    col_summary["describe"] = {}
            except Exception:
                logger.exception(
                    "Failed to compute describe() for column '%s' in dataset %s",
                    col,
                    dataset_id,
                )
                col_summary["describe"] = {}

            # Numeric histogram
            if col_type == "numeric":
                try:
                    numeric_series = series.dropna()
                    if not numeric_series.empty:
                        vc = numeric_series.value_counts(bins=10).sort_index()
                        bins_list = []
                        for interval, count in vc.items():
                            try:
                                label = (
                                    f"{float(interval.left):.2f}–"
                                    f"{float(interval.right):.2f}"
                                )
                            except Exception:
                                label = str(interval)
                            bins_list.append(
                                {
                                    "bin": label,
                                    "count": int(count),
                                }
                            )
                        col_summary["histogram"] = bins_list
                except Exception:
                    logger.exception(
                        "Failed to build histogram for numeric column '%s' "
                        "in dataset %s",
                        col,
                        dataset_id,
                    )

            # Categorical / boolean value counts
            if col_type in ("categorical", "boolean"):
                try:
                    vc = series.astype(str).value_counts().head(10)
                    col_summary["value_counts"] = [
                        {"value": idx, "count": int(count)} for idx, count in vc.items()
                    ]
                except Exception:
                    logger.exception(
                        "Failed to build value_counts for column '%s' in dataset %s",
                        col,
                        dataset_id,
                    )

            result["columns"][col] = col_summary
            logger.debug(
                "Column '%s' summary stored with type '%s' (keys=%s)",
                col,
                col_type,
                list(col_summary.keys()),
            )

        # At this point, all columns have been processed
        # Log a small, safe summary rather than full result.
        type_counts: dict[str, int] = {}
        for col_name, col_summary in result["columns"].items():
            t = col_summary.get("type", "unknown")
            type_counts[t] = type_counts.get(t, 0) + 1

        logger.info(
            "Completed column analysis for dataset %s: %s",
            dataset_id,
            type_counts,
        )
        logger.debug(
            "Analysis result snapshot for dataset %s: row_count=%s, column_count=%s",
            dataset_id,
            result.get("row_count"),
            result.get("column_count"),
        )

        analysis.summary_json = result
        analysis.status = "COMPLETED"
        analysis.error_message = None
        analysis.save()

        logger.info(
            "Analysis task COMPLETED for dataset %s (id=%s)",
            dataset.name,
            dataset_id,
        )

    except Exception:
        analysis.status = "FAILED"
        analysis.error_message = traceback.format_exc()
        analysis.save()
        logger.exception("Analysis task failed for dataset %s", dataset_id)
