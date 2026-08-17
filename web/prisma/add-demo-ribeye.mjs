// Adds the Charred Ribeye to an ALREADY-seeded demo-bistro. prisma/seed.mjs
// bails out when the restaurant exists, so new demo dishes need this instead.
// Idempotent: re-running only updates the model fields.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const NAME = "Charred Ribeye";
const MODEL_URL = "/demo/steak.glb";
const IMAGE_URL = "/demo/steak.webp";

const restaurant = await prisma.restaurant.findUnique({
  where: { slug: "demo-bistro" },
  include: { categories: true },
});
if (!restaurant) throw new Error("demo-bistro not found — run prisma/seed.mjs first.");

const mains = restaurant.categories.find((c) => c.name === "Mains");
if (!mains) throw new Error("No 'Mains' category on demo-bistro.");

// First in Mains: it is the only dish with a real 3D model, so it should be the
// first thing a visitor meets. Items sort by sortOrder ascending, so one below
// the current minimum wins without having to renumber every other dish.
const others = await prisma.menuItem.findMany({
  where: { categoryId: mains.id, name: { not: NAME } },
  select: { sortOrder: true },
});
const topSortOrder = Math.min(0, ...others.map((i) => i.sortOrder)) - 1;

const existing = await prisma.menuItem.findFirst({
  where: { restaurantId: restaurant.id, name: NAME },
});

if (existing) {
  await prisma.menuItem.update({
    where: { id: existing.id },
    data: {
      modelUrl: MODEL_URL,
      modelStatus: "READY",
      sortOrder: topSortOrder,
      // Also re-pointed here, not only on create: databases seeded before the
      // real plate photo existed still carry the placeholder SVG.
      imageUrl: IMAGE_URL,
    },
  });
  console.log(`updated: ${NAME} (sortOrder ${topSortOrder})`);
} else {
  await prisma.menuItem.create({
    data: {
      name: NAME,
      description:
        "Grass-fed ribeye over open flame, rosemary butter, blistered vine tomatoes, crushed herb potatoes.",
      caption: "Rested ten minutes, always",
      price: 28,
      imageUrl: IMAGE_URL,
      sortOrder: topSortOrder,
      categoryId: mains.id,
      restaurantId: restaurant.id,
      modelUrl: MODEL_URL,
      modelStatus: "READY",
    },
  });
  console.log(`created: ${NAME} (sortOrder ${topSortOrder})`);
}

await prisma.$disconnect();
