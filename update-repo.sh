#!/bin/bash

cd /var/nelsons_tools

behind='git remote update'

if [ ! -n behind ]
then
    echo "No Update needed!"
else
    echo "Updating Repo!"
    git pull
fi

chmod +x update-repo.sh