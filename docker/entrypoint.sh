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

    echo '* Found new items - Pushing...'
    git config --global user.email "apps@nexus-stats.com"
    git config --global user.name "nexus-ci"
    git add .
    git commit -m "fix: Add new items for $date."
    git push 'https://nexus-ci:'$gh_token'@github.com/nexus-devs/warframe-items' staging 2>/dev/null
    # ^ /dev/null so the token won't be exposed in logs
    echo '* Changes have been pushed to git!\n'
  else
    echo '* No new items.\n'
  fi

  sleep 60
done
