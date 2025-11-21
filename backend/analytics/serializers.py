from rest_framework import serializers

from .models import AnalysisResult, Dataset, DatasetSemanticConfig


class AnalysisResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnalysisResult
        fields = ["status", "summary_json", "created_at", "error_message"]


class DatasetSemanticConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = DatasetSemanticConfig
        fields = [
            "target_column",
            "time_column",
            "metric_columns",
            "column_types",
        ]

    def validate_metric_columns(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError(
                "metric_columns must be a list of column names."
            )
        if not all(isinstance(item, str) for item in value):
            raise serializers.ValidationError(
                "All metric column names must be strings."
            )
        return value

    def validate_column_types(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError(
                "column_types must be an object mapping column name to type."
            )
        # Optional: enforce allowed logical types here.
        # allowed = {"numeric", "categorical", "boolean", "datetime", "unknown", "id", "ignore"}
        # for col, logical_type in value.items():
        #     if logical_type not in allowed:
        #         raise serializers.ValidationError(
        #             f"Invalid logical type '{logical_type}' for column '{col}'."
        #         )
        return value


class DatasetSerializer(serializers.ModelSerializer):
    analysis = AnalysisResultSerializer(read_only=True)

    class Meta:
        model = Dataset
        fields = ["id", "name", "original_file", "uploaded_at", "analysis"]
        read_only_fields = ["id", "uploaded_at", "analysis"]
