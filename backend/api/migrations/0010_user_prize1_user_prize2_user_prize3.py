# Generated by Django 5.1.7 on 2025-04-02 17:43

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0009_publictransportroute_agency_id'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='prize1',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='user',
            name='prize2',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='user',
            name='prize3',
            field=models.BooleanField(default=False),
        ),
    ]
