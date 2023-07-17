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
  `datetime` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `name_index` (`name`),
  KEY `email_index` (`email`)
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
  PRIMARY KEY (`id`),
  --FOREIGN KEY (`creator_id`) REFERENCES `basedbase`.`users`(`id`),
  KEY `lookup_index` (`creator_id`),
  KEY `members_index` (`members`),
  KEY `datetime_index` (`datetime`)
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
  --FOREIGN KEY (`creator_id`) REFERENCES `basedbase`.`users`(`id`),
  --FOREIGN KEY (`sub_id`) REFERENCES `basedbase`.`subs`(`id`),
  KEY `sub_id_index` (`sub_id`),
  KEY `creator_id_index` (`creator_id`),
  KEY `datetime_index` (`datetime`),
  KEY `rating_index` (`rating`),
  FULLTEXT KEY `search_index` (`creator_name`,`sub_name`,`title`,`text`)
);

CREATE TABLE `basedbase`.`comments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `text` text DEFAULT NULL,
  `post_id` int DEFAULT NULL,
  `creator_id` int DEFAULT NULL,
  `creator_name` varchar(45) DEFAULT NULL,
  `rating` int DEFAULT NULL,
  `datetime` datetime DEFAULT NULL,
  `parent_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  --FOREIGN KEY (`creator_id`) REFERENCES `basedbase`.`users`(`id`),
  --FOREIGN KEY (`parent_id`) REFERENCES `basedbase`.`comments`(`id`), 
  --FOREIGN KEY (`post_id`) REFERENCES `basedbase`.`posts`(`id`), 
  KEY `post_id_index` (`post_id`),
  KEY `creator_id_index` (`creator_id`),
  KEY `parent_id_index` (`parent_id`),
  KEY `datetime_index` (`datetime`),
  KEY `rating_index` (`rating`)
);

CREATE TABLE `basedbase`.`ratings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `comment_id` int DEFAULT NULL,
  `post_id` int DEFAULT NULL,
  `rating` int DEFAULT NULL,
  `datetime` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  --FOREIGN KEY (`user_id`) REFERENCES `basedbase`.`users`(`id`),
  --FOREIGN KEY (`comment_id`) REFERENCES `basedbase`.`comments`(`id`),
  --FOREIGN KEY (`post_id`) REFERENCES `basedbase`.`posts`(`id`),
  KEY `user_id_index` (`user_id`),
  KEY `comment_id_index` (`comment_id`),
  KEY `post_id_index` (`post_id`),
  KEY `datetime_index` (`datetime`)
);

INSERT INTO `basedbase`.`users` (
  `id`,
  `name`,
  `email`,
  `password`,
  `subscribed`
)
VALUES (
  1,
  'admin',
  'admin@secret.com',
  'supersecret',
  '1,2'
);

INSERT INTO `basedbase`.`subs` (
  `id`,
  `name`,
  `description`,
  `sidebar`,
  `creator_id`,
  `creator_name`,
  `members`
)
VALUES (
  1,
  'todayiforgot',
  'What was that thing again?',
  'This is the place you always dreamed about where you can share all of the little bits of knowledge that changed your life for better or for worse or not at all.',
  1,
  'admin',
  1
);

INSERT INTO `basedbase`.`subs` (
  `id`,
  `name`,
  `description`,
  `sidebar`,
  `creator_id`,
  `creator_name`,
  `members`
)
VALUES (
  2,
  'inspirationalquotes',
  'Quotes from authors universally beloved.',
  'Here is where you can post your favorite quotes from your favorite authors, or your most hated authors, or your somewhat well liked authors, or your somewhat but not too well liked authors. The choice is yours.',
  1,
  'admin',
  1
);

ALTER USER 'root'@'%' IDENTIFIED WITH mysql_native_password BY 'secret';