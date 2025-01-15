#!/bin/bash

cd /var/nelsons_tools
echo "Updating Nelsons-Tools!"
git pull
echo "Copying to crontab hourly"
cp update-repo.sh /etc/periodic/hourly