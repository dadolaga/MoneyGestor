CREATE TABLE IF NOT EXISTS `__EFMigrationsHistory` (
    `MigrationId` varchar(150) NOT NULL,
    `ProductVersion` varchar(32) NOT NULL,
    PRIMARY KEY (`MigrationId`)
);

START TRANSACTION;

CREATE TABLE `user` (
    `Id` bigint unsigned NOT NULL AUTO_INCREMENT,
    `Firstname` longtext NOT NULL,
    `Lastname` longtext NOT NULL,
    `Email` varchar(255) NOT NULL,
    `Username` varchar(255) NOT NULL,
    `Password` longtext NOT NULL,
    PRIMARY KEY (`Id`)
);

CREATE TABLE `color` (
    `Id` bigint unsigned NOT NULL AUTO_INCREMENT,
    `Name` varchar(255) NULL,
    `Value` int unsigned NOT NULL,
    `UserId` bigint unsigned NULL,
    PRIMARY KEY (`Id`),
    CONSTRAINT `FK_color_user_UserId` FOREIGN KEY (`UserId`) REFERENCES `user` (`Id`) ON DELETE CASCADE
);

CREATE TABLE `login` (
    `Id` bigint unsigned NOT NULL AUTO_INCREMENT,
    `Token` varchar(255) NOT NULL,
    `IsLong` tinyint(1) NOT NULL,
    `Expirated` datetime(6) NOT NULL,
    `UserId` bigint unsigned NOT NULL,
    PRIMARY KEY (`Id`),
    CONSTRAINT `FK_login_user_UserId` FOREIGN KEY (`UserId`) REFERENCES `user` (`Id`) ON DELETE CASCADE
);

CREATE TABLE `transaction_type` (
    `Id` bigint unsigned NOT NULL AUTO_INCREMENT,
    `Name` varchar(255) NOT NULL,
    `UserId` bigint unsigned NULL,
    PRIMARY KEY (`Id`),
    CONSTRAINT `FK_transaction_type_user_UserId` FOREIGN KEY (`UserId`) REFERENCES `user` (`Id`) ON DELETE CASCADE
);

CREATE TABLE `wallet` (
    `Id` bigint unsigned NOT NULL AUTO_INCREMENT,
    `Name` varchar(255) NOT NULL,
    `Value` double NOT NULL,
    `CurrentValue` double NOT NULL,
    `Favorite` tinyint(1) NOT NULL,
    `ColorId` bigint unsigned NOT NULL,
    `UserId` bigint unsigned NOT NULL,
    PRIMARY KEY (`Id`),
    CONSTRAINT `FK_wallet_color_ColorId` FOREIGN KEY (`ColorId`) REFERENCES `color` (`Id`) ON DELETE RESTRICT,
    CONSTRAINT `FK_wallet_user_UserId` FOREIGN KEY (`UserId`) REFERENCES `user` (`Id`) ON DELETE RESTRICT
);

CREATE TABLE `transaction` (
    `Id` bigint unsigned NOT NULL AUTO_INCREMENT,
    `Description` longtext NULL,
    `LongDescription` longtext NULL,
    `Date` datetime(6) NOT NULL,
    `TransactionTypeId` bigint unsigned NOT NULL,
    `UserId` bigint unsigned NOT NULL,
    `UserInsertId` bigint unsigned NOT NULL,
    `WalletId` bigint unsigned NOT NULL,
    `Value` double NOT NULL,
    `TransactionDestinationId` bigint unsigned NULL,
    PRIMARY KEY (`Id`),
    CONSTRAINT `FK_transaction_transaction_TransactionDestinationId` FOREIGN KEY (`TransactionDestinationId`) REFERENCES `transaction` (`Id`) ON DELETE SET NULL,
    CONSTRAINT `FK_transaction_transaction_type_TransactionTypeId` FOREIGN KEY (`TransactionTypeId`) REFERENCES `transaction_type` (`Id`) ON DELETE RESTRICT,
    CONSTRAINT `FK_transaction_user_UserId` FOREIGN KEY (`UserId`) REFERENCES `user` (`Id`) ON DELETE RESTRICT,
    CONSTRAINT `FK_transaction_user_UserInsertId` FOREIGN KEY (`UserInsertId`) REFERENCES `user` (`Id`) ON DELETE RESTRICT,
    CONSTRAINT `FK_transaction_wallet_WalletId` FOREIGN KEY (`WalletId`) REFERENCES `wallet` (`Id`) ON DELETE RESTRICT
);

CREATE INDEX `IX_color_Id` ON `color` (`Id`);

CREATE UNIQUE INDEX `IX_color_Name_Value_UserId` ON `color` (`Name`, `Value`, `UserId`);

CREATE INDEX `IX_color_UserId` ON `color` (`UserId`);

CREATE INDEX `IX_login_Id` ON `login` (`Id`);

CREATE UNIQUE INDEX `IX_login_Token` ON `login` (`Token`);

CREATE INDEX `IX_login_UserId` ON `login` (`UserId`);

CREATE INDEX `IX_transaction_Id` ON `transaction` (`Id`);

CREATE UNIQUE INDEX `IX_transaction_TransactionDestinationId` ON `transaction` (`TransactionDestinationId`);

CREATE INDEX `IX_transaction_TransactionTypeId` ON `transaction` (`TransactionTypeId`);

CREATE INDEX `IX_transaction_UserId` ON `transaction` (`UserId`);

CREATE INDEX `IX_transaction_UserInsertId` ON `transaction` (`UserInsertId`);

CREATE INDEX `IX_transaction_WalletId` ON `transaction` (`WalletId`);

CREATE UNIQUE INDEX `IX_transaction_type_UserId_Name` ON `transaction_type` (`UserId`, `Name`);

CREATE UNIQUE INDEX `IX_user_Email` ON `user` (`Email`);

CREATE UNIQUE INDEX `IX_user_Username` ON `user` (`Username`);

CREATE INDEX `IX_wallet_ColorId` ON `wallet` (`ColorId`);

CREATE INDEX `IX_wallet_Id` ON `wallet` (`Id`);

CREATE UNIQUE INDEX `IX_wallet_Name_UserId` ON `wallet` (`Name`, `UserId`);

CREATE INDEX `IX_wallet_UserId` ON `wallet` (`UserId`);

INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20260924185824_CreateLegacySchema', '8.0.20');

COMMIT;

