import requests
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import logging
from rest_framework.decorators import api_view
from django.middleware.csrf import get_token
from django.contrib.auth.decorators import login_required
from django.contrib.auth import authenticate, login as django_login
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.csrf import ensure_csrf_cookie
from .decorators import api_login_required
from django.contrib.auth import logout as django_logout
from datetime import datetime
import json
from django.db.models import F
from django.contrib.auth import get_user_model
from django.views.decorators.csrf import csrf_exempt
from .models import SavedRoute, Article, Accident, Comment, Contact
from django.shortcuts import get_object_or_404
from django.utils import timezone
logger = logging.getLogger(__name__)
from django.core.exceptions import PermissionDenied
from django.core.exceptions import ValidationError

HERE_API_KEY = "tK7VNjCDPeGh8hQ4r5za6HRDFGhyMAPcjVFwyBWgxeM"


@api_view(['GET'])
def get_route(request):
    origin = request.GET.get('origin')
    destination = request.GET.get('destination')

    if not origin or not destination:
        return Response({"error": "Both origin and destination are required."}, status=400)

    url = "https://router.hereapi.com/v8/routes"
    params = {
        'transportMode': 'car',
        'origin': origin,
        'destination': destination,
        'alternatives': '3',
        'return': 'travelSummary,polyline',
        'apikey': HERE_API_KEY
    }

    response = requests.get(url, params=params)

    if response.status_code != 200:
        return Response({"error": "Error fetching data from HERE API"}, status=response.status_code)

    routes = response.json().get('routes', [])
    if routes:
        for route in routes:
            distance = route['sections'][0]['travelSummary']['length']
            duration = route['sections'][0]['travelSummary']['duration']

            cost = (distance / 1000) * 0.5
            route['cost'] = round(cost, 2)

    return Response({"routes": routes}, status=200)

@csrf_exempt
def save_route(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            origin = data.get('origin')
            origin_coordinates = data.get('origin_coordinates')
            destination = data.get('destination')
            destination_coordinates = data.get('destination_coordinates')
            polyline = data.get('polyline')
            duration = data.get('duration')
            distance = data.get('distance')
            cost = data.get('cost')

            if not all([origin, origin_coordinates, destination, destination_coordinates, polyline]):
                return JsonResponse({'error': 'Missing required fields'}, status=400)

            route = SavedRoute.objects.create(
                origin=origin,
                origin_coordinates=origin_coordinates,
                destination=destination,
                destination_coordinates=destination_coordinates,
                polyline=polyline,
                duration=duration,
                distance=distance,
                cost=cost,
                user=request.user
            )

            return JsonResponse({'message': 'Route saved successfully!'}, status=201)

        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    else:
        return JsonResponse({'error': 'Invalid method. Only POST is allowed.'}, status=405)

@login_required
def get_saved_routes(request):
    user = request.user
    routes = SavedRoute.objects.filter(user=user)
    routes_data = []
    for route in routes:
        routes_data.append({
            'id': route.id,
            'origin': route.origin,
            'origin_coordinates': route.origin_coordinates,
            'destination': route.destination,
            'destination_coordinates': route.destination_coordinates,
            'polyline': route.polyline,
            'duration': route.duration,
            'distance': route.distance,
            'cost': str(route.cost) if route.cost is not None else None,
        })
    return JsonResponse({'routes': routes_data}, status=200)

@login_required
def unsave_route(request, route_id):
    route = get_object_or_404(SavedRoute, id=route_id, user=request.user)
    route.delete()
    return JsonResponse({'message': 'Route unsaved successfully'}, status=200)

@ensure_csrf_cookie
def csrf_token(request):
    csrf_token = get_token(request)
    return JsonResponse({'csrf_token': csrf_token})


@csrf_protect
def sign_up(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'message': 'Invalid JSON data'}, status=400)

        email = data.get('email')
        username = data.get('username')
        password = data.get('password')
        first_name = data.get('first_name')
        last_name = data.get('last_name')
        preferred_transport = data.get('preferred_transport')
        notifications = data.get('notifications')
        user_model = get_user_model()

        if user_model.objects.filter(email=email).exists():
            return JsonResponse({'message': 'Email is already in use.'}, status=400)
        
        if user_model.objects.filter(username=username).exists():
            return JsonResponse({'message': 'Username is already in use.'}, status=400)

        try:
            user = user_model.objects.create_user(
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                username=username,
                preferred_transport=preferred_transport,
                notifications=notifications,
            )
        except ValidationError as e:
            return JsonResponse({'message': str(e)}, status=400)
        django_login(request, user)  # Use django_login here
        return JsonResponse({
            'message': 'User created and logged in successfully.',
            'user': {
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'username': user.username,
                'preferred_transport': user.preferred_transport,
                'notifications': user.notifications,
            }
        }, status=201)

    return JsonResponse({'message': 'Method not allowed'}, status=405)



