#!/bin/bash

while true; do
    mysql -psecret -e"USE basedbase; DELETE FROM users WHERE datetime <= DATE_SUB(NOW(), INTERVAL 30 MINUTE);"
    mysql -psecret -e"USE basedbase; DELETE FROM subs WHERE datetime <= DATE_SUB(NOW(), INTERVAL 30 MINUTE);"
    mysql -psecret -e"USE basedbase; DELETE FROM posts WHERE datetime <= DATE_SUB(NOW(), INTERVAL 30 MINUTE);"
    mysql -psecret -e"USE basedbase; DELETE FROM comments WHERE datetime <= DATE_SUB(NOW(), INTERVAL 30 MINUTE);"
    mysql -psecret -e"USE basedbase; DELETE FROM ratings WHERE datetime <= DATE_SUB(NOW(), INTERVAL 30 MINUTE);"
    sleep 1m
done