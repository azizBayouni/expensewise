#!/bin/bash

# This script automates the process of updating the ExpenseWise application on Unraid.
# It navigates to the application directory, pulls the latest code from Git,
# tears down the old Docker environment completely (including volumes and images),
# and then builds and starts a fresh one.

# Set the path to your application's docker-compose file
APP_PATH="/mnt/user/appdata/expensewise"

echo "Navigating to application directory: $APP_PATH"
cd "$APP_PATH" || { echo "Error: Failed to navigate to $APP_PATH. Please check the path."; exit 1; }

echo "----------------------------------------"
echo "Pulling latest changes from Git..."
echo "----------------------------------------"
git pull

echo "----------------------------------------"
echo "Stopping and removing old Docker setup..."
echo "This will remove containers, volumes, and images."
echo "----------------------------------------"
docker-compose down --volumes --rmi all

echo "----------------------------------------"
echo "Building and starting new Docker containers..."
echo "----------------------------------------"
docker-compose up --build -d

echo "----------------------------------------"
echo "Update complete!"
echo "----------------------------------------"
