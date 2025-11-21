from django.contrib.auth import get_user_model
from django.db import models

User = get_user_model()


class Dataset(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="datasets")
    name = models.CharField(max_length=255)
    original_file = models.FileField(upload_to="datasets/")
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} (id={self.id})"


class AnalysisResult(models.Model):
    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("RUNNING", "Running"),
        ("COMPLETED", "Completed"),
        ("FAILED", "Failed"),
    ]

    dataset = models.OneToOneField(
        Dataset, on_delete=models.CASCADE, related_name="analysis"
    )
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="PENDING")
    summary_json = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    error_message = models.TextField(null=True, blank=True)

    def __str__(self):
        return f"Analysis for Dataset {self.dataset_id} [{self.status}]"


class DatasetSemanticConfig(models.Model):
    """
    Stores user-defined semantic configuration for a dataset:
    - which column is the target/outcome
    - which columns are key numeric metrics
    - which column is the main time axis
    - the logical type for each column
    """

    dataset = models.OneToOneField(
        Dataset, on_delete=models.CASCADE, related_name="semantic_config"
    )

    # Column names (or None)
    target_column = models.CharField(max_length=255, null=True, blank=True)
    time_column = models.CharField(max_length=255, null=True, blank=True)

    # List of column names
    metric_columns = models.JSONField(default=list, blank=True)

    # Mapping: column name -> logical type (e.g. "numeric", "categorical", "boolean", "datetime", "unknown")
    column_types = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"SemanticConfig(dataset_id={self.dataset_id})"
