import logging
from django.db.models import Avg
from rest_framework.decorators import api_view
from django.middleware.csrf import get_token
from django.contrib.auth.decorators import login_required
from django.contrib.auth import authenticate, login as django_login
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.csrf import ensure_csrf_cookie
from .decorators import api_login_required
from django.contrib.auth import logout as django_logout
from datetime import datetime, timedelta
from django.utils.timezone import now
import os
import base64
import json
from deepface import DeepFace
from django.contrib.auth import get_user_model, login as django_login
from .models import SavedRoute, Article, Accident, Comment, Contact, Report, Rating, PublicTransportRoute
from .models import Route, Trip, Stop, Shape
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from .firebase import send_push_notification, subscribe_token_to_topic
from firebase_admin import messaging

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
        'alternatives': '5',
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

        routes.sort(key=lambda x: x['sections'][0]['travelSummary']['duration'])

    return Response({"routes": routes}, status=200)

@csrf_exempt
@login_required
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
            user = get_user_model()
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

@csrf_exempt
@login_required
def save_publictransportroute(request, agency_id, route_type):
    if request.method == 'POST':
        try:
            if route_type == 0:
                transport = 'Tram'
            elif route_type == 3:
                transport = 'Bus'
            data = json.loads(request.body)
            origin = data.get('startingStopId')
            destination = data.get('destinationStopId')
            if not all([origin, destination]):
                return JsonResponse({'error: Missing coords'}, status=400)
            starting_stop = Stop.objects.get(stop_id=origin, agency_id=agency_id)
            destination_stop = Stop.objects.get(stop_id=destination, agency_id=agency_id)
            origin_coords = [starting_stop.stop_lat, starting_stop.stop_lon]
            destination_coords = [destination_stop.stop_lat, destination_stop.stop_lon]
            route_short_name = data.get('route_short_name')
            route_long_name = data.get('route_long_name')
            polyline = data.get('polyline')
            duration = data.get('duration')
            distance = data.get('distance')
            if not all([origin, destination, route_short_name, route_long_name]):
                return JsonResponse({'error': 'Missing required fields'}, status=400)
            user = get_user_model()
            route = PublicTransportRoute.objects.create(
                origin = origin,
                destination = destination,
                route_short_name = route_short_name,
                route_long_name = route_long_name,
                polyline = polyline,
                origin_coordinates = origin_coords,
                destination_coordinates= destination_coords,
                transport = transport,
                user= request.user,
                duration = duration,
                distance = distance,
                cost = 0.8,
                agency_id = agency_id
            )
            return JsonResponse({'message': 'Route saved successfully!'}, status=201)

        except Exception as e:
            print(e)

    else:
        return JsonResponse({'error': 'Invalid method. Only POST is allowed.'}, status=405)


@login_required
def get_saved_routes(request):
    user = request.user

    preferred_transport = user.preferred_transport

    saved_routes = SavedRoute.objects.filter(user=user)
    public_transport_routes = PublicTransportRoute.objects.filter(user=user)

    routes_data = []

    for route in saved_routes:
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
            'type': 'car',
            'transport': 'Car'
        })

    for pt_route in public_transport_routes:
        routes_data.append({
            'id': pt_route.id,
            'origin': pt_route.origin,
            'destination': pt_route.destination,
            'route_short_name': pt_route.route_short_name,
            'route_long_name': pt_route.route_long_name,
            'origin_coordinates': pt_route.origin_coordinates,
            'destination_coordinates': pt_route.destination_coordinates,
            'polyline': pt_route.polyline,
            'duration': pt_route.duration,
            'distance': pt_route.distance,
            'cost': str(pt_route.cost) if pt_route.cost is not None else None,
            'transport': pt_route.transport,
            'type': 'public_transport',
            'agency_id': pt_route.agency_id
        })

    routes_data.sort(key=lambda x: (0 if x['transport'] == preferred_transport else 1, x['duration']))

    return JsonResponse({'routes': routes_data}, status=200)

@login_required
def unsave_route(request, route_id, route_type):
    if route_type == 'car':
       route = get_object_or_404(SavedRoute, id=route_id, user=request.user)
    else:
        route = get_object_or_404(PublicTransportRoute, id=route_id, user=request.user)
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
        firebase_token = data.get('firebase_token')

        User = get_user_model()

        if User.objects.filter(email=email).exists():
            return JsonResponse({'message': 'Email is already in use.'}, status=400)

        if User.objects.filter(username=username).exists():
            return JsonResponse({'message': 'Username is already in use.'}, status=400)

        try:
            user = User.objects.create_user(
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                username=username,
                preferred_transport=preferred_transport,
                notifications=notifications,
                firebase_token=firebase_token
            )
        except ValidationError as e:
            return JsonResponse({'message': str(e)}, status=400)

        django_login(request, user)
        request.session.set_expiry(3600 * 6)
        if notifications and firebase_token:
            send_push_notification(firebase_token, "Congratulations!", "You have notifications turned on.")

        return JsonResponse({
            'message': 'User created and logged in successfully.',
            'user': {
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'username': user.username,
                'preferred_transport': user.preferred_transport,
                'notifications': user.notifications,
                'firebase_token': user.firebase_token,
            }
        }, status=201)

    return JsonResponse({'message': 'Method not allowed'}, status=405)

@csrf_protect
def user_login_view(request):
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

            if user is not None and not user.is_superuser:
                django_login(request, user)
                request.session.set_expiry(3600 * 6)

                user_data = {
                    'id': user.id,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'is_superuser': user.is_superuser
                }
                return JsonResponse({'message': 'User login successful', 'user': user_data}, status=200)
            else:
                return JsonResponse({'message': 'Invalid credentials or not a normal user'}, status=400)

        except json.JSONDecodeError:
            return JsonResponse({'message': 'Invalid JSON'}, status=400)

    return JsonResponse({'message': 'Method Not Allowed'}, status=405)

from django.conf import settings
STATIC_FOLDER_PATH = os.path.join(settings.BASE_DIR, 'media')
PREDEFINED_IMAGE_PATH = os.path.join(STATIC_FOLDER_PATH, 'secretkey.jpg')
import cv2
import numpy as np


def save_temp_image(uploaded_image_file):
    """
    Save the uploaded face image to a temporary file. This function handles both uploaded files and base64 strings.
    """
    temp_dir = 'tmp'
    if not os.path.exists(temp_dir):
        os.makedirs(temp_dir)

    temp_file_path = os.path.join(temp_dir, 'uploaded_face.jpg')

    if isinstance(uploaded_image_file, str):
        img_data = base64.b64decode(uploaded_image_file.split(',')[1])
        with open(temp_file_path, 'wb') as f:
            f.write(img_data)
    else:
        with open(temp_file_path, 'wb') as f:
            for chunk in uploaded_image_file.chunks():
                f.write(chunk)

    return temp_file_path


