#!/bin/bash
cd /app/warframe-items

# Throttle connection. I just don't want this stuff to make my network lag.
tc qdisc add dev eth0 handle 1: ingress
tc filter add dev eth0 parent 1: protocol ip prio 50 u32 match ip src 0.0.0.0/0 police rate 1mbit burst 10k drop flowid :1
tc qdisc add dev eth0 root tbf rate 1mbit latency 25ms burst 10k

while : ; do
  # Run update function. This will only update files if necessary.
  npm run build

  # If files have changed, push updates to repo. From there, the ci pipeline will
  # handle the rest.
  if [[ ! -z $(git status --porcelain) ]]; then
    gh_token=$(cat /run/secrets/warframe-items-gh-token)
    date=`date "+%B %d %Y"`

    printf "Found new items - Pushing..."
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
    git commit -m "feat(items): Add new items for $date."

    # Push
    git push "https://nexus-ci:"$gh_token"@github.com/nexus-devs/warframe-items"
    printf "Changes have been pushed to git!\n"
  else
    printf "No new items.\n"
  fi

  sleep 600
done
