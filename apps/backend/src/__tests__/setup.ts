/**
 * Test Setup
 * 
 * Configures test environment before running tests
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Clean up database after all tests
afterAll(async () => {
  await prisma.$disconnect();
});

// Set test timeout
jest.setTimeout(30000);