def compare_images(image1_path, image2_path):
    """
    Compare two images using Mean Squared Error (MSE).
    Returns True if the images are similar, otherwise False.
    """
    img1 = cv2.imread(image1_path, cv2.IMREAD_GRAYSCALE)
    img2 = cv2.imread(image2_path, cv2.IMREAD_GRAYSCALE)

    if img1 is None or img2 is None:
        print("Error loading images")
        return False

    img2 = cv2.resize(img2, (img1.shape[1], img1.shape[0]))

    mse = np.sum((img1 - img2) ** 2) / float(img1.shape[0] * img1.shape[1])

    print(f"MSE: {mse}")

    threshold = 10
    if mse < threshold:
        return True
    return False


@csrf_exempt
def superuser_login_view(request):
    if request.method == 'POST':
        try:
            email = request.POST.get('email')
            password = request.POST.get('password')

            if not email or not password:
                return JsonResponse({'message': 'Email and Password are required'}, status=400)

            uploaded_image_file = request.FILES.get('image')
            if not uploaded_image_file:
                return JsonResponse({'message': 'Image is required'}, status=400)

            temp_image_path = save_temp_image(uploaded_image_file)

            user = authenticate(request, username=email, password=password)

            if user is not None and user.is_superuser:
                if compare_images(temp_image_path, PREDEFINED_IMAGE_PATH):
                    request.session.set_expiry(3600 * 6)
                    user_data = {
                        'id': user.id,
                        'email': user.email,
                        'first_name': user.first_name,
                        'last_name': user.last_name,
                        'is_superuser': user.is_superuser
                    }
                    return JsonResponse({'message': 'Superuser login successful', 'user': user_data}, status=200)
                else:
                    return JsonResponse({'message': 'Wrong secret key'}, status=400)
            else:
                return JsonResponse({'message': 'Invalid credentials'}, status=400)

        except Exception as e:
            return JsonResponse({'message': str(e)}, status=500)

    return JsonResponse({'message': 'Method Not Allowed'}, status=405)

@csrf_exempt
def face_login_view(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            face_image = data.get('face_image')
            pending_user_id = data.get('user_id')

            if not face_image or not pending_user_id:
                return JsonResponse({'message': 'Face image and user ID are required'}, status=400)

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

        except json.JSONDecodeError:
            return JsonResponse({'message': 'Invalid JSON'}, status=400)

    return JsonResponse({'message': 'Method Not Allowed'}, status=405)

@api_login_required
def profile(request):
    user = request.user

    saved_routes = list(SavedRoute.objects.filter(user=user).order_by("-id").values(
        "origin", "destination", "origin_coordinates", "destination_coordinates", "polyline",
        "duration", "distance", "cost"
    )[:3])

    for route in saved_routes:
        route["route_type"] = "Normal_Transport"

    if len(saved_routes) < 3:
        remaining_slots = 3 - len(saved_routes)
        public_transport_routes = list(PublicTransportRoute.objects.filter(user=user).order_by("-id").values(
            "origin", "destination", "origin_coordinates", "destination_coordinates", "polyline",
            "route_short_name", "route_long_name", "transport", "duration", "distance", "cost"
        )[:remaining_slots])

        for route in public_transport_routes:
            route["route_type"] = "Public_Transport"
    else:
        public_transport_routes = []

    routes = saved_routes + public_transport_routes

    user_data = {
        "id": user.id,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "preferred_transport": user.preferred_transport,
        "notifications": user.notifications,
        "points": user.points,
        "username": user.username,
        "image": request.build_absolute_uri(user.image.url) if user.image else None,
        "instagram": user.instagram,
        "facebook": user.facebook,
        "tiktok": user.tiktok,
        "github": user.github,
        "total_routes": user.total_routes,
        "prize1": user.prize1,
        "prize2": user.prize2,
        "prize3": user.prize3,
        "routes": routes,
    }

    return JsonResponse({"user": user_data})

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


@csrf_exempt
@require_http_methods(["PUT", "POST"])
@login_required
def update_profile(request):
    user = request.user
    try:
        if request.method == "PUT":
            try:
                data = json.loads(request.body)
            except json.JSONDecodeError:
                return JsonResponse({'error': 'Invalid JSON data'}, status=400)

            user.first_name = data.get('first_name', user.first_name)
            user.last_name = data.get('last_name', user.last_name)
            user.username = data.get('username', user.username)
            user.preferred_transport = data.get('preferred_transport', user.preferred_transport)
            user.instagram = data.get('instagram', user.instagram)
            user.facebook = data.get('facebook', user.facebook)
            user.tiktok = data.get('tiktok', user.tiktok)
            user.github = data.get('github', user.github)

            if 'notifications' in data:
                user.notifications = bool(data['notifications'])
                if not user.notifications:
                    user.firebase_token = None

            if 'firebase_token' in data:
                user.firebase_token = data['firebase_token']
                if user.notifications and user.firebase_token:
                    send_push_notification(user.firebase_token, "Congratulations!", "You have notifications turned on.")

            if 'password' in data and data['password']:
                user.set_password(data['password'])
                update_session_auth_hash(request, user)

            user.save()

        elif request.method == "POST":
            user.first_name = request.POST.get("first_name", user.first_name)
            user.last_name = request.POST.get("last_name", user.last_name)
            user.username = request.POST.get("username", user.username)
            user.preferred_transport = request.POST.get("preferred_transport", user.preferred_transport)
            user.instagram = request.POST.get("instagram", user.instagram)
            user.facebook = request.POST.get("facebook", user.facebook)
            user.tiktok = request.POST.get("tiktok", user.tiktok)
            user.github = request.POST.get("github", user.github)

            user.notifications = request.POST.get("notifications", "false").lower() == "true"

            if "password" in request.POST and request.POST.get("password"):
                user.set_password(request.POST.get("password"))
                update_session_auth_hash(request, user)

            if request.POST.get("remove_image", "false").lower() == "true":
                if user.image:
                    try:
                        user.image.delete(save=False)
                    except Exception as e:
                        print(f"Error deleting old image: {e}")
                user.image = None
            elif 'image' in request.FILES:
                if user.image:
                    try:
                        user.image.delete(save=False)
                    except Exception as e:
                        print(f"Error deleting old image: {e}")
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
                'instagram': user.instagram,
                'facebook': user.facebook,
                'tiktok': user.tiktok,
                'github': user.github,
                'image': request.build_absolute_uri(user.image.url) if user.image else None,
            }
        }, status=200)

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


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
def broadcast_notification(request):
    if request.method == 'POST':
        try:
            logger.info(f"Request body: {request.body}")
            data = json.loads(request.body)
            title = data.get('title')
            body = data.get('body')

            if not title or not body:
                return JsonResponse({'status': 'failure', 'message': 'Title and body are required.'}, status=400)

            User = get_user_model()
            tokens = list(User.objects.filter(notifications=True)
                          .exclude(firebase_token__isnull=True)
                          .exclude(firebase_token='')
                          .values_list('firebase_token', flat=True))

            if not tokens:
                return JsonResponse({'status': 'failure', 'message': 'No users with notifications enabled.'}, status=400)

            print(f"Sending notification to {len(tokens)} users.")

            success_count = 0
            failure_count = 0

            for token in tokens:
                try:
                    message = messaging.Message(
                        notification=messaging.Notification(title=title, body=body),
                        token=token
                    )
                    response = messaging.send(message)
                    print(f"Successfully sent notification to {token}: {response}")
                    success_count += 1
                except Exception as e:
                    print(f"Failed to send notification to {token}: {e}")
                    failure_count += 1

            return JsonResponse({
                'status': 'success',
                'message': f'Broadcast sent successfully.',
                'success_count': success_count,
                'failure_count': failure_count
            })

        except Exception as e:
            print(f"Error sending broadcast notification: {str(e)}")
            return JsonResponse({'status': 'failure', 'message': str(e)}, status=500)

    return JsonResponse({'status': 'failure', 'message': 'Invalid request method'}, status=400)

