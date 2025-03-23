from django.db import models
from django.conf import settings
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, UserManager, Group, Permission
from django.utils import timezone
class CustomUserManager(UserManager):
    def create_user(self, email=None, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', False)
        extra_fields.setdefault('is_superuser', False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email=None, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self._create_user(email, password, **extra_fields)  

    def _create_user(self, email, password=None, **extra_fields):
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user


class User(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(default='', unique=True)
    first_name = models.CharField(max_length=255, default='')
    last_name = models.CharField(max_length=255, default='')
    username = models.CharField(max_length=255, default='', unique=True)
    is_active = models.BooleanField(default=True)
    is_superuser = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)

    date_joined = models.DateTimeField(default=timezone.now)
    last_login = models.DateTimeField(blank=True, null=True)
    notifications = models.BooleanField(default=False)
    image = models.ImageField(upload_to='user_images/', blank=True, null=True)
    PREFERRED_TRANSPORT = [
        ('None', 'None'),
        ('Bus', 'Bus'),
        ('Car', 'Car'),
        ( 'Tram', 'Tram'),
    ]
    preferred_transport = models.CharField(max_length=255, choices=PREFERRED_TRANSPORT, default='None')
    points = models.PositiveIntegerField(default=0)
    popularity = models.PositiveIntegerField(default=0)
    instagram = models.CharField(max_length=255, default='', blank=True)
    facebook = models.CharField(max_length=255, default='', blank=True)
    tiktok = models.CharField(max_length=255, default='', blank=True)
    github = models.CharField(max_length=255, default='', blank=True)
    face_image = models.ImageField(upload_to='user_faces/', blank=True, null=True)
    groups = models.ManyToManyField(Group, related_name="custom_user_set", blank=True)
    user_permissions = models.ManyToManyField(Permission, related_name="custom_user_permissions_set", blank=True)

    objects = CustomUserManager()

    USERNAME_FIELD = 'email'
    EMAIL_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'
    
    def get_full_name(self):
        return f"{self.first_name} {self.last_name}"
    
    def get_short_name(self):
        return self.first_name or self.email.split('@')[0]

class SavedRoute(models.Model):
    user = models.ForeignKey(User, related_name="saved_routes", on_delete=models.CASCADE)
    origin = models.CharField(max_length=255)
    destination = models.CharField(max_length=255)
    origin_coordinates = models.JSONField(default=dict)
    destination_coordinates = models.JSONField(default=dict)
    polyline = models.TextField()
    duration = models.IntegerField(null=True, blank=True)
    distance = models.IntegerField(null=True, blank=True)
    cost = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    def __str__(self):
        return f"Route from {self.origin} to {self.destination} for {self.user.username}"

class Article(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(max_length=500, blank=True)
    image = models.ImageField(upload_to='article_images/', blank=True, null=True)
    content = models.TextField()
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    popularity = models.IntegerField(default=0)
    liked_by = models.ManyToManyField(User, related_name="liked_articles", blank=True)
    disliked_by = models.ManyToManyField(User, related_name="disliked_articles", blank=True)

class Report(models.Model):
    title = models.CharField(max_length=255)
    image = models.ImageField(upload_to='report_images/', blank=True, null=True)
    content = models.TextField()
    address = models.CharField(max_length=255)


class Comment(models.Model):
    article = models.ForeignKey(Article, on_delete=models.CASCADE)
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    pub_date = models.DateTimeField(auto_now_add=True)

    def can_delete(self, request_user):
        return request_user == self.user or request_user.is_superuser

    def __str__(self):
        return f"{self.author} - {self.pub_date}"

class Accident(models.Model):
    PROBLEM_CHOICES = [
        ('accident', 'Accident'),
        ('roadInProgress', 'Road in Progress'),
        ('blockage', 'Road Blockage'),
        ('weatherConditions', 'Weather Conditions'),
    ]

    city = models.CharField(max_length=100, null=True, blank=True)
    street = models.CharField(max_length=255, default='', null=True)
    date = models.DateField()
    time = models.TimeField()
    problem_type = models.CharField(max_length=50, choices=PROBLEM_CHOICES, default='accident')
    details = models.TextField()
    contact_info = models.CharField(max_length=255, null=True, blank=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)

    def __str__(self):
        return f"Accident at {self.city} on {self.date} at {self.time}"

class Contact(models.Model):
    name = models.CharField(max_length=100)
    email = models.CharField(max_length=100)
    subject = models.CharField(max_length=30)
    content = models.TextField()
    date = models.DateField()
