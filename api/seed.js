require('dotenv').config();
const mongoose = require('mongoose');
const MenuItem = require('./models/MenuItem');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tchopetyamo';

const menuItems = [
  // BEIGNETS
  { name: 'BHB', category: 'BEIGNETS', price: 1500, description: 'Beignet haricot bouillie grand', available: true },
  { name: 'BH', category: 'BEIGNETS', price: 1000, description: 'Beignet haricot', available: true },
  { name: 'BH 2 ailes', category: 'BEIGNETS', price: 2000, description: 'Beignet haricot avec 2 ailes de poulet', available: true },
  { name: 'Portion de haricot', category: 'BEIGNETS', price: 600, description: 'Portion de haricot', available: true },
  { name: 'Bouillie', category: 'BEIGNETS', price: 600, description: 'Bouillie', available: true },
  { name: 'Portion de beignets maïs', category: 'BEIGNETS', price: 600, description: 'Portion de beignets de maïs', available: true },
  { name: 'Portion de beignets farine', category: 'BEIGNETS', price: 600, description: 'Portion de beignets de farine', available: false },
  { name: 'Promotion', category: 'BEIGNETS', price: 100, description: 'Promotion spéciale', available: true },

  // SALADES
  { name: 'Salade bitchakala', category: 'SALADES', price: 2500, description: 'Salade bitchakala maison', available: true },
  { name: 'Salade de fruits', category: 'SALADES', price: 2200, description: 'Salade de fruits frais', available: true },
  { name: 'Salade simple', category: 'SALADES', price: 1500, description: 'Salade simple', available: true },

  // BOISSON
  { name: 'Yamo Lemon', category: 'BOISSON', price: 1500, description: 'Jus Yamo saveur citron', available: true },
  { name: 'Yamo Ananas', category: 'BOISSON', price: 1500, description: 'Jus Yamo saveur ananas', available: true },
  { name: 'DJARA', category: 'BOISSON', price: 1000, description: 'Jus DJARA naturel', available: true },
  { name: 'Abangalafa', category: 'BOISSON', price: 2000, description: 'Boisson Abangalafa', available: true },
  { name: 'Yaourt bikutsi', category: 'BOISSON', price: 2500, description: 'Yaourt saveur bikutsi', available: true },

  // POULETS
  { name: 'Ndogmangolo soya/poulet', category: 'POULETS', price: 2500, description: 'Ndogmangolo soya ou poulet (Nouveau)', available: true },
  { name: 'Poulet pané', category: 'POULETS', price: 1100, description: 'Poulet pané croustillant', available: true },
  { name: 'Frites de plantain', category: 'POULETS', price: 600, description: 'Frites de plantain maison', available: true },
  { name: 'Poulet braisé', category: 'POULETS', price: 2800, description: 'Poulet braisé au feu de bois', available: true },

  // BURGER
  { name: 'Burger poulet', category: 'BURGER', price: 3000, description: 'Burger au poulet grillé', available: true },
  { name: 'Burger boeuf', category: 'BURGER', price: 3500, description: 'Burger au boeuf', available: true },

  // MENUS_COMPOSES
  {
    name: 'Menu spécial',
    category: 'MENUS_COMPOSES',
    price: 4000,
    description: '3 morceaux de poulets + frites',
    available: true
  },
  {
    name: 'Menu 1',
    category: 'MENUS_COMPOSES',
    price: 3500,
    description: 'Beignet haricot bouillie + morceau de poulet + djara ou salade de fruits',
    available: true
  },
  {
    name: 'Menu 2',
    category: 'MENUS_COMPOSES',
    price: 3000,
    description: 'Beignet haricot bouillie + 2 ailes de poulets + djara',
    available: true
  },
  {
    name: 'Menu 3',
    category: 'MENUS_COMPOSES',
    price: 3000,
    description: '3 ailes de poulets + frites + djara',
    available: true
  },
  {
    name: 'Menu 4',
    category: 'MENUS_COMPOSES',
    price: 3300,
    description: 'Ndogmangolo + frites + djara',
    available: true
  },
  {
    name: 'Menu 5',
    category: 'MENUS_COMPOSES',
    price: 3800,
    description: '2 morceaux de poulets + frites + djara',
    available: true
  },
  {
    name: 'Menu 6',
    category: 'MENUS_COMPOSES',
    price: 2800,
    description: '1 morceau de poulet + frites + djara',
    available: true
  },
  {
    name: 'Menu 7',
    category: 'MENUS_COMPOSES',
    price: 3800,
    description: '2 morceaux de poulets + frites + djara',
    available: true
  },
  {
    name: 'Menu 8',
    category: 'MENUS_COMPOSES',
    price: 2500,
    description: '5 ailes de poulets',
    available: true
  },
  {
    name: 'Menu 9',
    category: 'MENUS_COMPOSES',
    price: 5000,
    description: 'Salade simple + 2 morceaux de poulets + frites + djara',
    available: true
  },
  {
    name: 'Menu 10',
    category: 'MENUS_COMPOSES',
    price: 4300,
    description: 'Ndogmangolo + glace',
    available: true
  },
  {
    name: 'Menu 11',
    category: 'MENUS_COMPOSES',
    price: 4700,
    description: 'Ndogmangolo + frites + morceau de poulet + djara',
    available: true
  },
  {
    name: 'Menu 12',
    category: 'MENUS_COMPOSES',
    price: 4000,
    description: 'Beignet haricot bouillie + 2 ailes + dessert',
    available: true
  },
  {
    name: 'Menu 13',
    category: 'MENUS_COMPOSES',
    price: 3000,
    description: 'Frites de pommes + haricot + 2 ailes de poulets',
    available: true
  },
  {
    name: 'Menu 14',
    category: 'MENUS_COMPOSES',
    price: 4800,
    description: 'Ndogmangolo + frites de patate + salade simple',
    available: true
  },
  {
    name: 'Menu pour 2',
    category: 'MENUS_COMPOSES',
    price: 12000,
    description: '4 ailes de poulets + 4 morceaux de poulets + 2 frites + 2 djara + 2 salades simples',
    available: true
  },
  {
    name: 'Menu pour 3',
    category: 'MENUS_COMPOSES',
    price: 16000,
    description: '6 morceaux de poulets + ailes de poulets + 3 portions de frites + 3 djara + 3 salades simples',
    available: true
  },
  {
    name: 'Menu pour 4',
    category: 'MENUS_COMPOSES',
    price: 24000,
    description: '8 morceaux de poulets + 8 ailes de poulets + 4 portions de frites + 4 jus de djara + 4 salades simples',
    available: true
  }
];

async function seed() {
  try {
    console.log(`Connecting to MongoDB at ${MONGODB_URI}...`);
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB.');

    console.log('Clearing existing menu items...');
    await MenuItem.deleteMany({});
    console.log('Existing menu items cleared.');

    console.log(`Inserting ${menuItems.length} menu items...`);
    const inserted = await MenuItem.insertMany(menuItems);
    console.log(`Successfully inserted ${inserted.length} menu items.`);

    // Summary by category
    const categories = [...new Set(menuItems.map((i) => i.category))];
    for (const cat of categories) {
      const count = menuItems.filter((i) => i.category === cat).length;
      console.log(`  ${cat}: ${count} items`);
    }

    console.log('\nDatabase seeded successfully!');
  } catch (err) {
    console.error('Seed error:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

seed();
