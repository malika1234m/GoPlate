// Adds the Charred Ribeye to an ALREADY-seeded demo-bistro. prisma/seed.mjs
// bails out when the restaurant exists, so new demo dishes need this instead.
// Idempotent: re-running only updates the model fields.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const NAME = "Charred Ribeye";
const MODEL_URL = "/demo/steak.glb";

const restaurant = await prisma.restaurant.findUnique({
  where: { slug: "demo-bistro" },
  include: { categories: true },
});
if (!restaurant) throw new Error("demo-bistro not found — run prisma/seed.mjs first.");

const mains = restaurant.categories.find((c) => c.name === "Mains");
if (!mains) throw new Error("No 'Mains' category on demo-bistro.");

const existing = await prisma.menuItem.findFirst({
  where: { restaurantId: restaurant.id, name: NAME },
});

if (existing) {
  await prisma.menuItem.update({
    where: { id: existing.id },
    data: { modelUrl: MODEL_URL, modelStatus: "READY" },
  });
  console.log(`updated: ${NAME}`);
} else {
  // Sits after the burger so Mains still reads sensibly.
  const burger = await prisma.menuItem.findFirst({
    where: { restaurantId: restaurant.id, name: "Fire-Grilled Burger" },
  });
  await prisma.menuItem.create({
    data: {
      name: NAME,
      description:
        "Grass-fed ribeye over open flame, rosemary butter, blistered vine tomatoes, crushed herb potatoes.",
      caption: "Rested ten minutes, always",
      price: 28,
      imageUrl: "/demo/steak.svg",
      sortOrder: (burger?.sortOrder ?? 2) + 1,
      categoryId: mains.id,
      restaurantId: restaurant.id,
      modelUrl: MODEL_URL,
      modelStatus: "READY",
    },
  });
  console.log(`created: ${NAME}`);
}

await prisma.$disconnect();
