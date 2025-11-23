import logging

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import (
    api_view,
    parser_classes,
    permission_classes,
)
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import AnalysisResult, Dataset
from .serializers import DatasetSerializer
from .tasks import run_analysis_task, test_task
from .utils import build_boolean_labels

logger = logging.getLogger(__name__)


@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    return Response({"status": "ok"})


@api_view(["POST"])
@permission_classes([AllowAny])  # dev-only
def run_test_task(request):
    result = test_task.delay(2, 3)
    return Response({"task_id": result.id})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):
    user = request.user
    return Response(
        {
            "id": user.id,
            "username": user.username,
            "email": user.email,
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_datasets(request):
    datasets = Dataset.objects.filter(owner=request.user).order_by(
        "-uploaded_at",
    )
    serializer = DatasetSerializer(datasets, many=True)
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_dataset(request):
    file = request.FILES.get("file")
    name = request.data.get("name") or (file.name if file else None)

    if not file:
        return Response(
            {"error": "No file uploaded"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    dataset = Dataset.objects.create(
        owner=request.user,
        name=name,
        original_file=file,
    )

    AnalysisResult.objects.create(
        dataset=dataset,
        status="PENDING",
    )

    run_analysis_task.delay(dataset.id)

    serializer = DatasetSerializer(dataset)
    return Response(
        serializer.data,
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET", "DELETE"])
@permission_classes([IsAuthenticated])
def get_dataset(request, dataset_id):
    try:
        dataset = Dataset.objects.get(
            id=dataset_id,
            owner=request.user,
        )
    except Dataset.DoesNotExist:
        return Response(
            {"error": "Not found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    if request.method == "GET":
        serializer = DatasetSerializer(dataset)
        return Response(serializer.data)

    # DELETE
    if dataset.original_file:
        dataset.original_file.delete(save=False)
    dataset.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def update_semantic_config(request, dataset_id):
    """
    Update semantic configuration for a dataset and enrich it
    with human-friendly labels for boolean targets.


    Expected JSON payload:
    {
            "target_column": string | null,
            "metric_columns": string[],
            "time_column": string | null,
            "column_types": { [columnName: string]: string }
    }
    """
    dataset = get_object_or_404(
        Dataset,
        id=dataset_id,
        owner=request.user,
    )

    analysis = getattr(dataset, "analysis", None)
    if analysis is None:
        return Response(
            {"error": "No analysis result for this dataset."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    summary = analysis.summary_json or {}
    columns = summary.get("columns") or {}

    data = request.data
    target_column = data.get("target_column")
    metric_columns = data.get("metric_columns") or []
    time_column = data.get("time_column")
    column_types = data.get("column_types") or {}

    if not isinstance(metric_columns, list):
        return Response(
            {"error": "metric_columns must be a list."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not isinstance(column_types, dict):
        return Response(
            {"error": "column_types must be an object."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    semantic_config = summary.get("semantic_config") or {}
    semantic_config.update(
        {
            "target_column": target_column,
            "metric_columns": metric_columns,
            "time_column": time_column,
            "column_types": column_types,
        },
    )

    target_display = None

    if target_column:
        col_summary = columns.get(target_column) or {}
        raw_type = col_summary.get("type")
        logical_type = column_types.get(target_column)

        is_boolean = logical_type == "boolean" or raw_type == "boolean"

        if is_boolean:
            labels = build_boolean_labels(target_column)
            target_display = {
                "kind": "boolean",
                "positive_label": labels["positive_label"],
                "negative_label": labels["negative_label"],
            }

    if target_display is not None:
        semantic_config["target_display"] = target_display

    summary["semantic_config"] = semantic_config
    analysis.summary_json = summary
    analysis.save(update_fields=["summary_json"])

    logger.info(
        "Updated semantic_config for dataset %s: %s",
        dataset_id,
        semantic_config,
    )

    serializer = DatasetSerializer(dataset)
    return Response(serializer.data)
