#!/bin/bash

while : 
do
    echo "Cleaning up users"
    mysql -h$MYSQL_HOST -u$MYSQL_USER -p$MYSQL_PASSWORD -e"USE $MYSQL_DB; DELETE FROM users WHERE datetime <= DATE_SUB(NOW(), INTERVAL 30 MINUTE);"
    echo "Cleaning up subexchanges"
    mysql -h$MYSQL_HOST -u$MYSQL_USER -p$MYSQL_PASSWORD -e"USE $MYSQL_DB; DELETE FROM subs WHERE datetime <= DATE_SUB(NOW(), INTERVAL 30 MINUTE);"
    echo "Cleaning up posts"
    mysql -h$MYSQL_HOST -u$MYSQL_USER -p$MYSQL_PASSWORD -e"USE $MYSQL_DB; DELETE FROM posts WHERE datetime <= DATE_SUB(NOW(), INTERVAL 30 MINUTE);"
    echo "Cleaning up comments"
    mysql -h$MYSQL_HOST -u$MYSQL_USER -p$MYSQL_PASSWORD -e"USE $MYSQL_DB; DELETE FROM comments WHERE datetime <= DATE_SUB(NOW(), INTERVAL 30 MINUTE);"
    echo "Cleaning up ratings"
    mysql -h$MYSQL_HOST -u$MYSQL_USER -p$MYSQL_PASSWORD -e"USE $MYSQL_DB; DELETE FROM ratings WHERE datetime <= DATE_SUB(NOW(), INTERVAL 30 MINUTE);"
    sleep 1m
done