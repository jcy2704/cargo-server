CREATE TABLE `clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`domain` varchar(255) NOT NULL,
	`apiKey` varchar(255) NOT NULL,
	`dbUrl` varchar(500) NOT NULL,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clients_id` PRIMARY KEY(`id`),
	CONSTRAINT `clients_domain_unique` UNIQUE(`domain`),
	CONSTRAINT `clients_apiKey_unique` UNIQUE(`apiKey`)
);
