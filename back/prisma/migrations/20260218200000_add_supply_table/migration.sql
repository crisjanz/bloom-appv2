-- CreateTable
CREATE TABLE "supplies" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT,
    "shop" INTEGER NOT NULL DEFAULT 0,
    "backShelf" INTEGER NOT NULL DEFAULT 0,
    "boxed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplies_pkey" PRIMARY KEY ("id")
);
