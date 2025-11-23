from rest_framework import serializers

from .models import AnalysisResult, Dataset


class AnalysisResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnalysisResult
        fields = ["status", "summary_json", "created_at", "error_message"]


class DatasetSerializer(serializers.ModelSerializer):
    analysis = AnalysisResultSerializer(read_only=True)

    class Meta:
        model = Dataset
        fields = ["id", "name", "original_file", "uploaded_at", "is_active", "analysis"]
        read_only_fields = ["id", "uploaded_at", "is_active", "analysis"]
