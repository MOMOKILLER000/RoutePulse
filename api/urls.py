from django.urls import path
from .views import get_route, sign_up, login_view
from . import views
from .views import RouteListView, TripListView, ShapeView, profile, csrf_token, logout_view, update_profile
from .views import face_login_view, save_route, get_saved_routes, unsave_route, create_article, report_accident
from .views import article_comments
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
    path('random_articles/', views.random_articles, name='random_articles'),
    path('latest_articles/', views.latest_articles, name='latest_articles'),
    path('hot_articles/', views.hot_articles, name='hot_articles'),
    path('article/<int:article_id>/', views.article_details, name='article_details'),  # URL with article_id
    path('submit_comment/', views.submit_comment, name='submit_comment'),
    path('article/comments/<int:article_id>/', article_comments, name='comment_details'),
    path("delete_comment/<int:comment_id>/", views.delete_comment, name="delete-comment"),
    path("user/", views.get_user_info, name="get-user-info"),  # Fetch logged-in user data
    path("update_popularity/<int:article_id>/<str:action>/", views.update_popularity, name="update-popularity"),
    path("most_popular_user/", views.most_popular_user, name="most-popular-user"),
    path('stops/', views.get_stops, name='get_stops'),
    path('nearest_stop/', views.nearest_stop, name='nearest_stop'),
    path('generate_route/', views.GenerateRouteView.as_view(), name='get_route'),
    path('all_articles/', views.all_articles, name='all_articles'),
    path('contact/', views.contact, name="contact"),
]
