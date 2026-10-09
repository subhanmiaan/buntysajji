import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

// Load previewMenu items from menu-data.js
const menuCode = fs.readFileSync('menu-data.js', 'utf8');
const sandbox = { window: {} };
eval(menuCode.replace('window.previewMenu', 'sandbox.previewMenu'));
const items = sandbox.previewMenu;

export function slugify(text) {
  return text.toLowerCase()
    .replace(/[·,]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const queries = {
  // Sajji & Rice
  'Chicken Sajji': 'Chicken Sajji with rice Pakistani roasted',
  'Chicken Peri Peri Sajji': 'Peri Peri roasted chicken with rice',
  'Chicken Malai Sajji': 'Malai chicken sajji roasted cream',
  'Chicken Butter Sajji': 'Butter chicken sajji roasted golden',
  'Chicken Black Pepper Sajji': 'Black pepper roasted chicken sajji',
  'Chicken White Pepper Sajji': 'White pepper sajji chicken roasted',
  'Chicken Cheese Sajji': 'Cheesy roast chicken sajji melted cheese',
  'Chicken Sajji without Rice': 'Whole roasted chicken sajji platter',
  'Grilled Chargha': 'Lahori Chargha whole roast chicken Pakistani',

  // Fish
  'Pangasius Fish with Rice · 1 kg': 'Grilled fish fillet with spiced rice platter',
  'Pangasius Fish Grilled · 1 kg': 'Grilled pangasius fish fillet Pakistani',
  'Pangasius Fish Tikka · 12 pieces': 'Fish tikka pieces skewers grilled',
  'Rahu Fish Grilled · 1 kg': 'Pakistani fried grilled rahu fish whole',

  // BBQ
  'Chicken Malai Boti': 'Chicken Malai Boti creamy grilled skewers',
  'Chicken Tikka Boti': 'Chicken Tikka Boti grilled red spiced',
  'Pasha Boti': 'Spicy Pakistani chicken boti grilled skewers',
  'Chicken Chest Piece': 'Chicken Tikka Chest Piece grilled BBQ',
  'Chicken Leg Piece': 'Chicken Tikka Leg Piece Pakistani BBQ',
  'Chicken Malai Chest Piece': 'Chicken Malai Tikka Chest Piece BBQ',
  'Chicken Malai Leg Piece': 'Chicken Malai Tikka Leg Piece BBQ',
  'Chicken Cheese & Malai Chest Piece': 'Cheese Malai Chicken Tikka Chest Piece',
  'Chicken Cheese & Malai Leg Piece': 'Cheese Malai Chicken Tikka Leg Piece',

  // Kabab
  'Chicken Kabab': 'Pakistani Chicken Seekh Kabab grilled skewers',
  'Chicken Cheese Kabab': 'Chicken Cheese Seekh Kabab melted cheese',
  'Chicken Rashmi Kabab': 'Chicken Reshmi Kabab Mughlai skewers',
  'Chicken Gola Kabab': 'Chicken Gola Kabab round juicy skewers',
  'Chicken Afghani Kabab': 'Afghani Chicken Seekh Kabab white creamy',
  'Chicken Turkish Kabab': 'Turkish Chicken Adana Kabab skewers plate',
  'Beef Kabab': 'Pakistani Beef Seekh Kabab grilled',
  'Beef Cheese Kabab': 'Beef Cheese Seekh Kabab melted cheese',
  'Beef Rashmi Kabab': 'Beef Reshmi Kabab soft juicy skewers',
  'Beef Gola Kabab': 'Beef Gola Kabab melt in mouth Pakistani',
  'Beef Afghani Kabab': 'Afghani Beef Kabab skewers plate',

  // Karahi
  'Chicken Karahi': 'Traditional Pakistani Chicken Karahi wok curry',
  'Sialkoti Chicken Karahi': 'Sialkoti Desi Chicken Karahi tomato gravy',
  'Chicken White Karahi': 'Chicken White Karahi creamy yoghurt gravy',
  'Chicken Makhani Karahi': 'Butter Chicken Makhani Karahi rich gravy',
  'Chicken Black Pepper Karahi': 'Black Pepper Chicken Kali Mirch Karahi',
  'Chicken Achari Karahi': 'Achari Chicken Karahi pickling spices',
  'Shinwari Karahi': 'Shinwari Chicken Karahi salt and tomato',
  'Peri Peri Chicken Karahi': 'Peri Peri spicy Chicken Karahi wok',
  'Chef Special Beef Karahi': 'Beef Karahi Pakistani tender meat curry',
  'Beef Makhani Karahi': 'Beef Makhani Karahi butter rich gravy',
  'Beef White Karahi': 'Beef White Karahi cream yoghurt curry',
  'Beef Black Pepper Karahi': 'Beef Kali Mirch Karahi black pepper wok',
  'Beef Green Karahi': 'Beef Hara Masala Green Karahi coriander mint',

  // Handi
  'Chicken Handi': 'Pakistani Chicken Handi clay pot creamy curry',
  'Chicken White Handi': 'Chicken White Handi boneless cream handi',
  'Chicken Makhani Handi': 'Chicken Makhani Butter Handi clay pot',
  'Chicken Green Handi': 'Chicken Hara Masala Handi coriander green curry',
  'Chicken Achari Handi': 'Achari Chicken Handi boneless pickle masala',
  'Chicken Peri Handi': 'Spicy Peri Peri Chicken Handi clay pot',

  // Tawa
  'Chicken Kabab Masala': 'Chicken Kabab Masala tawa fry gravy',
  'Chicken White Kabab Masala': 'Chicken White Kabab Masala tawa cream',
  'Chicken Green Kabab Masala': 'Chicken Green Kabab Masala hara tawa',
  'Beef Kabab Masala': 'Beef Seekh Kabab Masala tawa gravy Pakistani',
  'Beef White Kabab Masala': 'Beef White Kabab Masala tawa cream',
  'Beef Green Kabab Masala': 'Beef Green Kabab Masala hara gravy',
  'Chicken Qeema': 'Pakistani Chicken Keema Fry tawa mince curry',
  'Beef Qeema': 'Pakistani Beef Keema Fry tawa minced meat',
  'Tawa Piece': 'Lahori Tawa Chicken Piece spicy grilled',

  // Sides
  'Masala Fries': 'Pakistani Masala French Fries spicy chaat masala',
  'Loaded Fries': 'Loaded French Fries melted cheese chicken toppings',
  'Chicken Cheese Fries': 'Chicken Cheese French Fries crispy',
  'BBQ Fries': 'BBQ Sauce drizzle French Fries crispy',
  'Simple Fries': 'Crispy golden French Fries basket',
  'Hot Wings': 'Spicy Hot Chicken Wings crispy fried glazed',
  'Nuggets': 'Crispy golden Chicken Nuggets plate with dip',

  // Paratha Rolls
  'Chef Special Paratha Roll': 'Chef Special Chicken Tikka Paratha Roll street food',
  'Chicken Malai Paratha Roll': 'Chicken Malai Boti Paratha Roll garlic mayo',
  'Chicken Malai Cheese Paratha Roll': 'Chicken Malai Cheese Paratha Roll melted cheese',
  'Chicken Tikka Paratha Roll': 'Chicken Tikka Paratha Roll Karachi street food',
  'Chicken Tikka Cheese Paratha Roll': 'Chicken Tikka Cheese Paratha Roll spicy melted',
  'Chicken Kabab Paratha Roll': 'Chicken Seekh Kabab Paratha Roll chutney onions',
  'Chicken Kabab Cheese Paratha Roll': 'Chicken Kabab Cheese Paratha Roll spicy mayo',
  'Beef Kabab Paratha Roll': 'Beef Seekh Kabab Paratha Roll Pakistani street food',
  'Beef Cheese Kabab Paratha Roll': 'Beef Cheese Seekh Kabab Paratha Roll melted',
  'Crunchy Chicken Paratha Roll': 'Crispy Crunchy Zinger Chicken Paratha Roll',

  // Burgers
  'Zinger Burger': 'Crispy Zinger Chicken Burger lettuce mayo',
  'Stuff Burger': 'Stuffed Cheese Chicken Burger patty molten cheese',
  'Chicken Petty Burger': 'Classic Pakistani Chicken Patty Burger coleslaw',
  'Double Dacker Burger': 'Double Decker Crispy Chicken Burger stacked high',
  'Fish Burger': 'Crispy Fried Fish Fillet Burger tartar sauce',

  // Tandoor
  'Sada Roti': 'Pakistani Tandoori Sada Roti hot flatbread',
  'Khameri Roti': 'Khamiri Roti fluffy Mughlai tandoori bread',
  'Sada Naan': 'Fresh Tandoori Sada Naan traditional Pakistani',
  'Kulcha': 'Pakistani Tandoori Kulcha sesame seed flatbread',
  'Kalwanji Naan': 'Kalwanji Naan nigella black seeds tandoori naan',
  'Roghni Naan': 'Roghni Naan butter sesame seeds traditional',
  'Garlic Naan': 'Garlic Naan fresh butter coriander garlic flatbread',

  // Beverages
  'Mineral Water Large': 'Mineral water bottle 1.5 litre clean refreshing',
  'Mineral Water Small': 'Mineral water bottle 500ml clean drink',
  '1.5 Litre Drink': '1.5 Litre cold soft drink bottle Pepsi Coca Cola',
  '1 Litre Drink': '1 Litre cold soft drink bottle chilled',
  '1 NR Drink 345 ml': 'Cold soft drink bottle 345ml glass chilled',

  // Salad & Dips
  'Fresh Salad': 'Fresh Pakistani green salad cucumber tomato onion lemon',
  'Kachumar Salad': 'Kachumber Salad diced fresh cucumber tomato onion',
  'Mint Sauce Dip': 'Fresh mint sauce pudina dip chutney green',
  'Chipotle Sauce Dip': 'Chipotle mayo dip sauce bowl creamy spicy',
  'Cheese Sauce Dip': 'Warm cheddar cheese sauce dip creamy melted',
  'BBQ Sauce Dip': 'Smoky barbecue sauce dip bowl rich dark glaze',
  'Honey Mustard Dip': 'Honey mustard sauce dip bowl golden smooth',
  'Family Raita': 'Large bowl Zeera mint raita spiced yoghurt',
  'Raita': 'Pakistani dahi raita cumin mint yoghurt dip',
  'Sweet & Sour Sauce': 'Sweet and sour sauce dip bowl vibrant red glaze',
  'Zeera Raita': 'Zeera cumin roasted spiced yoghurt raita dip',
  'Green Chutney': 'Spicy green chutney hari mirch mint coriander dip',
  'Garlic Sauce Dip': 'Creamy garlic sauce dip toum aioli white',
  'Spicy Mayo Dip': 'Spicy mayo dynamite sauce dip bowl orange creamy',

  // Platters
  'Couple Platter': 'Pakistani BBQ Platter sajji tikka kabab naan for two',
  'Family Platter': 'Grand Pakistani Family Platter sajji karahi BBQ boti feast',
  'Friends Platter': 'Mega BBQ Platter sajji tikka kabab karahi feast friends',

  // Deals
  'Budget Bite': 'Zinger Burger French Fries and cold soft drink combo deal',
  'Twin Burger Treat': 'Two crispy chicken burgers with french fries and drinks',
  'Flavour Loaded Deal': 'Chicken burger paratha roll fries and drink fast food feast',
  'Cheesy Crunch Combo': 'Stuffed burger crunchy paratha roll fries and cold drink'
};

async function fetchImageUrl(query) {
  try {
    const initRes = await fetch('https://duckduckgo.com/?q=' + encodeURIComponent(query), {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(6000)
    });
    const html = await initRes.text();
    const vqdMatch = html.match(/vqd=([0-9-]+)/) || html.match(/vqd=["']([^"']+)["']/);
    if (!vqdMatch) return null;
    const imgRes = await fetch('https://duckduckgo.com/i.js?l=us-en&o=json&q=' + encodeURIComponent(query) + '&vqd=' + vqdMatch[1] + '&f=,,,', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://duckduckgo.com/'
      },
      signal: AbortSignal.timeout(6000)
    });
    const data = await imgRes.json();
    return data.results ? data.results.slice(0, 6).map(r => r.image) : [];
  } catch (_err) {
    return null;
  }
}

