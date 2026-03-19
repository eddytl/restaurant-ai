require('dotenv').config();
const mongoose = require('mongoose');
const MenuItem = require('./models/MenuItem');
const Category = require('./models/Category');
const Media = require('./models/Media');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant';

const categories = [
  { name: 'BEIGNETS' },
  { name: 'SALADES' },
  { name: 'BOISSON' },
  { name: 'POULETS' },
  { name: 'BURGER' },
  { name: 'MENUS_COMPOSES' }
];

const menuItems = [
  // BEIGNETS
  { name: 'BHB', category: 'BEIGNETS', price: 1500, description: 'Beignet haricot bouillie grand', available: true, imageUrl: 'https://media.ikwen.com/tchopetyamo/kako/photos/main7_495AsLr.jpg' },
  { name: 'BH', category: 'BEIGNETS', price: 1000, description: 'Beignet haricot', available: true, imageUrl: 'https://media.ikwen.com/tchopetyamo/kako/photos/6_bnkz5f8.jpg' },
  { name: 'BH 2 ailes', category: 'BEIGNETS', price: 2000, description: 'Beignet haricot avec 2 ailes de poulet', available: true, imageUrl: 'https://media.ikwen.com/tchopetyamo/photos/tchopetyamo_photo_X7VpNJB.png' },
  { name: 'Portion de haricot', category: 'BEIGNETS', price: 600, description: 'Portion de haricot', available: true, imageUrl: 'https://media.ikwen.com/tchopetyamo/kako/photos/4_q5hnycr.jpg' },
  { name: 'Bouillie', category: 'BEIGNETS', price: 600, description: 'Bouillie', available: true, imageUrl: 'https://media.ikwen.com/tchopetyamo/kako/photos/3_axbhsd2.jpg' },
  { name: 'Portion de beignets maïs', category: 'BEIGNETS', price: 600, description: 'Portion de beignets de maïs', available: true, imageUrl: 'https://media.ikwen.com/tchopetyamo/photos/tchopetyamo_photo_AehyuIx.png' },
  { name: 'Portion de beignets farine', category: 'BEIGNETS', price: 600, description: 'Portion de beignets de farine', available: false, imageUrl: 'https://media.ikwen.com/tchopetyamo/photos/tchopetyamo_photo.png' },
  { name: 'Promotion', category: 'BEIGNETS', price: 100, description: 'Promotion spéciale', available: true, imageUrl: 'https://media.ikwen.com/tchopetyamo/photos/tchopetyamo_photo_m3FcPOH.png' },

  // SALADES
  { name: 'Salade bitchakala', category: 'SALADES', price: 2500, description: 'Salade bitchakala maison', available: true, imageUrl: 'https://media.ikwen.com/tchopetyamo/photos/tchopetyamo_photo_V41L2o3.png' },
  { name: 'Salade de fruits', category: 'SALADES', price: 2200, description: 'Salade de fruits frais', available: true, imageUrl: 'https://media.ikwen.com/tchopetyamo/photos/tchopetyamo_photo_GApCEg7.png' },
  { name: 'Salade simple', category: 'SALADES', price: 1500, description: 'Salade simple', available: true, imageUrl: 'https://media.ikwen.com/tchopetyamo/photos/tchopetyamo_photo_Y5njTcs.png' },

  // BOISSON
  { name: 'Yamo Lemon', category: 'BOISSON', price: 1500, description: 'Jus Yamo saveur citron', available: true, imageUrl: 'https://media.ikwen.com/tchopetyamo/photos/tchopetyamo_photo_YFIbH2X.jpg' },
  { name: 'Yamo Ananas', category: 'BOISSON', price: 1500, description: 'Jus Yamo saveur ananas', available: true, imageUrl: 'https://media.ikwen.com/tchopetyamo/photos/tchopetyamo_photo_W1MV4ML.jpg' },
  { name: 'DJARA', category: 'BOISSON', price: 1000, description: 'Jus DJARA naturel', available: true, imageUrl: 'https://media.ikwen.com/tchopetyamo/photos/tchopetyamo_photo_pSxZ7di.jpg' },
  { name: 'Abangalafa', category: 'BOISSON', price: 2000, description: 'Boisson Abangalafa', available: true, imageUrl: 'https://media.ikwen.com/tchopetyamo/photos/tchopetyamo_photo_dYyvVuJ.png' },
  { name: 'Yaourt bikutsi', category: 'BOISSON', price: 2500, description: 'Yaourt saveur bikutsi', available: true, imageUrl: 'https://media.ikwen.com/tchopetyamo/kako/photos/sans-titre-28.png' },

  // POULETS
  { name: 'Ndogmangolo soya/poulet', category: 'POULETS', price: 2500, description: 'Ndogmangolo soya ou poulet (Nouveau)', available: true, imageUrl: 'https://media.ikwen.com/tchopetyamo/photos/tchopetyamo_photo_fhomo5E.png' },
  { name: 'Poulet pané', category: 'POULETS', price: 1100, description: 'Poulet pané croustillant', available: true, imageUrl: 'https://media.ikwen.com/tchopetyamo/photos/tchopetyamo_photo_qXy1JvF.jpeg' },
  { name: 'Frites de plantain', category: 'POULETS', price: 600, description: 'Frites de plantain maison', available: true, imageUrl: 'https://media.ikwen.com/tchopetyamo/photos/tchopetyamo_photo_79W6ROs.png' },
  { name: 'Poulet braisé', category: 'POULETS', price: 2800, description: 'Poulet braisé au feu de bois', available: true, imageUrl: 'https://media.ikwen.com/tchopetyamo/kako/photos/8_ewi89ja.jpg' },

  // BURGER
  { name: 'Burger poulet', category: 'BURGER', price: 3000, description: 'Burger au poulet grillé', available: true, imageUrl: 'https://media.ikwen.com/tchopetyamo/kako/photos/sans-titre-13_WwHlY7w.jpg' },
  { name: 'Burger boeuf', category: 'BURGER', price: 3500, description: 'Burger au boeuf', available: true, imageUrl: 'https://media.ikwen.com/tchopetyamo/kako/photos/sans-titre-13_WwHlY7w.jpg' },

  // MENUS_COMPOSES
  {
    name: 'Menu spécial',
    category: 'MENUS_COMPOSES',
    price: 4000,
    description: '3 morceaux de poulets + frites',
    available: true,
    imageUrl: 'https://media.ikwen.com/tchopetyamo/photos/tchopetyamo_photo_E8VEVHJ.jpeg'
  },
  {
    name: 'Menu 1',
    category: 'MENUS_COMPOSES',
    price: 3500,
    description: 'Beignet haricot bouillie + morceau de poulet + djara ou salade de fruits',
    available: true,
    imageUrl: 'https://media.ikwen.com/tchopetyamo/kako/photos/menu1_hg0hxDy.jpg'
  },
  {
    name: 'Menu 2',
    category: 'MENUS_COMPOSES',
    price: 3000,
    description: 'Beignet haricot bouillie + 2 ailes de poulets + djara',
    available: true,
    imageUrl: 'https://media.ikwen.com/tchopetyamo/kako/photos/menu2_NwWbIIz.jpg'
  },
  {
    name: 'Menu 3',
    category: 'MENUS_COMPOSES',
    price: 3000,
    description: '3 ailes de poulets + frites + djara',
    available: true,
    imageUrl: 'https://media.ikwen.com/tchopetyamo/kako/photos/menu3_3dpRiCi.jpg'
  },
  {
    name: 'Menu 4',
    category: 'MENUS_COMPOSES',
    price: 3300,
    description: 'Ndogmangolo + frites + djara',
    available: true,
    imageUrl: 'https://media.ikwen.com/tchopetyamo/kako/photos/menu4_vwRnZIV.jpg'
  },
  {
    name: 'Menu 5',
    category: 'MENUS_COMPOSES',
    price: 3800,
    description: '2 morceaux de poulets + frites + djara',
    available: true,
    imageUrl: 'https://media.ikwen.com/tchopetyamo/kako/photos/menu5_NQMduBb.jpg'
  },
  {
    name: 'Menu 6',
    category: 'MENUS_COMPOSES',
    price: 2800,
    description: '1 morceau de poulet + frites + djara',
    available: true,
    imageUrl: 'https://media.ikwen.com/tchopetyamo/kako/photos/menu6_aYrdq1x.jpg'
  },
  {
    name: 'Menu 7',
    category: 'MENUS_COMPOSES',
    price: 3800,
    description: '2 morceaux de poulets + frites + djara',
    available: true,
    imageUrl: 'https://media.ikwen.com/tchopetyamo/kako/photos/menu7_KmThwgK.jpg'
  },
  {
    name: 'Menu 8',
    category: 'MENUS_COMPOSES',
    price: 2500,
    description: '5 ailes de poulets',
    available: true,
    imageUrl: 'https://media.ikwen.com/tchopetyamo/kako/photos/menu8_xtQandX.jpg'
  },
  {
    name: 'Menu 9',
    category: 'MENUS_COMPOSES',
    price: 5000,
    description: 'Salade simple + 2 morceaux de poulets + frites + djara',
    available: true,
    imageUrl: 'https://media.ikwen.com/tchopetyamo/kako/photos/menu9_s3HgmWK.jpg'
  },
  {
    name: 'Menu 10',
    category: 'MENUS_COMPOSES',
    price: 4300,
    description: 'Ndogmangolo + glace',
    available: true,
    imageUrl: 'https://media.ikwen.com/tchopetyamo/kako/photos/menu10_CZCF6d9.jpg'
  },
  {
    name: 'Menu 11',
    category: 'MENUS_COMPOSES',
    price: 4700,
    description: 'Ndogmangolo + frites + morceau de poulet + djara',
    available: true,
    imageUrl: 'https://media.ikwen.com/tchopetyamo/kako/photos/menu11_cmOZBWc.jpg'
  },
  {
    name: 'Menu 12',
    category: 'MENUS_COMPOSES',
    price: 4000,
    description: 'Beignet haricot bouillie + 2 ailes + dessert',
    available: true,
    imageUrl: 'https://media.ikwen.com/tchopetyamo/kako/photos/menu-12-1_LV43mHt.jpg'
  },
  {
    name: 'Menu 13',
    category: 'MENUS_COMPOSES',
    price: 3000,
    description: 'Frites de pommes + haricot + 2 ailes de poulets',
    available: true,
    imageUrl: 'https://media.ikwen.com/tchopetyamo/kako/photos/sans-titre-30.png'
  },
  {
    name: 'Menu 14',
    category: 'MENUS_COMPOSES',
    price: 4800,
    description: 'Ndogmangolo + frites de patate + salade simple',
    available: true,
    imageUrl: 'https://media.ikwen.com/tchopetyamo/kako/photos/sans-titre-29.png'
  },
  {
    name: 'Menu pour 2',
    category: 'MENUS_COMPOSES',
    price: 12000,
    description: '4 ailes de poulets + 4 morceaux de poulets + 2 frites + 2 djara + 2 salades simples',
    available: true,
    imageUrl: 'https://media.ikwen.com/tchopetyamo/photos/tchopetyamo_photo_kdLjHih.jpeg'
  },
  {
    name: 'Menu pour 3',
    category: 'MENUS_COMPOSES',
    price: 16000,
    description: '6 morceaux de poulets + ailes de poulets + 3 portions de frites + 3 djara + 3 salades simples',
    available: true,
    imageUrl: 'https://media.ikwen.com/tchopetyamo/photos/tchopetyamo_photo_jTz5DCz.jpeg'
  },
  {
    name: 'Menu pour 4',
    category: 'MENUS_COMPOSES',
    price: 24000,
    description: '8 morceaux de poulets + 8 ailes de poulets + 4 portions de frites + 4 jus de djara + 4 salades simples',
    available: true,
    imageUrl: 'https://media.ikwen.com/tchopetyamo/photos/tchopetyamo_photo_NtNGTVQ.jpeg'
  }
];

