from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .tasks import test_task


@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    return Response({"status": "ok"})


@api_view(["POST"])
@permission_classes([AllowAny])  # dev-only, leave open or lock later
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
