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

from .models import AnalysisResult, Dataset, DatasetSemanticConfig
from .serializers import DatasetSemanticConfigSerializer, DatasetSerializer
from .tasks import run_analysis_task, test_task


def _load_dataset_dataframe(dataset: Dataset) -> pd.DataFrame:
    """
    Load the underlying CSV into a pandas DataFrame.
    """
    return pd.read_csv(dataset.original_file.path)


@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    return Response({"status": "ok"})


@api_view(["POST"])
@permission_classes([AllowAny])
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

    run_analysis_task.delay(dataset.id)

    serializer = DatasetSerializer(dataset)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(["GET", "DELETE"])
@permission_classes([IsAuthenticated])
def get_dataset(request, dataset_id: int):
    try:
        dataset = Dataset.objects.get(id=dataset_id, owner=request.user)
    except Dataset.DoesNotExist:
        return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        serializer = DatasetSerializer(dataset)
        return Response(serializer.data)

    if dataset.original_file:
        dataset.original_file.delete(save=False)

    dataset.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def dataset_semantic_config(request, dataset_id: int):
    try:
        dataset = Dataset.objects.get(id=dataset_id, owner=request.user)
    except Dataset.DoesNotExist:
        return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        config = DatasetSemanticConfig.objects.filter(dataset=dataset).first()
        if not config:
            return Response(
                {
                    "target_column": None,
                    "time_column": None,
                    "metric_columns": [],
                    "column_types": {},
                }
            )
        serializer = DatasetSemanticConfigSerializer(config)
        return Response(serializer.data)

    existing = DatasetSemanticConfig.objects.filter(dataset=dataset).first()

    if existing:
        serializer = DatasetSemanticConfigSerializer(
            existing, data=request.data, partial=True
        )
    else:
        serializer = DatasetSemanticConfigSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    config = serializer.save(dataset=dataset)

    run_analysis_task.delay(dataset.id)

    return Response(DatasetSemanticConfigSerializer(config).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dataset_preview(request, dataset_id):
    """
    Return a lightweight preview of the dataset rows.
    """
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

    try:
        limit_param = request.query_params.get("limit", "100")
        offset_param = request.query_params.get("offset", "0")
        limit = max(1, min(int(limit_param), 500))
        offset = max(0, int(offset_param))
    except ValueError:
        limit = 100
        offset = 0

    df = _load_dataset_dataframe(dataset)
    total_rows = int(len(df))

    if total_rows == 0:
        return Response(
            {
                "columns": [],
                "rows": [],
                "total_rows": 0,
            }
        )

    slice_df = df.iloc[offset : offset + limit]
    columns = list(slice_df.columns)
    rows = slice_df.where(pd.notnull(slice_df), None).to_dict(orient="records")

    return Response(
        {
            "columns": columns,
            "rows": rows,
            "total_rows": total_rows,
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dataset_quality_rows(request, dataset_id):
    """
    Return example rows that contain missing values in any column.
    """
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

    try:
        limit_param = request.query_params.get("limit", "50")
        limit = max(1, min(int(limit_param), 200))
    except ValueError:
        limit = 50

    df = _load_dataset_dataframe(dataset)
    if df.empty:
        return Response(
            {
                "columns": [],
                "rows": [],
                "total_rows_with_missing": 0,
            }
        )

    mask_missing = df.isnull().any(axis=1)
    missing_df = df[mask_missing]
    total_missing_rows = int(len(missing_df))

    if total_missing_rows == 0:
        return Response(
            {
                "columns": list(df.columns),
                "rows": [],
                "total_rows_with_missing": 0,
            }
        )

    slice_df = missing_df.iloc[:limit]
    columns = list(slice_df.columns)
    rows = slice_df.where(pd.notnull(slice_df), None).to_dict(orient="records")

    return Response(
        {
            "columns": columns,
            "rows": rows,
            "total_rows_with_missing": total_missing_rows,
        }
    )