@csrf_protect
def login_view(request):
    if request.method == 'POST':
        csrf_token = get_token(request)
        print("CSRF Token received:", csrf_token)

        try:
            data = json.loads(request.body)
            email = data.get('email')
            password = data.get('password')

            if not email or not password:
                return JsonResponse({'message': 'Email and Password are required'}, status=400)

            user = authenticate(request, username=email, password=password)

            if user is not None:
                if user.is_superuser:
                    user_data = {
                        'id': user.id,
                        'email': user.email,
                        'is_superuser': user.is_superuser
                    }
                    return JsonResponse({'message': 'First Login successful', 'user': user_data}, status=200)
                django_login(request, user)
                request.session.set_expiry(3600 * 6)

                user_data = {
                    'id': user.id,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'is_superuser': user.is_superuser
                }
                return JsonResponse({'message': 'Login successful', 'user': user_data}, status=200)
            else:
                return JsonResponse({'message': 'Invalid credentials'}, status=400)

        except json.JSONDecodeError:
            return JsonResponse({'message': 'Invalid JSON'}, status=400)

    return JsonResponse({'message': 'Method Not Allowed'}, status=405)


@api_login_required
def profile(request):
    user = request.user
    user_data = {
        'id': user.id,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'preferred_transport': user.preferred_transport,
        'notifications': user.notifications,
        'points': user.points,
        'username': user.username,
        'image': request.build_absolute_uri(user.image.url) if user.image else None,
        'instagram': user.instagram,
        'facebook': user.facebook,
        'tiktok': user.tiktok,
        'github': user.github,
    }
    return JsonResponse({'user': user_data})


@csrf_exempt
def logout_view(request):
    if request.method == 'POST':
        django_logout(request)
        print("User logged out successfully")
        return JsonResponse({'message': 'Logout successful'}, status=200)
    else:
        return JsonResponse({'message': 'Method not allowed'}, status=405)
    

from django.contrib.auth import update_session_auth_hash
from django.views.decorators.http import require_http_methods


@api_login_required
@csrf_exempt
@require_http_methods(["PUT", "POST"])
def update_profile(request):
    user = request.user
    try:
        if request.method == "PUT":
            data = json.loads(request.body)

            if 'first_name' in data:
                user.first_name = data['first_name']
            if 'last_name' in data:
                user.last_name = data['last_name']
            if 'username' in data:
                user.username = data['username']
            if 'preferred_transport' in data:
                user.preferred_transport = data['preferred_transport']
            if 'notifications' in data:
                user.notifications = data['notifications']
            if 'instagram' in data:
                user.instagram = data['instagram']
            if 'facebook' in data:
                user.facebook = data['facebook']
            if 'tiktok' in data:
                user.tiktok = data['tiktok']
            if 'github' in data:
                user.github = data['github']
            if 'password' in data and data['password']:
                user.set_password(data['password'])
                update_session_auth_hash(request, user)
            user.save()


        if request.method == "POST" and 'image' in request.FILES:
            if user.image:
                try:
                    user.image.delete(save=False)
                except Exception as e:
                    print(f"Error deleting old image: {e}")

            # Save new image
            user.image = request.FILES['image']
            user.save()

        return JsonResponse({
            'user': {
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'username': user.username,
                'preferred_transport': user.preferred_transport,
                'notifications': user.notifications,
                'image': request.build_absolute_uri(user.image.url) if user.image else None,
            }
        }, status=200)

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


