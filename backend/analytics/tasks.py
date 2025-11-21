import logging
import traceback

import pandas as pd
from celery import shared_task
from pandas.api.types import (
    is_bool_dtype,
    is_datetime64_any_dtype,
    is_numeric_dtype,
)

from .models import AnalysisResult, Dataset

logger = logging.getLogger(__name__)


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

        df = pd.read_csv(file_path)

        result: dict = {
            "row_count": int(len(df)),
            "column_count": int(len(df.columns)),
            "columns": {},
            "missing_values": df.isnull().sum().to_dict(),
        }

        for col in df.columns:
            series = df[col]
            col_summary: dict = {}

            # Column type detection
            try:
                if is_numeric_dtype(series):
                    col_type = "numeric"
                elif is_bool_dtype(series):
                    col_type = "boolean"
                elif is_datetime64_any_dtype(series):
                    col_type = "datetime"
                else:
                    col_type = "categorical" if series.dtype == "object" else "other"
            except Exception:
                col_type = "other"

            col_summary["type"] = col_type

            # Descriptive stats
            try:
                desc = series.describe(include="all")
                if hasattr(desc, "to_dict"):
                    col_summary["describe"] = desc.to_dict()
                else:
                    col_summary["describe"] = {}
            except Exception:
                col_summary["describe"] = {}

            # Numeric histogram
            if col_type == "numeric":
                try:
                    numeric_series = series.dropna()
                    if not numeric_series.empty:
                        vc = numeric_series.value_counts(bins=10).sort_index()
                        bins_list = []
                        for interval, count in vc.items():
                            # interval is a pandas Interval
                            try:
                                label = f"{float(interval.left):.2f}–{float(interval.right):.2f}"
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
                    # If histogram fails, we just skip it
                    pass

            # Categorical / boolean value counts
            if col_type in ("categorical", "boolean"):
                try:
                    vc = series.astype(str).value_counts().head(10)
                    col_summary["value_counts"] = [
                        {"value": idx, "count": int(count)} for idx, count in vc.items()
                    ]
                except Exception:
                    pass

            result["columns"][col] = col_summary

            analysis.summary_json = result
            analysis.status = "COMPLETED"
            analysis.save()

    except Exception:
        analysis.status = "FAILED"
        analysis.error_message = traceback.format_exc()
        analysis.save()
        logger.exception(
            "Analysis task failed for dataset %s",
            dataset_id,
        )
