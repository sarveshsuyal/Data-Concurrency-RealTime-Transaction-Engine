from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse, HttpResponse
from django.views.decorators.http import require_http_methods

@require_http_methods(["GET", "HEAD"])
def root_view(request):
    """
    Public root endpoint providing service information and health check discovery.
    Accepts GET and HEAD without authentication.
    """
    if request.method == "HEAD":
        response = HttpResponse(status=200, content_type="application/json")
        return response
    return JsonResponse({
        "service": "DataCore API",
        "status": "running",
        "health": "/health/"
    })

@require_http_methods(["GET", "HEAD"])
def health_check(request):
    """
    Canonical health-check endpoint for Render and external uptime monitoring.
    Accepts GET and HEAD without authentication or database dependency.
    """
    if request.method == "HEAD":
        response = HttpResponse(status=200, content_type="application/json")
        return response
    return JsonResponse({
        "status": "healthy",
        "service": "datacore-backend"
    })

urlpatterns = [
    path('', root_view, name='root'),
    path('health/', health_check, name='health_check'),
    path('admin/', admin.site.urls),
    
    # Core API namespace
    path('api/auth/', include('authentication.urls')),
    path('api/', include('engine.urls')),
]
