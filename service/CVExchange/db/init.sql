CREATE TABLE `basedbase`.`comments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `text` text DEFAULT NULL,
  `post_id` int DEFAULT NULL,
  `creator_id` int DEFAULT NULL,
  `creator_name` varchar(45) DEFAULT NULL,
  `rating` int DEFAULT NULL,
  `datetime` datetime DEFAULT NULL,
  `parent_id` int DEFAULT NULL,
  PRIMARY KEY (`id`)
);

CREATE TABLE `basedbase`.`posts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(400) DEFAULT NULL,
  `text` text DEFAULT NULL,
  `sub_id` int DEFAULT NULL,
  `sub_name` varchar(45) DEFAULT NULL,
  `creator_id` int DEFAULT NULL,
  `creator_name` varchar(45) DEFAULT NULL,
  `rating` int DEFAULT NULL,
  `datetime` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  FULLTEXT KEY `search_index` (`creator_name`,`sub_name`,`title`,`text`)
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
  `profile_picture` varchar(250) DEFAULT NULL,
  `saved` text DEFAULT NULL,
  `note` varchar(250) DEFAULT NULL,
  `my_file` varchar(250) DEFAULT NULL,
  `subscribed` text DEFAULT NULL,
  PRIMARY KEY (`id`)
);

CREATE TABLE `basedbase`.`subs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(45) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `sidebar` text DEFAULT NULL,
  `creator_id` int DEFAULT NULL,
  `creator_name` varchar(45) DEFAULT NULL,
  `members` int DEFAULT NULL,
  `datetime` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
);