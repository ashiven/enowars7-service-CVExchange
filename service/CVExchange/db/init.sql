CREATE TABLE `basedbase`.`comments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `text` varchar(500) DEFAULT NULL,
  `post_id` int DEFAULT NULL,
  `creator_id` int DEFAULT NULL,
  `creator_name` varchar(45) DEFAULT NULL,
  `rating` int DEFAULT NULL,
  `datetime` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
);

CREATE TABLE `basedbase`.`posts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(400) DEFAULT NULL,
  `text` varchar(4000) DEFAULT NULL,
  `creator_id` int DEFAULT NULL,
  `creator_name` varchar(45) DEFAULT NULL,
  `rating` int DEFAULT NULL,
  `datetime` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
);

CREATE TABLE `basedbase`.`ratings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `comment_id` int DEFAULT NULL,
  `post_id` int DEFAULT NULL,
  `rating` int DEFAULT NULL,
  `datetime` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
);

CREATE TABLE `basedbase`.`users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(45) DEFAULT NULL,
  `email` varchar(45) DEFAULT NULL,
  `password` varchar(45) DEFAULT NULL,
  `profile_picture` varchar(45) DEFAULT NULL,
  PRIMARY KEY (`id`)
);
