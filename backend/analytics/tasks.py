import logging
import traceback

import pandas as pd
from celery import shared_task

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

        result = {
            "row_count": len(df),
            "column_count": len(df.columns),
            "columns": {},
            "missing_values": df.isnull().sum().to_dict(),
        }

        for col in df.columns:
            try:
                stats = df[col].describe(include="all").to_dict()
            except Exception:
                stats = {}
            result["columns"][col] = stats

        analysis.summary_json = result
        analysis.status = "COMPLETED"
        analysis.save()

    except Exception:
        analysis.status = "FAILED"
        analysis.error_message = traceback.format_exc()
        analysis.save()
        logger.exception("Analysis task failed for dataset %s", dataset_id)
