CREATE TABLE `companyInfo` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyName` varchar(255) NOT NULL,
	`address` text,
	`phone` varchar(20),
	`email` varchar(255),
	`website` varchar(255),
	`taxId` varchar(64),
	`bankAccount` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `companyInfo_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `operationLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`operationType` varchar(64) NOT NULL,
	`description` text,
	`resourceId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `operationLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productCode` varchar(64) NOT NULL,
	`productName` varchar(255) NOT NULL,
	`description` text,
	`imageUrl` text,
	`retailPrice` int NOT NULL,
	`smallBPrice` int NOT NULL,
	`largeBPrice` int NOT NULL,
	`bulkPrice` int NOT NULL,
	`cheapPrice` int NOT NULL,
	`length` decimal(10,2),
	`width` decimal(10,2),
	`height` decimal(10,2),
	`pcsPerCarton` int,
	`unitWeight` decimal(10,2),
	`unitVolume` decimal(10,4),
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_productCode_unique` UNIQUE(`productCode`)
);
--> statement-breakpoint
CREATE TABLE `quotationExports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`quotationId` int,
	`fileName` varchar(255) NOT NULL,
	`exportData` text,
	`exportedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quotationExports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quotationItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quotationId` int NOT NULL,
	`productId` int NOT NULL,
	`productCode` varchar(64) NOT NULL,
	`productName` varchar(255) NOT NULL,
	`imageUrl` text,
	`quantity` int NOT NULL,
	`unitPrice` int NOT NULL,
	`subtotal` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quotationItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quotationTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`templateName` varchar(255) NOT NULL,
	`description` text,
	`companyHeader` text,
	`columnConfig` text,
	`footer` text,
	`isDefault` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quotationTemplates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quotations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quotationNumber` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`customerLevel` enum('retail','smallB','largeB','bulk','cheap') NOT NULL,
	`totalAmount` int NOT NULL,
	`itemCount` int NOT NULL,
	`status` enum('draft','sent','accepted','rejected') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quotations_id` PRIMARY KEY(`id`),
	CONSTRAINT `quotations_quotationNumber_unique` UNIQUE(`quotationNumber`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `status` enum('active','disabled') DEFAULT 'active' NOT NULL;