#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
cd "$ROOT_DIR"

OS_NAME=$(uname -s || echo unknown)
echo "Building CodeCollab compiler images (OS=$OS_NAME)"

build() {
  local path="$1" tag="$2"
  echo "-- Building $tag from $path"
  docker build -q -t "$tag" "$path"
}

build ./docker/compiler-node   codecollab-node:latest
build ./docker/compiler-python codecollab-python:latest
build ./docker/compiler-cpp    codecollab-cpp:latest
build ./docker/compiler-java   codecollab-java:latest

echo "\nBuilt images:"
docker images | grep -E "codecollab-(node|python|cpp|java)"

echo "Done."
