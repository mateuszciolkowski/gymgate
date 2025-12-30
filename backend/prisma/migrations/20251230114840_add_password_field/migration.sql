/*
  Warnings:

  - Added the required column `password` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable - add password field with default, then remove default
ALTER TABLE "users" ADD COLUMN "password" TEXT NOT NULL DEFAULT '$2b$10$defaultpasswordhashforexistingusers';
ALTER TABLE "users" ALTER COLUMN "password" DROP DEFAULT;
