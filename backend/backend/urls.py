from django.contrib import admin
from django.urls import path, include, re_path
from django.views.generic import TemplateView
from django.conf import settings
from django.conf.urls.static import static
from django.shortcuts import redirect

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),  # Django API routes
]+ static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)