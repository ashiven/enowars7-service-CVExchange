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
  KEY `lookup_index` (`post_id`,`creator_id`,`parent_id`)
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
  KEY `lookup_index` (`sub_id`,`creator_id`),
  FULLTEXT KEY `search_index` (`creator_name`,`sub_name`,`title`,`text`)
);

CREATE TABLE `basedbase`.`ratings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `comment_id` int DEFAULT NULL,
  `post_id` int DEFAULT NULL,
  `rating` int DEFAULT NULL,
  `datetime` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `lookup_index` (`user_id`,`comment_id`,`post_id`)
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
  PRIMARY KEY (`id`),
  KEY `lookup_index` (`name`,`email`)
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
  KEY `lookup_index` (`creator_id`)
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
  `members`,
  `datetime`
)
VALUES (
  1,
  'todayiforgot',
  'What was that thing again?',
  'This is the place you always dreamed about where you can share all of the little bits of knowledge that changed your life for better or for worse or not at all.',
  1,
  'admin',
  1,
  NOW()
);

INSERT INTO `basedbase`.`subs` (
  `id`,
  `name`,
  `description`,
  `sidebar`,
  `creator_id`,
  `creator_name`,
  `members`,
  `datetime`
)
VALUES (
  2,
  'inspirationalquotes',
  'Quotes from authors universally beloved.',
  'Here is where you can post your favorite quotes from your favorite authors, or your most hated authors, or your somewhat well liked authors, or your somewhat but not too well liked authors. The choice is yours.',
  1,
  'admin',
  1,
  NOW()
);