import os
import base64
import json
from deepface import DeepFace
from django.http import JsonResponse
from django.contrib.auth import get_user_model, login as django_login

def save_temp_image(uploaded_image_data):
    temp_dir = 'tmp'
    if not os.path.exists(temp_dir):
        os.makedirs(temp_dir)
    format, imgstr = uploaded_image_data.split(';base64,')
    imgdata = base64.b64decode(imgstr)
    temp_file_path = os.path.join(temp_dir, 'uploaded_face.jpg')
    with open(temp_file_path, 'wb') as f:
        f.write(imgdata)
    return temp_file_path

def face_login_view(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            face_image = data.get('face_image')
            pending_user_id = data.get('user_id')  # New field from frontend
            if not face_image:
                return JsonResponse({'message': 'Face image is required'}, status=400)
            if not pending_user_id:
                return JsonResponse({'message': 'User ID is required for face verification'}, status=400)
            temp_file_path = save_temp_image(face_image)
            User = get_user_model()
            try:
                user = User.objects.get(id=pending_user_id)
            except User.DoesNotExist:
                return JsonResponse({'message': 'User not found'}, status=404)

            if not user.face_image:
                return JsonResponse({'message': 'No stored face image for this user'}, status=400)

            stored_img_path = user.face_image.path
            try:
                result = DeepFace.verify(
                    img1_path=temp_file_path,
                    img2_path=stored_img_path,
                    enforce_detection=True,
                    detector_backend='opencv'
                )
                if result.get("verified"):
                    django_login(request, user)
                    print(f'User logged in: ID={user.id}, Email={user.email}, '
                          f'First Name={user.first_name}, Last Name={user.last_name}')
                    user_data = {
                        'id': user.id,
                        'email': user.email,
                        'first_name': user.first_name,
                        'last_name': user.last_name,
                        'is_superuser': user.is_superuser
                    }
                    return JsonResponse({'message': 'Login successful', 'user': user_data}, status=200)
                else:
                    return JsonResponse({'message': 'Face verification failed'}, status=400)
            except Exception as e:
                return JsonResponse({'message': str(e)}, status=500)
        except Exception as e:
            return JsonResponse({'message': f'Error: {str(e)}'}, status=400)


@csrf_exempt
def create_article(request):
    if request.method == 'POST':
        if not request.user.is_authenticated:
            return JsonResponse({"error": "User not authenticated."}, status=403)

        title = request.POST.get('title')
        description = request.POST.get('description')
        content = request.POST.get('content')
        image = request.FILES.get('image')

        if not title or not description or not content:
            return JsonResponse(
                {"error": "Title, description, and content are required!"},
                status=400
            )

        article = Article.objects.create(
            title=title,
            description=description,
            content=content,
            image=image,
            author=request.user
        )

        return JsonResponse({"message": "Article created successfully!"}, status=201)

    return JsonResponse({"error": "Invalid request method"}, status=405)


@csrf_exempt
def report_accident(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            city = data.get('city')
            street = data.get('street')
            date = data.get('date')
            time = data.get('time')
            problem_type = data.get('problem_type')
            details = data.get('details')
            contact_info = data.get('contact_info')
            latitude = data.get('latitude')
            longitude = data.get('longitude')

            if city and date and time and problem_type and details:
                accident_datetime = datetime.strptime(f"{date} {time}", "%Y-%m-%d %H:%M")

                accident = Accident.objects.create(
                    city=city,
                    street=street,
                    date=accident_datetime.date(),
                    time=accident_datetime.time(),
                    problem_type=problem_type,
                    details=details,
                    contact_info=contact_info if contact_info else None,
                    latitude=latitude,
                    longitude=longitude
                )

                return JsonResponse({"message": "Accident reported successfully!"}, status=201)

            return JsonResponse({"error": "Please fill in all required fields."}, status=400)

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    return JsonResponse({"error": "Invalid request method."}, status=405)

from django.shortcuts import render
from django.http import JsonResponse
from .models import Article
from django.core.serializers import serialize

@csrf_exempt
def random_articles(request):
    articles = Article.objects.order_by('?')[:4]  # Select random articles
    articles_data = []
    for article in articles:
        articles_data.append({
            'id': article.id,
            'title': article.title,
            'description': article.description,
            'image': article.image.url if article.image else None,  # Handle image properly
            'content': article.content,
            'author': {
                'username': article.author.username if article.author else None,
                'image': article.author.image.url if article.author and article.author.image else None  # Get author's profile picture
            },
            'created_at': article.created_at.isoformat(),
            'popularity': article.popularity,
        })
    return JsonResponse(articles_data, safe=False)

@csrf_exempt
def latest_articles(request):
    articles = Article.objects.order_by('-created_at')[:3]  # Filter by latest
    articles_data = []
    for article in articles:
        articles_data.append({
            'id': article.id,
            'title': article.title,
            'description': article.description,
            'image': article.image.url if article.image else None,
            'content': article.content,
            'author': {
                'username': article.author.username if article.author else None,
                'image': article.author.image.url if article.author and article.author.image else None  # Get author's profile picture
            },
            'created_at': article.created_at.isoformat(),
            'popularity': article.popularity,
        })
    return JsonResponse(articles_data, safe=False)

@csrf_exempt
def hot_articles(request):
    articles = Article.objects.order_by('-popularity')[:3]  # Filter by popularity
    articles_data = []
    for article in articles:
        articles_data.append({
            'id': article.id,
            'title': article.title,
            'description': article.description,
            'image': article.image.url if article.image else None,
            'content': article.content,
            'author': {
                'username': article.author.username if article.author else None,
                'image': article.author.image.url if article.author and article.author.image else None  # Get author's profile picture
            },
            'created_at': article.created_at.isoformat(),
            'popularity': article.popularity,
        })
    return JsonResponse(articles_data, safe=False)


@csrf_exempt
def article_details(request, article_id):  # Ensure you're using article_id
    try:
        article = Article.objects.get(id=article_id)  # Correctly using article_id
        article_data = {
            'id': article.id,
            'title': article.title,
            'description': article.description,
            'content': article.content,
            'image': article.image.url if article.image else None,
            'author': {
                'username': article.author.username if article.author else None,
                'image': article.author.image.url if article.author and article.author.image else None
            },
            'created_at': article.created_at.isoformat(),
            'popularity': article.popularity,
        }
        return JsonResponse(article_data)
    except Article.DoesNotExist:
        return JsonResponse({'error': 'Article not found'}, status=404)

@login_required
def update_popularity(request, article_id, action):
    article = get_object_or_404(Article, id=article_id)
    user = request.user

    if action == "like":
        if user in article.liked_by.all():
            article.liked_by.remove(user)
            article.popularity = max(0, F("popularity") - 1)  # Ensure non-negative
        else:
            article.liked_by.add(user)
            article.popularity = F("popularity") + 1
            article.disliked_by.remove(user)  # Remove dislike if previously disliked

    elif action == "dislike":
        if user in article.disliked_by.all():
            article.disliked_by.remove(user)
            article.popularity = F("popularity") + 1
        else:
            article.disliked_by.add(user)
            article.popularity = max(0, F("popularity") - 1)  # Ensure non-negative
            article.liked_by.remove(user)  # Remove like if previously liked

    article.save()

    # Update author's popularity
    author = article.author
    author.popularity = F("popularity") + 1  # Increase author's popularity
    author.save(update_fields=["popularity"])  # Save only the popularity field

    return JsonResponse({
        "message": "Popularity updated",
        "popularity": article.popularity,
        "liked": user in article.liked_by.all(),
        "disliked": user in article.disliked_by.all(),
    })

@login_required
def submit_comment(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON"}, status=400)

        article_id = data.get('articleId')
        content = data.get('content')

        if not article_id or not content:
            return JsonResponse({"error": "Missing required fields"}, status=400)

        # Ensure the article exists
        try:
            article = Article.objects.get(id=article_id)
        except Article.DoesNotExist:
            return JsonResponse({"error": "Article not found"}, status=404)

        # Create and save the comment
        comment = Comment(article=article, author=request.user, content=content, pub_date=timezone.now())
        comment.save()

        return JsonResponse({
            "message": "Comment submitted successfully",
            "comment": {
                "id": comment.id,
                "author": comment.author.username,
                "content": comment.content,
                "pub_date": comment.pub_date.strftime('%Y-%m-%d %H:%M:%S')
            }
        }, status=201)

    return JsonResponse({"error": "Invalid request method"}, status=405)

def article_comments(request, article_id):
    if request.method == 'GET':
        comments = Comment.objects.filter(article_id=article_id)
        comments_data = []
        for comment in comments:
            comments_data.append({
                'id': comment.id,
                'author': comment.author.username,
                'user_id': comment.author.id,
                'comment': comment.content,
                'pub_date': comment.pub_date.strftime('%Y-%m-%d %H:%M:%S'),
            })
        return JsonResponse({'comments': comments_data}, status=200)


@login_required
def delete_comment(request, comment_id):
    comment = get_object_or_404(Comment, id=comment_id)

    if not comment.can_delete(request.user):
        return JsonResponse({'error': 'Unauthorized'}, status=403)

    comment.delete()
    return JsonResponse({'message': 'Comment deleted successfully'})

@csrf_exempt
@login_required
def delete_comment(request, comment_id):
    """Allows a user to delete their own comment or a superuser to delete any comment."""
    if request.method == "DELETE":
        comment = get_object_or_404(Comment, id=comment_id)

        if request.user == comment.author or request.user.is_superuser:
            comment.delete()
            return JsonResponse({"message": "Comment deleted successfully"})
        else:
            raise PermissionDenied("You do not have permission to delete this comment.")

    return JsonResponse({"error": "Invalid request method"}, status=400)


@login_required
def get_user_info(request):
    """Returns the logged-in user's details."""
    return JsonResponse({
        "id": request.user.id,  # Include user ID
        "username": request.user.username,
        "is_superuser": request.user.is_superuser,
    })


def most_popular_user(request):
    try:
        # Get the user with the highest popularity
        User = get_user_model()
        best_user = User.objects.order_by('-popularity').first()
        print(best_user.username)
        if best_user:
            # You may want to include additional data like profile image, username, etc.
            return JsonResponse({
                'username': best_user.username,
                'profile_image': best_user.image.url if best_user.image else '/default-avatar.jpg',  # Add default image if none
            })
        else:
            return JsonResponse({'error': 'No popular user found'}, status=404)

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


import requests
from django.conf import settings
from django.http import JsonResponse
from geopy.distance import geodesic
import concurrent.futures

# Tranzy API endpoints
BASE_URL = "https://api.tranzy.ai/v1/opendata"


# You could add more endpoints (routes, trips, shapes) as needed

def get_stops(request):
    """Fetch stops from the Tranzy API."""
    headers = {
        'Accept': 'application/json',
        'X-API-KEY': "zbqG3CwEW4dDwJzsMtqXDu6lTglhCnARg9dJWdap",
        'X-Agency-Id': '1',
    }
    response = requests.get(f"{BASE_URL}/stops", headers=headers)
    if response.status_code == 200:
        stops = response.json()
        return JsonResponse(stops, safe=False)
    else:
        return JsonResponse({'error': 'Failed to fetch stops'}, status=response.status_code)


def nearest_stop(request):
    """Calculate the nearest stop given user's lat and lon."""
    try:
        lat = float(request.GET.get('lat'))
        lon = float(request.GET.get('lon'))
    except (TypeError, ValueError):
        return JsonResponse({'error': 'Invalid latitude or longitude'}, status=400)

    # Get stops from the Tranzy API
    headers = {
        'Accept': 'application/json',
        'X-API-KEY': "zbqG3CwEW4dDwJzsMtqXDu6lTglhCnARg9dJWdap",
        'X-Agency-Id': '1',
    }
    response = requests.get(f"{BASE_URL}/stops", headers=headers)
    if response.status_code != 200:
        return JsonResponse({'error': 'Failed to fetch stops'}, status=response.status_code)

    stops = response.json()
    nearest = None
    min_distance = float('inf')
    for stop in stops:
        stop_lat = stop.get('stop_lat')
        stop_lon = stop.get('stop_lon')
        if stop_lat is not None and stop_lon is not None:
            distance = geodesic((lat, lon), (stop_lat, stop_lon)).meters
            if distance < min_distance:
                min_distance = distance
                nearest = stop

    if nearest:
        return JsonResponse(nearest, safe=False)
    else:
        return JsonResponse({'error': 'No stops found'}, status=404)


from geopy.distance import geodesic
import requests
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

API_KEY = "zbqG3CwEW4dDwJzsMtqXDu6lTglhCnARg9dJWdap"
BASE_URL = "https://api.tranzy.ai/v1/opendata"
THRESHOLD_METERS = 20

class RouteListView(APIView):
    def get(self, request):
        agency_id = request.GET.get('agency_id', '1')
        headers = {
            "Accept": "application/json",
            "X-API-KEY": API_KEY,
            "X-Agency-Id": agency_id,
        }

        routes_response = requests.get(f"{BASE_URL}/routes", headers=headers)
        if routes_response.status_code != 200:
            return Response({"error": "Failed to fetch routes"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        routes = routes_response.json()
        return Response(routes, status=status.HTTP_200_OK)


class TripListView(APIView):
    def get(self, request, route_id):
        agency_id = request.GET.get('agency_id', '1')
        headers = {
            "Accept": "application/json",
            "X-API-KEY": API_KEY,
            "X-Agency-Id": agency_id,
        }

        trips_response = requests.get(f"{BASE_URL}/trips", headers=headers)
        if trips_response.status_code != 200:
            return Response({"error": "Failed to fetch trips"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        trips = trips_response.json()

        filtered_trips = [trip for trip in trips if trip["route_id"] == int(route_id)]

        return Response(filtered_trips, status=status.HTTP_200_OK)


class ShapeView(APIView):
    def get(self, request, shape_id):
        agency_id = request.GET.get('agency_id', '1')
        headers = {
            "Accept": "application/json",
            "X-API-KEY": API_KEY,
            "X-Agency-Id": agency_id,
        }

        shapes_response = requests.get(f"{BASE_URL}/shapes", headers=headers, params={"shape_id": shape_id})
        if shapes_response.status_code != 200:
            return Response({"error": "Failed to fetch shape data"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        shape_points = shapes_response.json()

        if not shape_points:
            return Response({"error": "Shape not found"}, status=status.HTTP_404_NOT_FOUND)

        # Sort shape points by sequence
        shape_points = sorted(shape_points, key=lambda x: x["shape_pt_sequence"])
        polyline = [[point["shape_pt_lat"], point["shape_pt_lon"]] for point in shape_points]

        return Response({"polyline": polyline}, status=status.HTTP_200_OK)


class GenerateRouteView(APIView):
    def get(self, request):
        starting_stop_id = request.GET.get('starting_stop_id')
        destination_stop_id = request.GET.get('destination_stop_id')
        agency_id = request.GET.get('agency_id', '1')

        if not starting_stop_id or not destination_stop_id:
            return Response({"error": "Missing starting_stop_id or destination_stop_id"},
                            status=status.HTTP_400_BAD_REQUEST)

        stops_response = requests.get("http://localhost:8000/api/stops/")
        if stops_response.status_code != 200:
            return Response({"error": "Failed to fetch stops"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        stops = stops_response.json()

        starting_stop = next((s for s in stops if str(s['stop_id']) == str(starting_stop_id)), None)
        destination_stop = next((s for s in stops if str(s['stop_id']) == str(destination_stop_id)), None)

        if not starting_stop or not destination_stop:
            return Response({"error": "Invalid stop id provided"}, status=status.HTTP_400_BAD_REQUEST)

        headers = {
            "Accept": "application/json",
            "X-API-KEY": API_KEY,
            "X-Agency-Id": agency_id,
        }

        trips_response = requests.get(f"{BASE_URL}/trips", headers=headers)
        if trips_response.status_code != 200:
            return Response({"error": "Failed to fetch trips"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        trips = trips_response.json()

        for trip in trips:
            shape_id = trip.get("shape_id")
            if not shape_id:
                continue

            shape_response = requests.get(f"{BASE_URL}/shapes", headers=headers, params={"shape_id": shape_id})
            if shape_response.status_code != 200:
                continue

            shape_points = sorted(shape_response.json(), key=lambda p: p["shape_pt_sequence"])
            start_index, dest_index = None, None

            for i, pt in enumerate(shape_points):
                if self.is_near(pt, starting_stop) and start_index is None:
                    start_index = i
                if self.is_near(pt, destination_stop):
                    dest_index = i

            if start_index is not None and dest_index is not None and start_index < dest_index:
                polyline_segment = [[pt["shape_pt_lat"], pt["shape_pt_lon"]] for pt in shape_points[start_index:dest_index + 1]]
                route_response = requests.get(f"{BASE_URL}/routes", headers=headers, params={"route_id": trip["route_id"]})
                route_details = route_response.json()[0] if route_response.status_code == 200 and route_response.json() else {}
                return Response({
                    "type": "direct",
                    "trip": trip,
                    "route": {
                        "route_id": trip.get("route_id"),
                        "short_name": route_details.get("route_short_name", "N/A"),
                        "long_name": route_details.get("route_long_name", "N/A"),
                    },
                    "polyline": polyline_segment
                }, status=status.HTTP_200_OK)

        return Response({"error": "Direct route doesn't exist"}, status=status.HTTP_404_NOT_FOUND)

    def is_near(self, shape_point, stop):
        return geodesic((shape_point["shape_pt_lat"], shape_point["shape_pt_lon"]),
                        (stop["stop_lat"], stop["stop_lon"])).meters <= THRESHOLD_METERS

@csrf_exempt
def all_articles(request):
    articles = Article.objects.order_by('-created_at')
    articles_data = []
    for article in articles:
        articles_data.append({
            'id': article.id,
            'title': article.title,
            'description': article.description,
            'image': article.image.url if article.image else None,
            'content': article.content,
            'author': {
                'username': article.author.username if article.author else None,
                'image': article.author.image.url if article.author and article.author.image else None  # Get author's profile picture
            },
            'created_at': article.created_at.isoformat(),
            'popularity': article.popularity,
        })
    return JsonResponse(articles_data, safe=False)


@csrf_exempt
def contact(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            name = data.get('name')
            email = data.get('email')
            subject = data.get('subject')
            content = data.get('content')
            date = data.get('date')

            if name and email:
                contact_datetime = datetime.strptime(f"{date}", "%Y-%m-%d")

                contact = Contact.objects.create(
                    name = name,
                    email=email,
                    subject = subject,
                    content = content,
                    date=contact_datetime.date(),
                )

                return JsonResponse({"message": "Contact reported successfully!"}, status=201)

            return JsonResponse({"error": "Please fill in all required fields."}, status=400)

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    return JsonResponse({"error": "Invalid request method."}, status=405)