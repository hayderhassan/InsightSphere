from django.contrib.auth import get_user_model
from django.db import models

User = get_user_model()


class Dataset(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="datasets")
    name = models.CharField(max_length=255)
    original_file = models.FileField(upload_to="datasets/")
    uploaded_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=False)

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
