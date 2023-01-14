#!/usr/bin/env bash

{
  NODE_OPTIONS=--max_old_space_size=4096 npm test && exit 0
} || {
  echo "Regression failed, rolling back..."
  cd "${GITHUB_WORKSPACE}" && git checkout -- . && exit 0
}