from django.http import HttpRequest
@csrf_exempt
def report_accident(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            user_id = data.get('user_id')
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
                accident_datetime += timedelta(hours=0)
                User = get_user_model()
                user = User.objects.get(id=user_id)
                accident = Accident.objects.create(
                    user=user,
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

                nearby_accidents = [
                    acc for acc in Accident.objects.filter(date=accident_datetime.date())
                    if geodesic((latitude, longitude), (acc.latitude, acc.longitude)).meters <= 100
                       and abs((datetime.combine(acc.date, acc.time) - accident_datetime).total_seconds()) <= 3600
                ]

                existing_report = Report.objects.filter(
                    city=city, street=street, date=accident_datetime.date(), problem_type=problem_type
                ).first()

                new_report_created = False

                if existing_report:
                    existing_report.accidents.add(accident)
                else:
                    if len(nearby_accidents) >= 5:
                        new_report = Report.objects.create(
                            city=city,
                            street=street,
                            coords=f"{latitude}, {longitude}",
                            date=accident_datetime.date(),
                            time=accident_datetime.time(),
                            problem_type=problem_type
                        )
                        new_report.accidents.set(nearby_accidents)
                        new_report_created = True

                if new_report_created:
                    notification_data = {
                        "title": "🚨 Accident Alert!",
                        "body": f"An accident has been reported at {street}, {city}. Stay cautious!",
                        "token": None
                    }
                    request_data = json.dumps(notification_data)
                    fake_request = HttpRequest()
                    fake_request.method = 'POST'
                    fake_request._body = request_data.encode('utf-8')
                    broadcast_notification(fake_request)

                return JsonResponse({"message": "Accident reported successfully!"}, status=201)

            return JsonResponse({"error": "Please fill in all required fields."}, status=400)

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    return JsonResponse({"error": "Invalid request method."}, status=405)


def get_reports(request, num=None):
    if num:
        reports = Report.objects.order_by('-date', '-time')[:num]
    else:
        reports = Report.objects.order_by('-date', '-time')

    reports_data = []
    for report in reports:
        reports_data.append({
            'id': report.id,
            'city': report.city,
            'street': report.street,
            'date': report.date,
            'time': report.time,
            'latitude': report.latitude,
            'longitude': report.longitude,
            'problem_type': report.problem_type,
        })

    return JsonResponse(reports_data, safe=False)

def get_recent_reports(request):
    time_threshold = now() - timedelta(hours=2)

    reports = Report.objects.filter(date__gte=time_threshold.date(), time__gte=time_threshold.time()).order_by('-date', '-time')

    reports_data = [
        {
            'id': report.id,
            'city': report.city,
            'street': report.street,
            'date': report.date,
            'time': report.time,
            'latitude': report.latitude,
            'longitude': report.longitude,
            'problem_type': report.problem_type,
        }
        for report in reports
    ]

    return JsonResponse(reports_data, safe=False)

@csrf_exempt
def report_details(request, report_id):
    try:
        report = Report.objects.get(id=report_id)
        report_data = {
            'id': report.id,
            'city': report.city,
            'street': report.street,
            'date': report.date,
            'time': report.time,
            'latitude': report.latitude,
            'longitude': report.longitude,
            'problem_type': report.problem_type,
            'accidents': [{
                'id': accident.id,
                'user': accident.user.username,
                'date': accident.date,
                'time': accident.time,
            } for accident in report.accidents.all()]
        }
        return JsonResponse(report_data)
    except Report.DoesNotExist:
        return JsonResponse({'error': 'Report not found'}, status=404)

@csrf_exempt
def random_articles(request):
    articles = Article.objects.order_by('?')[:4]
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
                'image': article.author.image.url if article.author and article.author.image else None
            },
            'created_at': article.created_at.isoformat(),
            'popularity': article.popularity,
        })
    return JsonResponse(articles_data, safe=False)

@csrf_exempt
def latest_articles(request):
    articles = Article.objects.order_by('-created_at')[:3]
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
                'image': article.author.image.url if article.author and article.author.image else None
            },
            'created_at': article.created_at.isoformat(),
            'popularity': article.popularity,
        })
    return JsonResponse(articles_data, safe=False)

@csrf_exempt
def hot_articles(request):
    articles = Article.objects.order_by('-popularity')[:3]
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
                'image': article.author.image.url if article.author and article.author.image else None
            },
            'created_at': article.created_at.isoformat(),
            'popularity': article.popularity,
        })
    return JsonResponse(articles_data, safe=False)


@csrf_exempt
def article_details(request, article_id):
    try:
        article = Article.objects.get(id=article_id)
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

    current_popularity = article.popularity

    if action == "like":
        if user in article.liked_by.all():
            article.liked_by.remove(user)
            article.popularity = max(0, current_popularity - 1)
        else:
            article.liked_by.add(user)
            article.popularity = current_popularity + 1
            article.disliked_by.remove(user)

    elif action == "dislike":
        if user in article.disliked_by.all():
            article.disliked_by.remove(user)
            article.popularity = current_popularity + 1
        else:
            article.disliked_by.add(user)
            article.popularity = max(0, current_popularity - 1)
            article.liked_by.remove(user)

    article.save()

    author = article.author
    author.popularity = author.popularity + 1
    author.save(update_fields=["popularity"])

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

        try:
            article = Article.objects.get(id=article_id)
        except Article.DoesNotExist:
            return JsonResponse({"error": "Article not found"}, status=404)

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
    return JsonResponse({
        "id": request.user.id,
        "username": request.user.username,
        "is_superuser": request.user.is_superuser,
        "points": request.user.points,
        "total_points": request.user.total_points,
        "preferred_transport": request.user.preferred_transport,
        "prize1": request.user.prize1,
        "prize2": request.user.prize2,
        "prize3": request.user.prize3,
    })


