import pandas as pd
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
    datasets = Dataset.objects.filter(owner=request.user).order_by("-uploaded_at")
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

    # Kick off async analysis
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
def set_semantic_config(request, dataset_id):
    """
    Persist semantic configuration and updated column types
    into the analysis.summary_json for this dataset.
    """
    try:
        dataset = Dataset.objects.get(id=dataset_id, owner=request.user)
    except Dataset.DoesNotExist:
        return Response(
            {"error": "Not found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    try:
        analysis = dataset.analysis
    except AnalysisResult.DoesNotExist:
        return Response(
            {"error": "No analysis result for this dataset"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    summary = analysis.summary_json or {}
    columns = summary.get("columns") or {}

    payload = request.data or {}

    # Extract semantic config fields from payload
    semantic_config = {
        "target_column": payload.get("target_column"),
        "metric_columns": payload.get("metric_columns") or [],
        "time_column": payload.get("time_column"),
        "dataset_shape": payload.get("dataset_shape"),
        "analysis_goal": payload.get("analysis_goal"),
        "positive_class": payload.get("positive_class"),
        "entity_key": payload.get("entity_key"),
        "time_grain": payload.get("time_grain"),
        "time_grain_custom": payload.get("time_grain_custom"),
        "anomaly_direction": payload.get("anomaly_direction"),
        "notes": payload.get("notes"),
    }

    summary["semantic_config"] = semantic_config

    # Apply updated logical types to the per-column summaries
    column_types = payload.get("column_types") or {}
    if isinstance(column_types, dict):
        for col_name, logical_type in column_types.items():
            if col_name in columns and isinstance(columns[col_name], dict):
                # Overwrite the stored type to reflect the user's choice
                columns[col_name]["type"] = logical_type

    summary["columns"] = columns

    analysis.summary_json = summary
    analysis.save()

    return Response(
        {
            "semantic_config": semantic_config,
            "summary_json": summary,
        },
        status=status.HTTP_200_OK,
    )