async function downloadAndOptimize(urls, destPath) {
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        signal: AbortSignal.timeout(7000)
      });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 1000) continue;
      await sharp(buf)
        .resize(600, 450, { fit: 'cover', position: 'center' })
        .webp({ quality: 85 })
        .toFile(destPath);
      return true;
    } catch (_e) {
      // try next url
    }
  }
  return false;
}

async function main() {
  console.log(`Starting download of photos for all ${items.length} menu items...`);
  const targetDir = 'assets/food';
  fs.mkdirSync(targetDir, { recursive: true });

  let successCount = 0;
  let _skippedCount = 0;
  let failed = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const slug = slugify(item.name);
    const destPath = path.join(targetDir, `${slug}.webp`);

    // If file exists and > 5KB, we can keep or overwrite if it's not the old generic one
    if (fs.existsSync(destPath) && fs.statSync(destPath).size > 5000) {
      console.log(`[${i + 1}/${items.length}] Already exists: ${slug}`);
      successCount++;
      continue;
    }

    const query = queries[item.name] || `${item.name} ${item.category} Pakistani food`;
    console.log(`[${i + 1}/${items.length}] Fetching image for: ${item.name} (query: "${query}")...`);

    let urls = await fetchImageUrl(query);
    if (!urls || urls.length === 0) {
      // Fallback query
      urls = await fetchImageUrl(`${item.name} food`);
    }

    let ok = false;
    if (urls && urls.length > 0) {
      ok = await downloadAndOptimize(urls, destPath);
    }

    if (ok) {
      console.log(`  -> Saved ${destPath} (${Math.round(fs.statSync(destPath).size / 1024)} KB)`);
      successCount++;
    } else {
      console.warn(`  -> FAILED to download specific image for: ${item.name}`);
      failed.push(item);
    }

    // Gentle delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 400));
  }

  console.log(`\nCompleted! Success: ${successCount}, Failed: ${failed.length}`);
  if (failed.length > 0) {
    console.log('Failed items:', failed.map(f => f.name));
  }
}

main().catch(console.error);
