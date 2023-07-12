#!/bin/bash
cd ./checker && docker compose down -v 
cd ../service && docker compose down -v && docker compose up --build --force-recreate -d
sleep 10
cd ../checker && docker compose up --build --force-recreate -d
