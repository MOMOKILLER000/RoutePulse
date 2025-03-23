import os
import subprocess
from django.core.management.base import BaseCommand
from django.conf import settings

class Command(BaseCommand):
    help = 'Builds the React app and collects static files'

    def handle(self, *args, **options):
        # Step 1: Run the React build command
        frontend_dir = os.path.join(settings.BASE_DIR, '..', 'frontend')  # Adjust path
        npm_path = r"C:\Program Files\nodejs\npm.cmd"  # Explicitly use npm.cmd for Windows
        build_command = [npm_path, 'run', 'build']

        try:
            self.stdout.write(self.style.SUCCESS('Running npm run build...'))
            subprocess.run(build_command, cwd=frontend_dir, check=True, shell=True)
            self.stdout.write(self.style.SUCCESS('React build successful!'))
        except subprocess.CalledProcessError:
            self.stdout.write(self.style.ERROR('React build failed.'))
            return
        except FileNotFoundError:
            self.stdout.write(self.style.ERROR('npm not found, check your path!'))
            return

        # Step 2: Run the collectstatic command
        self.stdout.write(self.style.SUCCESS('Running collectstatic...'))
        subprocess.run(['python', 'manage.py', 'collectstatic', '--noinput'], check=True, shell=True)
        self.stdout.write(self.style.SUCCESS('Static files collected successfully!'))
