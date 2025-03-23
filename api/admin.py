from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth import get_user_model
from .models import SavedRoute, Article, Accident, Comment, Contact
User = get_user_model()


admin.site.register(User)
admin.site.register(SavedRoute)
admin.site.register(Article)
admin.site.register(Accident)
admin.site.register(Comment)
admin.site.register(Contact)