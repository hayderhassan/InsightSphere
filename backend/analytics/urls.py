from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from . import views

urlpatterns = [
    path("health/", views.health_check),
    path("test-task/", views.run_test_task),
    path("auth/token/", TokenObtainPairView.as_view()),
    path("auth/token/refresh/", TokenRefreshView.as_view()),
    path("auth/me/", views.me),
    path("datasets/", views.list_datasets),
    path("datasets/upload/", views.upload_dataset),
    path("datasets/<int:dataset_id>/", views.get_dataset),
]
