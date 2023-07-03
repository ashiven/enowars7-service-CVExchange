#!/bin/bash
cd ./checker && docker compose up --build --force-recreate -d
sleep 5
cd ../service && docker compose down -v && docker compose up --build --force-recreate -d
sleep 100
docker compose up --build --force-recreate -d