-- CreateTable
CREATE TABLE "shop_profile" (
    "id" TEXT NOT NULL,
    "googleGeminiApiKey" TEXT,
    "settings" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shop_profile_pkey" PRIMARY KEY ("id")
);
