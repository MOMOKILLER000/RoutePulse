# Generated by Django 5.1.7 on 2025-03-30 14:01

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0003_rename_name_stop_stop_name'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='total_routes',
            field=models.PositiveIntegerField(default=0),
        ),
    ]
