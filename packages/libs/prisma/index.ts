import { PrismaClient } from "@prisma/client"; // import PrismaClient from Prisma ORM

declare global {
  namespace globalThis {
    var prismadb: PrismaClient | undefined;
  }
};

const prismadb = global.prismadb || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.prismadb = prismadb;
}

export default prismadb;