from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from . import views

# urlpatterns = [
#     path("health/", views.health_check, name="health-check"),
#     path("test-task/", views.run_test_task, name="run-test-task"),
#     path("auth/token/", TokenObtainPairView.as_view()),
#     path("auth/token/refresh/", TokenRefreshView.as_view()),
#     path("auth/me/", views.me, name="me"),
#     path("datasets/", views.list_datasets, name="list-datasets"),
#     path("datasets/upload/", views.upload_dataset, name="upload-dataset"),
#     path("datasets/<int:dataset_id>/", views.get_dataset, name="get-dataset"),
#     # path(
#     #     "datasets/<int:dataset_id>/semantic-config/",
#     #     views.dataset_semantic_config,
#     #     name="dataset-semantic-config",
#     # ),
#     path(
#         "datasets/<int:dataset_id>/semantic-config/",
#         views.update_semantic_config,
#         name="update-semantic-config",
#     ),
#     path(
#         "datasets/<int:dataset_id>/preview/",
#         views.dataset_preview,
#         name="dataset-preview",
#     ),
#     path(
#         "datasets/<int:dataset_id>/quality-rows/",
#         views.dataset_quality_rows,
#         name="dataset-quality-rows",
#     ),
# ]

urlpatterns = [
    path("health/", views.health_check, name="analytics-health"),
    path("tasks/test/", views.run_test_task, name="analytics-test-task"),
    path("auth/token/", TokenObtainPairView.as_view()),
    path("auth/token/refresh/", TokenRefreshView.as_view()),
    path("auth/me/", views.me, name="analytics-me"),
    path("datasets/", views.list_datasets, name="analytics-datasets"),
    path("datasets/upload/", views.upload_dataset, name="analytics-upload-dataset"),
    path("datasets/<int:dataset_id>/", views.get_dataset, name="analytics-get-dataset"),
    path(
        "datasets/<int:dataset_id>/semantic-config/",
        views.set_semantic_config,
        name="analytics-set-semantic-config",
    ),
]
