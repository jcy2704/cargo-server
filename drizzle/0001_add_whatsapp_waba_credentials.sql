ALTER TABLE `clients` ADD `whatsapp_enabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `clients` ADD `whatsapp_phone_number_id` varchar(255);--> statement-breakpoint
ALTER TABLE `clients` ADD `whatsapp_waba_id` varchar(255);--> statement-breakpoint
ALTER TABLE `clients` ADD `whatsapp_access_token` varchar(1024);