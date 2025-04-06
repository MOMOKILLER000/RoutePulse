from django.contrib import admin
from django.contrib.auth import get_user_model
from .models import SavedRoute, Article, Accident, Comment, Contact, Report, PublicTransportRoute
from .models import Stop, Route, Trip, Shape, Rating
User = get_user_model()

@admin.register(Route)
class RouteAdmin(admin.ModelAdmin):
    list_filter = ('agency_id', 'route_type')

@admin.register(Trip)
class TripAdmin(admin.ModelAdmin):
    list_filter = ('route', 'agency_id')

@admin.register(Shape)
class ShapeAdmin(admin.ModelAdmin):
    list_filter = ('agency_id', 'shape_id')

@admin.register(Stop)
class StopAdmin(admin.ModelAdmin):
    list_filter = ('agency_id', 'stop_id')


admin.site.register(User)
admin.site.register(SavedRoute)
admin.site.register(Article)
admin.site.register(Accident)
admin.site.register(Comment)
admin.site.register(Contact)
admin.site.register(Report)
admin.site.register(Rating)
admin.site.register(PublicTransportRoute)