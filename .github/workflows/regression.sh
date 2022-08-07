#!/usr/bin/env bash

{
  npm test && exit 0
} || {
  echo "Regression failed, rolling back..."
  cd "${GITHUB_WORKSPACE}" && git checkout -- . && exit 0
}
