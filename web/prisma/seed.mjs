// Seeds a demo restaurant so /r/demo-bistro works immediately.
// Run with: node prisma/seed.mjs
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// A public sample GLB so the 3D viewer can be demonstrated without an API key.
const AVOCADO_GLB =
  "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/Avocado/glTF-Binary/Avocado.glb";

// A real Meshy-generated dish — what an owner actually gets from filming a
// plate, unlike the Khronos sample above. Draco geometry + WebP textures took
// it from 43 MB out of Meshy to 2.7 MB, with no visible difference on screen.
const RIBEYE_GLB = "/demo/steak.glb";

async function main() {
  const existing = await prisma.restaurant.findUnique({
    where: { slug: "demo-bistro" },
  });
  if (existing) {
    console.log("Demo restaurant already seeded — skipping.");
    return;
  }

  const owner = await prisma.user.upsert({
    where: { email: "demo@plate3d.app" },
    update: {},
    create: {
      email: "demo@plate3d.app",
      name: "Malika",
      passwordHash: await bcrypt.hash("demo1234", 10),
      plan: "pro",
    },
  });

  const restaurant = await prisma.restaurant.create({
    data: {
      slug: "demo-bistro",
      name: "The Copper Kettle",
      description: "Slow food, open fire, and plates worth turning around.",
      caption: "Plates worth turning around",
      address: "12 Market Lane",
      phone: "+1 (555) 010-2030",
      currency: "USD",
      accentColor: "#f0762e",
      theme: "midnight",
      layout: "list",
      showReel: true,
      ownerId: owner.id,
    },
  });

  const cats = {};
  for (const [i, name] of ["Starters", "Mains", "Desserts", "Drinks"].entries()) {
    cats[name] = await prisma.category.create({
      data: { name, sortOrder: i, restaurantId: restaurant.id },
    });
  }

  const items = [
    ["Starters", "Smashed Guacamole", "Hand-crushed avocado, charred lime, smoked chili flakes, warm tortilla chips.", 8.5, "/demo/guac.svg", { modelUrl: AVOCADO_GLB, modelStatus: "READY", storyVideoUrl: "/demo/story-guac.mp4" }, { caption: "Crushed to order, never before", isVegetarian: true }],
    ["Starters", "Garden Salad", "Heirloom tomatoes, cucumber ribbons, toasted seeds, herb vinaigrette.", 7.0, "/demo/salad.svg", {}, { caption: "Picked this morning", isVegetarian: true }],
    ["Mains", "Fire-Grilled Burger", "Dry-aged beef, smoked cheddar, burnt-onion mayo, brioche from our oven.", 15.0, "/demo/burger.svg", { storyVideoUrl: "/demo/story-burger.mp4" }, { caption: "Our signature since day one" }],
    ["Mains", "Charred Ribeye", "Grass-fed ribeye over open flame, rosemary butter, blistered vine tomatoes, crushed herb potatoes.", 28.0, "/demo/steak.svg", { modelUrl: RIBEYE_GLB, modelStatus: "READY" }, { caption: "Rested ten minutes, always" }],
    ["Mains", "Wood-Oven Margherita", "San Marzano tomatoes, fior di latte, basil picked this morning.", 13.5, "/demo/pizza.svg", {}, { caption: "90 seconds at 450 degrees", isVegetarian: true }],
    ["Mains", "Midnight Curry", "Slow-simmered coconut curry, charred peppers, jasmine rice.", 14.0, "/demo/curry.svg", { storyVideoUrl: "/demo/story-curry.mp4" }, { caption: "The late-night legend", isSpicy: true }],
    ["Mains", "Cacio e Pepe", "Tonnarelli, aged pecorino, cracked Sarawak pepper. Four ingredients, no shortcuts.", 12.5, "/demo/pasta.svg", {}, { caption: "Four ingredients, no shortcuts", isVegetarian: true }],
    ["Desserts", "Tiramisu della Casa", "Espresso-soaked savoiardi, mascarpone cloud, bitter cocoa.", 7.5, "/demo/tiramisu.svg", {}, { caption: "Nonna approved", isVegetarian: true }],
    ["Drinks", "Charred-Lemon Lemonade", "Grilled lemons, raw honey, sparkling water, fresh thyme.", 4.5, "/demo/lemonade.svg", {}, { caption: "Smoke meets citrus", isVegetarian: true }],
  ];

  const created = {};
  for (const [i, [cat, name, description, price, imageUrl, model, flags]] of items.entries()) {
    created[name] = await prisma.menuItem.create({
      data: {
        name,
        description,
        price,
        imageUrl,
        sortOrder: i,
        categoryId: cats[cat].id,
        restaurantId: restaurant.id,
        ...model,
        ...flags,
      },
    });
  }

  // Serving window + modifier demos
  await prisma.category.update({
    where: { id: cats["Mains"].id },
    data: { availableFrom: "11:00", availableTo: "23:00" },
  });
  await prisma.modifierGroup.create({
    data: {
      name: "Size", type: "single", required: true, sortOrder: 0,
      itemId: created["Fire-Grilled Burger"].id,
      options: { create: [
        { name: "Single", priceDelta: 0, sortOrder: 0 },
        { name: "Double", priceDelta: 4, sortOrder: 1 },
      ] },
    },
  });
  await prisma.modifierGroup.create({
    data: {
      name: "Add-ons", type: "multi", required: false, sortOrder: 1,
      itemId: created["Fire-Grilled Burger"].id,
      options: { create: [
        { name: "Smoked bacon", priceDelta: 2, sortOrder: 0 },
        { name: "Extra cheese", priceDelta: 1.5, sortOrder: 1 },
        { name: "Fried egg", priceDelta: 1.75, sortOrder: 2 },
      ] },
    },
  });
  await prisma.modifierGroup.create({
    data: {
      name: "Spice level", type: "single", required: true, sortOrder: 0,
      itemId: created["Midnight Curry"].id,
      options: { create: [
        { name: "Mild", priceDelta: 0, sortOrder: 0 },
        { name: "Medium", priceDelta: 0, sortOrder: 1 },
        { name: "Naga hot", priceDelta: 1, sortOrder: 2 },
      ] },
    },
  });

  console.log("Seeded demo restaurant: /r/demo-bistro");
  console.log("Demo owner login: demo@plate3d.app / demo1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
