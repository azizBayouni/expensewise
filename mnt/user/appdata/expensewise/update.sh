#!/bin/bash

# This script automates the process of updating the ExpenseWise application on Unraid.
# It navigates to the application directory, stops the running Docker environment,
# forcefully resets any local changes, pulls the latest code from Git, 
# and then builds and starts a fresh environment.

# Set the path to your application's docker-compose file
APP_PATH="/mnt/user/appdata/expensewise"

echo "Navigating to application directory: $APP_PATH"
cd "$APP_PATH" || { echo "Error: Failed to navigate to $APP_PATH. Please check the path."; exit 1; }

echo "----------------------------------------"
echo "Stopping existing Docker containers..."
echo "----------------------------------------"
docker-compose down

echo "----------------------------------------"
echo "Forcefully resetting any local changes..."
echo "----------------------------------------"
git reset --hard HEAD

echo "----------------------------------------"
echo "Pulling latest changes from Git..."
echo "----------------------------------------"
git pull

echo "----------------------------------------"
echo "Building and starting new Docker containers..."
echo "This will remove old containers and images if necessary."
echo "----------------------------------------"
docker-compose up --build --remove-orphans -d

echo "----------------------------------------"
echo "Update complete!"
echo "----------------------------------------"
