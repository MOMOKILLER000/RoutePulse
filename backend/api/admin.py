from django.contrib import admin
from django.contrib.auth import get_user_model
from .models import (
    SavedRoute, Article, Accident, Comment, Contact, Report,
    PublicTransportRoute, Polution_Point, Daily_Tasks,
    Stop, Route, Trip, Shape, Rating, CO2_Points
)

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


# Custom filter for decibel ranges
class DecibelRangeFilter(admin.SimpleListFilter):
    title = 'decibel level'
    parameter_name = 'decibels_range'

    def lookups(self, request, model_admin):
        return [
            ('low', 'Under 55 dB'),
            ('moderate', '55-69 dB'),
            ('high', '70-84 dB'),
            ('very_high', '85 dB and above'),
        ]

    def queryset(self, request, queryset):
        if self.value() == 'low':
            return queryset.filter(decibels__lt=55)
        elif self.value() == 'moderate':
            return queryset.filter(decibels__gte=55, decibels__lt=70)
        elif self.value() == 'high':
            return queryset.filter(decibels__gte=70, decibels__lt=85)
        elif self.value() == 'very_high':
            return queryset.filter(decibels__gte=85)
        return queryset


@admin.register(Polution_Point)
class PolutionPointAdmin(admin.ModelAdmin):
    list_display = ('latitude', 'longitude', 'decibels', 'completed')
    list_filter = ('completed', DecibelRangeFilter)


# Register remaining models
admin.site.register(User)
admin.site.register(SavedRoute)
admin.site.register(Article)
admin.site.register(Accident)
admin.site.register(Comment)
admin.site.register(Contact)
admin.site.register(Report)
admin.site.register(Rating)
admin.site.register(PublicTransportRoute)
admin.site.register(Daily_Tasks)
admin.site.register(CO2_Points)