async function seed() {
  try {
    console.log(`Connecting to MongoDB at ${MONGODB_URI}...`);
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB.');

    const existingCategories = await Category.countDocuments();
    if (existingCategories === 0) {
      console.log(`Inserting ${categories.length} categories...`);
      await Category.insertMany(categories);
      console.log(`Successfully inserted ${categories.length} categories.`);
    } else {
      console.log(`Database already has ${existingCategories} categories — skipping.`);
    }

    const existing = await MenuItem.countDocuments();
    if (existing > 0) {
      console.log(`Database already has ${existing} menu items — skipping seed.`);
      return;
    }

    // Build category name -> _id map
    const categoryDocs = await Category.find();
    const categoryMap = {};
    for (const doc of categoryDocs) categoryMap[doc.name] = doc._id;

    // Create Media docs for each item's imageUrl, then link to MenuItem
    console.log(`Creating ${menuItems.length} media docs...`);
    const resolvedItems = await Promise.all(
      menuItems.map(async (item, i) => {
        const { imageUrl, category, ...rest } = item;
        const media = await Media.create({ url: imageUrl, alt: item.name });
        return { idx: i + 1, ...rest, category: categoryMap[category], media: media._id };
      })
    );

    console.log(`Inserting ${resolvedItems.length} menu items...`);
    const inserted = await MenuItem.insertMany(resolvedItems);
    console.log(`Successfully inserted ${inserted.length} menu items.`);

    for (const doc of categoryDocs) {
      const count = resolvedItems.filter((i) => String(i.category) === String(doc._id)).length;
      if (count) console.log(`  ${doc.name}: ${count} items`);
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
