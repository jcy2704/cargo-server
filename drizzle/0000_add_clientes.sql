CREATE TABLE `clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`domain` varchar(255) NOT NULL,
	`api_key` varchar(255) NOT NULL,
	`db_url` varchar(500) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clients_id` PRIMARY KEY(`id`),
	CONSTRAINT `clients_domain_unique` UNIQUE(`domain`),
	CONSTRAINT `clients_api_key_unique` UNIQUE(`api_key`)
);
