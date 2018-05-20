#!/bin/bash
cd /app/warframe-items

while : ; do
  # Run update function. This will only update files if necessary.
  npm run watchdog

  # If files have changed, push updates to repo. From there, the ci pipeline will
  # handle the rest.
  if [[ ! -z $(git status --porcelain) ]]; then
    gh_token=$(cat /run/secrets/warframe-items-gh-token)
    date=`date +%Y-%m-%d`

    printf "* Found new items - Pushing..."
    git config --global user.email "apps@nexus-stats.com"
    git config --global user.name "nexus-ci"

    # Stash changes before reset
    git stash

    # Force pull
    git fetch --all
    git reset --hard origin/master

    # Stage changes
    git stash pop
    git add .
    git commit -m "fix: Add new items for $date."

    # Push
    git push "https://nexus-ci:"$gh_token"@github.com/nexus-devs/warframe-items"
    printf "* Changes have been pushed to git!\n"
  else
    printf "* No new items.\n"
  fi

  sleep 60
done