def most_popular_user(request):
    try:
        User = get_user_model()
        best_user = User.objects.order_by('-popularity').first()
        if best_user:
            return JsonResponse({
                'username': best_user.username,
                'profile_image': best_user.image.url if best_user.image else '/media/default.jpg',
            })
        else:
            return JsonResponse({'error': 'No popular user found'}, status=404)

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


from geopy.distance import geodesic
import requests
from django.forms.models import model_to_dict
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from django.http import JsonResponse, HttpResponseNotAllowed
API_KEY = "zbqG3CwEW4dDwJzsMtqXDu6lTglhCnARg9dJWdap"
BASE_URL = "https://api.tranzy.ai/v1/opendata"
THRESHOLD_METERS = 2000


def get_stops(request):
    agency_id = request.GET.get('agency_id', '1')
    stops = Stop.objects.filter(agency_id=agency_id).values()
    if stops.exists():
        return JsonResponse(list(stops), safe=False)
    return JsonResponse({'error': 'Failed to fetch stops'}, status=404)


class StopDetail(APIView):
    def get(self, request, stop_id, format=None):
        agency_id = request.GET.get('agency_id', None)
        if not agency_id:
            return Response({"error": "Missing agency_id"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            stop = Stop.objects.get(stop_id=stop_id, agency_id=agency_id)
        except Stop.DoesNotExist:
            return Response({"error": "Stop not found"}, status=status.HTTP_404_NOT_FOUND)

        stop_data = {
            "stop_id": stop.stop_id,
            "stop_name": stop.stop_name,
            "stop_lat": stop.stop_lat,
            "stop_lon": stop.stop_lon,
            "agency_id": stop.agency_id,
        }
        return Response(stop_data)

    def put(self, request, stop_id, format=None):
        agency_id = request.GET.get('agency_id', None)
        if not agency_id:
            return Response({"error": "Missing agency_id"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            stop = Stop.objects.get(stop_id=stop_id, agency_id=agency_id)
        except Stop.DoesNotExist:
            return Response({"error": "Stop not found"}, status=status.HTTP_404_NOT_FOUND)

        stop_name = request.data.get('stop_name', stop.stop_name)
        stop_lat = request.data.get('stop_lat', stop.stop_lat)
        stop_lon = request.data.get('stop_lon', stop.stop_lon)

        stop.stop_name = stop_name
        stop.stop_lat = stop_lat
        stop.stop_lon = stop_lon
        stop.save()


        stop_data = {
            "stop_id": stop.stop_id,
            "stop_name": stop.stop_name,
            "stop_lat": stop.stop_lat,
            "stop_lon": stop.stop_lon,
            "agency_id": stop.agency_id,
        }
        return Response(stop_data)

    def delete(self, request, stop_id, format=None):
        agency_id = request.GET.get('agency_id', None)
        if not agency_id:
            return Response({"error": "Missing agency_id"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            stop = Stop.objects.get(stop_id=stop_id, agency_id=agency_id)
        except Stop.DoesNotExist:
            return Response({"error": "Stop not found"}, status=status.HTTP_404_NOT_FOUND)

        stop.delete()
        return Response({"message": "Stop deleted successfully"}, status=status.HTTP_204_NO_CONTENT)


def nearest_stop(request):
    try:
        lat = float(request.GET.get('lat'))
        lon = float(request.GET.get('lon'))
    except (TypeError, ValueError):
        return JsonResponse({'error': 'Invalid latitude or longitude'}, status=400)

    agency_id = request.GET.get('agency_id', '1')


    stops = Stop.objects.filter(agency_id=agency_id)

    if not stops.exists():
        return JsonResponse({'error': 'No stops found for the specified agency'}, status=404)


    nearest, min_distance = None, float('inf')

    for stop in stops:
        distance = geodesic((lat, lon), (stop.stop_lat, stop.stop_lon)).meters


        if distance < min_distance:
            min_distance, nearest = distance, stop


    if nearest and min_distance <= THRESHOLD_METERS:
        return JsonResponse({
            "stop_id": nearest.stop_id,
            "name": nearest.stop_name,
            "stop_lat": nearest.stop_lat,
            "stop_lon": nearest.stop_lon,
            "agency_id": nearest.agency_id
        })

    return JsonResponse({'error': 'No nearby stops found'}, status=404)


class RouteListView(APIView):

    def get(self, request):
        agency_id = request.GET.get('agency_id', '1')
        routes_qs = Route.objects.filter(agency_id=agency_id)
        if routes_qs.exists():
            routes_data = [{
                "route_id": route.route_id,
                "agency_id": route.agency_id,
                "route_short_name": route.route_short_name,
                "route_long_name": route.route_long_name,
                "route_type": route.route_type
            } for route in routes_qs]
            return Response(routes_data, status=status.HTTP_200_OK)
        else:
            return Response({"error": "No routes found in the database"}, status=status.HTTP_404_NOT_FOUND)


class RouteDetailView(APIView):

    def get(self, request, route_id):
        agency_id = request.GET.get('agency_id', '1')
        try:
            route = Route.objects.get(route_id=route_id, agency_id=agency_id)
        except Route.DoesNotExist:
            return Response({"error": "Route not found"}, status=status.HTTP_404_NOT_FOUND)
        route_data = {
            "route_id": route.route_id,
            "agency_id": route.agency_id,
            "route_short_name": route.route_short_name,
            "route_long_name": route.route_long_name,
            "route_type": route.route_type
        }
        return Response(route_data, status=status.HTTP_200_OK)

    def put(self, request, route_id):
        agency_id = request.GET.get('agency_id', '1')
        try:
            route = Route.objects.get(route_id=route_id, agency_id=agency_id)
        except Route.DoesNotExist:
            return Response({"error": "Route not found"}, status=status.HTTP_404_NOT_FOUND)
        data = request.data
        route.route_short_name = data.get('route_short_name', route.route_short_name)
        route.route_long_name = data.get('route_long_name', route.route_long_name)
        route.route_type = data.get('route_type', route.route_type)
        route.save()
        updated_data = {
            "route_id": route.route_id,
            "agency_id": route.agency_id,
            "route_short_name": route.route_short_name,
            "route_long_name": route.route_long_name,
            "route_type": route.route_type
        }
        return Response(updated_data, status=status.HTTP_200_OK)

    def delete(self, request, route_id):
        agency_id = request.GET.get('agency_id', '1')
        try:
            route = Route.objects.get(route_id=route_id, agency_id=agency_id)
        except Route.DoesNotExist:
            return Response({"error": "Route not found"}, status=status.HTTP_404_NOT_FOUND)
        route.delete()
        return Response({"deleted": True}, status=status.HTTP_200_OK)


class TripListView(APIView):

    def get(self, request, route_id):
        agency_id = request.GET.get('agency_id', '1')
        trips_qs = Trip.objects.filter(route__route_id=route_id, agency_id=agency_id)
        if trips_qs.exists():
            trips_data = list(trips_qs.values())
            return Response(trips_data, status=status.HTTP_200_OK)
        else:
            return Response({"error": "No trips found in the database for this route"}, status=status.HTTP_404_NOT_FOUND)


class TripDetailView(APIView):

    def get(self, request, trip_id):
        agency_id = request.GET.get('agency_id', '1')
        try:
            trip = Trip.objects.get(trip_id=trip_id, agency_id=agency_id)
        except Trip.DoesNotExist:
            return Response({"error": "Trip not found"}, status=status.HTTP_404_NOT_FOUND)
        trip_data = {
            "trip_id": trip.trip_id,
            "route": trip.route.route_id,
            "agency_id": trip.agency_id,
            "trip_headsign": trip.trip_headsign,
            "shape_id": trip.shape_id
        }
        return Response(trip_data, status=status.HTTP_200_OK)

    def put(self, request, trip_id):
        agency_id = request.GET.get('agency_id', '1')
        try:
            trip = Trip.objects.get(trip_id=trip_id, agency_id=agency_id)
        except Trip.DoesNotExist:
            return Response({"error": "Trip not found"}, status=status.HTTP_404_NOT_FOUND)
        data = request.data
        trip.trip_headsign = data.get('trip_headsign', trip.trip_headsign)
        trip.shape_id = data.get('shape_id', trip.shape_id)
        trip.save()
        updated_data = {
            "trip_id": trip.trip_id,
            "route": trip.route.route_id,
            "agency_id": trip.agency_id,
            "trip_headsign": trip.trip_headsign,
            "shape_id": trip.shape_id
        }
        return Response(updated_data, status=status.HTTP_200_OK)

    def delete(self, request, trip_id):
        agency_id = request.GET.get('agency_id', '1')
        try:
            trip = Trip.objects.get(trip_id=trip_id, agency_id=agency_id)
        except Trip.DoesNotExist:
            return Response({"error": "Trip not found"}, status=status.HTTP_404_NOT_FOUND)
        trip.delete()
        return Response({"deleted": True}, status=status.HTTP_200_OK)


class ShapeView(APIView):

    def get(self, request, shape_id):
        agency_id = request.GET.get('agency_id', '1')
        try:
            shape_obj = Shape.objects.get(shape_id=shape_id, agency_id=agency_id)
        except Shape.DoesNotExist:
            return Response({"error": "Shape not found"}, status=status.HTTP_404_NOT_FOUND)
        shape_data = {
            "shape_id": shape_obj.shape_id,
            "trip": shape_obj.trip.trip_id,
            "agency_id": shape_obj.agency_id,
            "polyline": shape_obj.polyline
        }
        return Response(shape_data, status=status.HTTP_200_OK)


class ShapeDetailView(APIView):

    def put(self, request, shape_id):
        agency_id = request.GET.get('agency_id', '1')
        try:
            shape_obj = Shape.objects.get(shape_id=shape_id, agency_id=agency_id)
        except Shape.DoesNotExist:
            return Response({"error": "Shape not found"}, status=status.HTTP_404_NOT_FOUND)
        data = request.data
        shape_obj.polyline = data.get('polyline', shape_obj.polyline)
        shape_obj.save()
        updated_data = {
            "shape_id": shape_obj.shape_id,
            "trip": shape_obj.trip.trip_id,
            "agency_id": shape_obj.agency_id,
            "polyline": shape_obj.polyline
        }
        return Response(updated_data, status=status.HTTP_200_OK)

    def delete(self, request, shape_id):
        agency_id = request.GET.get('agency_id', '1')
        try:
            shape_obj = Shape.objects.get(shape_id=shape_id, agency_id=agency_id)
        except Shape.DoesNotExist:
            return Response({"error": "Shape not found"}, status=status.HTTP_404_NOT_FOUND)
        shape_obj.delete()
        return Response({"deleted": True}, status=status.HTTP_200_OK)


class GenerateRouteView(APIView):
    AVERAGE_SPEED_KMPH = 15
    NEAR_THRESHOLD_METERS = 100
    BUFFER_MINUTES = 10

    def get(self, request):
        starting_stop_id = request.GET.get('starting_stop_id')
        destination_stop_id = request.GET.get('destination_stop_id')
        route_type_param = request.GET.get('route_type')
        agency_id = request.GET.get('agency_id', '1')

        if not starting_stop_id or not destination_stop_id:
            return self.error_response(
                "Missing starting_stop_id or destination_stop_id",
                status.HTTP_400_BAD_REQUEST
            )

        try:
            # Convert provided route_type to an int for consistency
            route_type = int(route_type_param)
        except (ValueError, TypeError):
            return self.error_response(
                "Invalid route type provided",
                status.HTTP_400_BAD_REQUEST
            )

        starting_stop = self.get_stop(starting_stop_id, agency_id)
        destination_stop = self.get_stop(destination_stop_id, agency_id)

        if not starting_stop or not destination_stop:
            return self.error_response(
                "Invalid stop id or agency id provided",
                status.HTTP_400_BAD_REQUEST
            )

        # Iterate through trips matching the agency filter
        for trip in Trip.objects.filter(agency_id=agency_id):
            shape = self.get_shape(trip.shape_id, agency_id)
            if not shape:
                continue

            polyline = shape.polyline
            start_idx, dest_idx = self.get_indices(polyline, starting_stop, destination_stop)

            if start_idx is not None and dest_idx is not None and start_idx < dest_idx:
                # Attempt to use the trip's related route if available
                route = getattr(trip, 'route', None)
                if not route:
                    # Fall back to querying Route manually
                    route = Route.objects.filter(
                        route_id=trip.route_id,
                        agency_id=agency_id
                    ).first()
                # Ensure route exists and matches the expected route_type
                if not route or int(route.route_type) != route_type:
                    continue

                segment = polyline[start_idx:dest_idx + 1]
                total_distance = self.calculate_distance(segment)
                duration_minutes = total_distance / self.meters_per_minute() + self.BUFFER_MINUTES

                return Response({
                    "type": "direct",
                    "trip": {
                        "trip_id": trip.trip_id,
                        "route_id": trip.route_id,
                        "trip_headsign": trip.trip_headsign,
                    },
                    "route": {
                        "route_id": route.route_id,
                        "short_name": route.route_short_name,
                        "long_name": route.route_long_name,
                    },
                    "polyline": segment,
                    "distance": total_distance,
                    "duration": round(duration_minutes, 2),
                    "origin_coordinates": [starting_stop.stop_lat, starting_stop.stop_lon],
                    "destination_coordinates": [destination_stop.stop_lat, destination_stop.stop_lon],
                }, status=status.HTTP_200_OK)

        return self.error_response("Direct route doesn't exist", status.HTTP_404_NOT_FOUND)

    def get_stop(self, stop_id: str, agency_id: str):
        return Stop.objects.filter(stop_id=stop_id, agency_id=agency_id).first()

    def get_shape(self, shape_id: str, agency_id: str):
        if not shape_id:
            return None
        return Shape.objects.filter(shape_id=shape_id, agency_id=agency_id).first()

    def get_indices(self, polyline: list, start_stop, dest_stop):
        start_idx, dest_idx = None, None
        for i, point in enumerate(polyline):
            if start_idx is None and self.is_near(point, start_stop):
                start_idx = i
            if self.is_near(point, dest_stop):
                dest_idx = i
        return start_idx, dest_idx

    def calculate_distance(self, points: list):
        distance = 0
        for i in range(len(points) - 1):
            distance += geodesic(points[i], points[i + 1]).meters
        return distance

    def meters_per_minute(self):
        return (self.AVERAGE_SPEED_KMPH * 1000) / 60

    def is_near(self, shape_point, stop):
        return geodesic(shape_point, (stop.stop_lat, stop.stop_lon)).meters <= self.NEAR_THRESHOLD_METERS

    def error_response(self, message, status_code):
        return Response({"error": message}, status=status_code)


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
                'image': article.author.image.url if article.author and article.author.image else None
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



@csrf_exempt
def send_notification(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        token = data.get('token')

        if token:
            subscribe_token_to_topic(token, topic="allUsers")

            send_push_notification(token, 'Test Notification', 'Welcome! You are now subscribed.')

            return JsonResponse({'status': 'success'})
        else:
            return JsonResponse({'status': 'failure', 'message': 'Token is required'}, status=400)
    return JsonResponse({'status': 'failure', 'message': 'Invalid request method'}, status=400)


from firebase_admin import messaging



def leaderboard(request):
    if request.method == 'GET':
        User = get_user_model()
        users = User.objects.order_by('-total_points')[:5]
        users_data = []

        for index, user in enumerate(users, start=1):
            users_data.append({
                'id': user.id,
                'username': user.username,
                'total_points': user.total_points,
                'image': request.build_absolute_uri(user.image.url) if user.image else None,
                'rank': index,
                'total_routes': user.total_routes,
                'prize1': user.prize1,
            })

        current_user = request.user if request.user.is_authenticated else None
        if current_user:
            current_user_rank = (
                    User.objects.filter(total_points__gt=current_user.total_points).count() + 1
            )
            if current_user_rank > 5:
              users_data.append({
                'id': current_user.id,
                'username': current_user.username,
                'total_points': current_user.total_points,
                'image': request.build_absolute_uri(current_user.image.url) if current_user.image else None,
                'rank': current_user_rank,
              })

        return JsonResponse(users_data, safe=False)

def feedback(request):
    if request.method == 'GET':
        feedbacks = Contact.objects.order_by('-date')
        feedbacks_data = []
        for feedback in feedbacks:
            feedbacks_data.append({
                'id': feedback.id,
                'name': feedback.name,
                'email': feedback.email,
                'subject': feedback.subject,
                'message': feedback.content,
                'date': feedback.date,
            })
        return JsonResponse(feedbacks_data, safe=False)


@csrf_exempt
def feedback_details(request, contact_id):
    try:
        feedback = Contact.objects.get(id=contact_id)

        if request.method == "GET":
            feedback_data = {
                'id': feedback.id,
                'name': feedback.name,
                'email': feedback.email,
                'subject': feedback.subject,
                'message': feedback.content,
                'date': feedback.date,
            }
            return JsonResponse(feedback_data, safe=False)

        elif request.method == "DELETE":
            feedback.delete()
            return JsonResponse({'message': 'Feedback deleted successfully'}, status=200)

        else:
            return JsonResponse({'error': 'Method not allowed'}, status=405)

    except Contact.DoesNotExist:
        return JsonResponse({'error': 'Feedback not found'}, status=404)



TIMEOUT = 5

class FetchAllDataView(APIView):

    def get(self, request):
        agency_id = request.GET.get("agency_id", "1")
        results = {}


        routes_response = requests.get(
            f"{BASE_URL}/routes",
            headers={
                "Accept": "application/json",
                "X-API-KEY": API_KEY,
                "X-Agency-Id": agency_id,
            },
            timeout=TIMEOUT
        )
        if routes_response.status_code != 200:
            return Response({"error": "Failed to fetch routes from API"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        routes_data = routes_response.json()
        routes_created = 0
        for route in routes_data:
            obj, created = Route.objects.update_or_create(
                route_id=route["route_id"],
                agency_id=agency_id,
                defaults={
                    "route_short_name": route["route_short_name"],
                    "route_long_name": route["route_long_name"],
                    "route_type": route["route_type"],
                }
            )
            if created:
                routes_created += 1
        results["routes"] = {
            "fetched": len(routes_data),
            "created_or_updated": routes_created,
        }


        trips_response = requests.get(
            f"{BASE_URL}/trips",
            headers={
                "Accept": "application/json",
                "X-API-KEY": API_KEY,
                "X-Agency-Id": agency_id,
            },
            params={"agency_id": agency_id},
            timeout=TIMEOUT
        )
        if trips_response.status_code != 200:
            return Response({"error": "Failed to fetch trips from API"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        trips_data = trips_response.json()
        trips_created = 0
        shape_ids = set()
        for trip in trips_data:
            try:
                route_obj = Route.objects.get(route_id=trip["route_id"], agency_id=agency_id)
            except Route.DoesNotExist:
                continue
            trip_headsign = trip.get("trip_headsign", "Unknown")
            obj, created = Trip.objects.update_or_create(
                trip_id=trip["trip_id"],
                agency_id=agency_id,
                defaults={
                    "route": route_obj,
                    "trip_headsign": trip_headsign,
                    "shape_id": trip.get("shape_id", ""),
                }
            )
            if created:
                trips_created += 1
            if "shape_id" in trip and trip["shape_id"]:
                shape_ids.add(trip["shape_id"])
        results["trips"] = {
            "fetched": len(trips_data),
            "created_or_updated": trips_created,
        }


        shapes_created = 0
        for shape_id in shape_ids:
            if Shape.objects.filter(shape_id=shape_id, agency_id=agency_id).exists():
                continue

            trip_obj = Trip.objects.filter(shape_id=shape_id, agency_id=agency_id).first()
            if not trip_obj:
                continue

            shape_response = requests.get(
                f"{BASE_URL}/shapes",
                headers={
                    "Accept": "application/json",
                    "X-API-KEY": API_KEY,
                    "X-Agency-Id": agency_id,
                },
                params={"shape_id": shape_id},
                timeout=TIMEOUT
            )
            if shape_response.status_code != 200:
                continue
            shape_data = shape_response.json()
            if not shape_data:
                continue
            shape_data.sort(key=lambda x: x["shape_pt_sequence"])
            polyline = [[pt["shape_pt_lat"], pt["shape_pt_lon"]] for pt in shape_data]
            Shape.objects.create(
                shape_id=shape_id,
                agency_id=agency_id,
                polyline=polyline,
                trip=trip_obj
            )
            shapes_created += 1
        results["shapes"] = {
            "unique_shape_ids": len(shape_ids),
            "created": shapes_created,
        }

        return Response({"message": "Data fetched and saved", "results": results}, status=status.HTTP_200_OK)


@csrf_exempt
def stop_list(request):
    if request.method == 'GET':
        stops = list(Stop.objects.all().values())
        return JsonResponse(stops, safe=False)
    elif request.method == 'POST':
        data = json.loads(request.body)
        stop = Stop.objects.create(
            stop_id=data.get('stop_id'),
            agency_id=data.get('agency_id'),
            stop_name=data.get('stop_name'),
            stop_lat=data.get('stop_lat'),
            stop_lon=data.get('stop_lon')
        )
        return JsonResponse(model_to_dict(stop), status=201)
    else:
        return HttpResponseNotAllowed(['GET', 'POST'])


@csrf_exempt
def stop_detail(request, pk):
    try:
        stop = Stop.objects.get(pk=pk)
    except Stop.DoesNotExist:
        return JsonResponse({'error': 'Stop not found'}, status=404)

    if request.method == 'GET':
        return JsonResponse(model_to_dict(stop))
    elif request.method == 'PUT':
        data = json.loads(request.body)
        stop.stop_id = data.get('stop_id', stop.stop_id)
        stop.agency_id = data.get('agency_id', stop.agency_id)
        stop.stop_name = data.get('stop_name', stop.stop_name)
        stop.stop_lat = data.get('stop_lat', stop.stop_lat)
        stop.stop_lon = data.get('stop_lon', stop.stop_lon)
        stop.save()
        return JsonResponse(model_to_dict(stop))
    elif request.method == 'DELETE':
        stop.delete()
        return JsonResponse({'deleted': True})
    else:
        return HttpResponseNotAllowed(['GET', 'PUT', 'DELETE'])



@csrf_exempt
def route_list(request):
    if request.method == 'GET':
        routes = list(Route.objects.all().values())
        return JsonResponse(routes, safe=False)
    elif request.method == 'POST':
        data = json.loads(request.body)
        route = Route.objects.create(
            route_id=data.get('route_id'),
            agency_id=data.get('agency_id'),
            route_short_name=data.get('route_short_name'),
            route_long_name=data.get('route_long_name'),
            route_type=data.get('route_type')
        )
        return JsonResponse(model_to_dict(route), status=201)
    else:
        return HttpResponseNotAllowed(['GET', 'POST'])


@csrf_exempt
def route_detail(request, pk):
    try:
        route = Route.objects.get(pk=pk)
    except Route.DoesNotExist:
        return JsonResponse({'error': 'Route not found'}, status=404)

    if request.method == 'GET':
        return JsonResponse(model_to_dict(route))
    elif request.method == 'PUT':
        data = json.loads(request.body)
        route.route_id = data.get('route_id', route.route_id)
        route.agency_id = data.get('agency_id', route.agency_id)
        route.route_short_name = data.get('route_short_name', route.route_short_name)
        route.route_long_name = data.get('route_long_name', route.route_long_name)
        route.route_type = data.get('route_type', route.route_type)
        route.save()
        return JsonResponse(model_to_dict(route))
    elif request.method == 'DELETE':
        route.delete()
        return JsonResponse({'deleted': True})
    else:
        return HttpResponseNotAllowed(['GET', 'PUT', 'DELETE'])



@csrf_exempt
def trip_list(request):
    if request.method == 'GET':
        trips = list(Trip.objects.all().values())
        return JsonResponse(trips, safe=False)
    elif request.method == 'POST':
        data = json.loads(request.body)
        try:
            route = Route.objects.get(pk=data.get('route'))
        except Route.DoesNotExist:
            return JsonResponse({'error': 'Related route not found'}, status=400)
        trip = Trip.objects.create(
            trip_id=data.get('trip_id'),
            route=route,
            agency_id=data.get('agency_id'),
            trip_headsign=data.get('trip_headsign'),
            shape_id=data.get('shape_id')
        )
        return JsonResponse(model_to_dict(trip), status=201)
    else:
        return HttpResponseNotAllowed(['GET', 'POST'])


@csrf_exempt
def trip_detail(request, pk):
    try:
        trip = Trip.objects.get(pk=pk)
    except Trip.DoesNotExist:
        return JsonResponse({'error': 'Trip not found'}, status=404)

    if request.method == 'GET':
        return JsonResponse(model_to_dict(trip))
    elif request.method == 'PUT':
        data = json.loads(request.body)
        trip.trip_id = data.get('trip_id', trip.trip_id)
        if 'route' in data:
            try:
                trip.route = Route.objects.get(pk=data.get('route'))
            except Route.DoesNotExist:
                return JsonResponse({'error': 'Related route not found'}, status=400)
        trip.agency_id = data.get('agency_id', trip.agency_id)
        trip.trip_headsign = data.get('trip_headsign', trip.trip_headsign)
        trip.shape_id = data.get('shape_id', trip.shape_id)
        trip.save()
        return JsonResponse(model_to_dict(trip))
    elif request.method == 'DELETE':
        trip.delete()
        return JsonResponse({'deleted': True})
    else:
        return HttpResponseNotAllowed(['GET', 'PUT', 'DELETE'])



@csrf_exempt
def shape_list(request):
    if request.method == 'GET':
        shapes = list(Shape.objects.all().values())
        return JsonResponse(shapes, safe=False)
    elif request.method == 'POST':
        data = json.loads(request.body)
        try:
            trip = Trip.objects.get(pk=data.get('trip'))
        except Trip.DoesNotExist:
            return JsonResponse({'error': 'Related trip not found'}, status=400)
        shape = Shape.objects.create(
            shape_id=data.get('shape_id'),
            trip=trip,
            agency_id=data.get('agency_id'),
            polyline=data.get('polyline')
        )
        return JsonResponse(model_to_dict(shape), status=201)
    else:
        return HttpResponseNotAllowed(['GET', 'POST'])


@csrf_exempt
def shape_detail(request, pk):
    try:
        shape = Shape.objects.get(pk=pk)
    except Shape.DoesNotExist:
        return JsonResponse({'error': 'Shape not found'}, status=404)

    if request.method == 'GET':
        return JsonResponse(model_to_dict(shape))
    elif request.method == 'PUT':
        data = json.loads(request.body)
        shape.shape_id = data.get('shape_id', shape.shape_id)
        if 'trip' in data:
            try:
                shape.trip = Trip.objects.get(pk=data.get('trip'))
            except Trip.DoesNotExist:
                return JsonResponse({'error': 'Related trip not found'}, status=400)
        shape.agency_id = data.get('agency_id', shape.agency_id)
        shape.polyline = data.get('polyline', shape.polyline)
        shape.save()
        return JsonResponse(model_to_dict(shape))
    elif request.method == 'DELETE':
        shape.delete()
        return JsonResponse({'deleted': True})
    else:
        return HttpResponseNotAllowed(['GET', 'PUT', 'DELETE'])



@csrf_exempt
@login_required
def update_user_progress(request, routePoints):
    if request.method == "POST":
        try:
            print("User:", request.user)
            data = json.loads(request.body)
            user = request.user
            current_position = tuple(data.get("current_position", []))
            destination = tuple(data.get("destination", []))

            if not current_position or not destination:
                return JsonResponse({"error": "Invalid data"}, status=400)

            distance = geodesic(current_position, destination).meters
            print(f"Distance to destination: {distance} meters")

            if distance <= 500000:
                user.points = (user.points or 0) + routePoints
                user.total_routes = (user.total_routes or 0) + 1
                user.total_points = (user.total_points or 0) + routePoints
                user.save(update_fields=["points", "total_routes", "total_points"])

                return JsonResponse({
                    "message": "Points added",
                    "points": user.points,
                    "total_routes": user.total_routes,
                    "total_points": user.total_points
                })

            return JsonResponse({"message": "User not within range"}, status=200)

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

    return JsonResponse({"error": "Invalid request method"}, status=405)


@csrf_exempt
def rate_app(request, user_id, stars):
    if request.method == "POST":
        User = get_user_model()
        User= User.objects.get(pk=user_id)
        rating = Rating.objects.filter(user=User).first()
        if  rating:
            rating.stars= stars
            rating.save()
            return JsonResponse({"message": "Rating modified"}, status=200)
        else:
            Rating.objects.create(user=User, stars=stars)
            return JsonResponse({"message": "Rating added"}, status=200)
    else:
        return JsonResponse({"message": "Invalid request method"}, status=405)


def average_rating(request):
    if request.method == "GET":
        avg_rating = Rating.objects.aggregate(avg=Avg('stars'))
        if average_rating is not None:
            return JsonResponse({"average_rating": avg_rating}, safe=False)
        else:
            return JsonResponse({"error": "Failed to fetch rating"}, status=500)


def get_nearest_stop_ids(start_coords, destination_coords, agency_id):
    if agency_id:
        stops = Stop.objects.filter(agency_id=agency_id)
    starting_stop = None
    destination_stop = None
    min_start_distance = float('inf')
    min_dest_distance = float('inf')

    for stop in stops:
        d_start = geodesic(start_coords, (stop.stop_lat, stop.stop_lon)).meters
        if d_start < min_start_distance:
            min_start_distance = d_start
            starting_stop = stop

        d_dest = geodesic(destination_coords, (stop.stop_lat, stop.stop_lon)).meters
        if d_dest < min_dest_distance:
            min_dest_distance = d_dest
            destination_stop = stop

    return (
        starting_stop.stop_id if starting_stop else None,
        destination_stop.stop_id if destination_stop else None
    )

@csrf_exempt
def claim_reward(request, user_id, prize_number):
    User = get_user_model()
    user= User.objects.get(pk=user_id)
    if prize_number == 1:
        user.prize1 = True
        user.points = user.points - 1000
        user.save()
        return JsonResponse({"message": "Congratulations, you claimed the Premium Profile Image"}, status=200)
    elif prize_number == 2:
        user.prize2 = True
        user.points = user.points - 2500
        user.save()
        return JsonResponse({"message": "Congratulations, you claimed the Personalized Footer"}, status=200)
    elif prize_number == 3:
        user.prize3 = True
        user.points = user.points - 5000
        user.save()
        return JsonResponse({"message": "Congratulations, you claimed the third prize"}, status=200)
    else:
        return JsonResponse({"message": "An error occured"}, status=500)


API_URL = "https://router.huggingface.co/nebius/v1/chat/completions"
HEADERS = {"Authorization": "Bearer hf_yourtoken"}


def is_route_or_traffic_related(message):
    route_keywords = [
        "route", "traffic", "bus", "tram", "train", "public transport", "schedule", "directions",
        "metro", "stop", "station", "map", "how to get to", "how to get from", "how to get", "location", "time table",
        "commute", "carpool",
        "ridesharing", "transportation", "traffic jams", "congestion", "road", "toll", "bus stop",
        "train station", "public transport routes", "vehicle", "trip", "travel", "journey", "commuter", "get from",
        "get to", "far" , "far away", "routes"
    ]

    return any(keyword in message.lower() for keyword in route_keywords)


def is_ai_uncertain(ai_response):
    uncertainty_phrases = ["not sure", "I don't know", "can't help with that", "I'm not sure", "unable to answer",
                           "no answer", "I don’t have the answer"]

    return any(phrase in ai_response.lower() for phrase in uncertainty_phrases)


@csrf_exempt
def ai_chat(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            user_message = data.get("message", "").strip()

            print(f"Received message: {user_message}")

            if not user_message:
                print("Error: No message provided")
                return JsonResponse({"error": "No message provided"}, status=400)

            if not is_route_or_traffic_related(user_message):
                print("Error: Message is not route or traffic related")
                return JsonResponse({"error": "Only route and traffic related questions are allowed."}, status=400)

            payload = {
                "messages": [{"role": "user", "content": user_message}],
                "max_tokens": 500,
                "model": "deepseek-ai/DeepSeek-V3-0324-fast"
            }

            print(f"Payload sent to AI API: {payload}")

            response = requests.post(API_URL, headers=HEADERS, json=payload)

            print(f"AI API Response Status: {response.status_code}")
            print(f"AI API Response: {response.text}")

            if response.status_code == 200:
                ai_response = response.json().get("choices", [{}])[0].get("message", {}).get("content", "No response")

                if is_ai_uncertain(ai_response):
                    print("Error: AI is uncertain about the answer")
                    return JsonResponse({"error": "The AI can't help you with that"}, status=400)

                return JsonResponse({"response": ai_response})

            print("Error: AI API failed to respond properly")
            return JsonResponse({"error": "Failed to connect to AI API"}, status=500)

        except json.JSONDecodeError:
            print("Error: Invalid JSON format")
            return JsonResponse({"error": "Invalid JSON"}, status=400)

    print("Error: Only POST requests are allowed")
    return JsonResponse({"error": "Only POST requests allowed"}, status=405)

@csrf_exempt
def delete_report(request, report_id):
    if request.method == "DELETE":
        report = Report.objects.get(id=report_id)
        if report is not None:
            report.delete()
            return JsonResponse({"success": True})
        else:
            return JsonResponse({"success": False})