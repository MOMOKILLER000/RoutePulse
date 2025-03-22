from django.urls import path
from .views import get_route, sign_up, login_view
from .views import RouteListView, TripListView, ShapeView, profile, csrf_token, logout_view, update_profile
from .views import face_login_view, save_route, get_saved_routes, unsave_route, create_article, report_accident
urlpatterns = [
    path('cars/', get_route, name='get_route'),
    path('signup/', sign_up, name='signup'),
    path('login/', login_view, name='login'),
    path('routes/', RouteListView.as_view(), name='route-list'),
    path('routes/<int:route_id>/trips/', TripListView.as_view(), name='route-trips'),
    path('shapes/<str:shape_id>/', ShapeView.as_view(), name='shape-polyline'),
    path('profile/', profile, name='profile'),
    path('csrf-token/', csrf_token, name='csrf_token'),
    path('logout/', logout_view, name='logout'),
    path('profile/update/', update_profile, name='update_profile'),
    path('face-login/', face_login_view, name='face-login'),
    path('save_route/', save_route, name='save_route'),
    path('get_saved_routes/', get_saved_routes, name='get_saved_routes'),
    path('unsave_route/<int:route_id>/', unsave_route, name='unsave_route'),
    path('create_article/', create_article, name='create_article'),
    path('report-accident/', report_accident, name='report-accident'),
]
