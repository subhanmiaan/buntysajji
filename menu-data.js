'use strict';
// Prices and portions from the six supplied menu PDFs. null means not printed.
const items=[];
function slugify(text) {
  return text.toLowerCase()
    .replace(/[·,]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
function add(name,category,prices,fallbackCategory='sajji',description='Fresh from the Bunty Sajji menu. Pick your favourite and call to order.') {
  items.push({id:items.length,name,category,variants:Array.isArray(prices)?prices:[['Regular',prices]],image:slugify(name),fallbackImage:fallbackCategory,description});
}
const portions=(q,h,f)=>[['Quarter',q],['Half',h],['Full',f]];
const halves=(h,f)=>[['Half',h],['Full',f]];
for(const [n,q,h,f] of [['Chicken Sajji',670,1120,1890],['Chicken Peri Peri Sajji',740,1220,2370],['Chicken Malai Sajji',740,1220,2170],['Chicken Butter Sajji',740,1220,2370],['Chicken Black Pepper Sajji',720,1220,2070],['Chicken White Pepper Sajji',720,1180,2070],['Chicken Cheese Sajji',740,1220,2170],['Chicken Sajji without Rice',570,980,1650]])add(n,'Sajji & Rice',portions(q,h,f),'sajji');
add('Grilled Chargha','Sajji & Rice',halves(1000,1700),'bbq');
for(const n of ['Pangasius Fish with Rice · 1 kg','Pangasius Fish Grilled · 1 kg','Pangasius Fish Tikka · 12 pieces','Rahu Fish Grilled · 1 kg'])add(n,'Fish',null,'fish','Grilled fish, desi style. Call for today’s price and availability.');
for(const [n,s,p] of [['Chicken Malai Boti',360,1050],['Chicken Tikka Boti',280,750],['Pasha Boti',370,1100]])add(n,'BBQ',[['Seekh',s],['Plate',p]],'bbq');
for(const [n,p] of [['Chicken Chest Piece',480],['Chicken Leg Piece',430],['Chicken Malai Chest Piece',560],['Chicken Malai Leg Piece',530],['Chicken Cheese & Malai Chest Piece',580],['Chicken Cheese & Malai Leg Piece',550]])add(n,'BBQ',p,'bbq');
for(const [n,s,p,count] of [['Chicken Kabab',210,1180,6],['Chicken Cheese Kabab',240,1390,6],['Chicken Rashmi Kabab',230,1350,6],['Chicken Gola Kabab',240,960,12],['Chicken Afghani Kabab',240,1390,6],['Chicken Turkish Kabab',220,1280,6],['Beef Kabab',230,1350,6],['Beef Cheese Kabab',250,1450,6],['Beef Rashmi Kabab',240,1390,6],['Beef Gola Kabab',260,1600,12],['Beef Afghani Kabab',260,1490,6]])add(n,'Kabab',[['Seekh',s],[`Plate · ${count} pieces`,p]],'kabab');
for(const [n,h,f] of [['Chicken Karahi',990,1780],['Sialkoti Chicken Karahi',1150,2050],['Chicken White Karahi',1050,1950],['Chicken Makhani Karahi',1150,2050],['Chicken Black Pepper Karahi',1050,1950],['Chicken Achari Karahi',1050,1950],['Shinwari Karahi',1200,2200],['Peri Peri Chicken Karahi',1299,2208]])add(n,'Karahi',halves(h,f),'chicken-karahi');
for(const [n,h,f] of [['Chef Special Beef Karahi',1380,2350],['Beef Makhani Karahi',1450,2450],['Beef White Karahi',1390,2390],['Beef Black Pepper Karahi',1450,2450],['Beef Green Karahi',1390,2390]])add(n,'Karahi',halves(h,f),'beef-karahi');
for(const [n,h,f] of [['Chicken Handi',1050,1700],['Chicken White Handi',1070,1820],['Chicken Makhani Handi',1100,1880],['Chicken Green Handi',1100,1880],['Chicken Achari Handi',1150,1950],['Chicken Peri Handi',1150,1950]])add(n,'Handi',halves(h,f),'handi');
for(const [n,h,f] of [['Chicken Kabab Masala',900,1450],['Chicken White Kabab Masala',1050,1850],['Chicken Green Kabab Masala',1050,1850],['Beef Kabab Masala',1050,1850],['Beef White Kabab Masala',1050,1850],['Beef Green Kabab Masala',1050,1850],['Chicken Qeema',850,1650],['Beef Qeema',900,1650]])add(n,'Tawa',halves(h,f),n.includes('Qeema')?'qeema':'masala');
add('Tawa Piece','Tawa',750,'masala');
for(const [n,h,f] of [['Masala Fries',220,380],['Loaded Fries',380,650],['Chicken Cheese Fries',350,597],['BBQ Fries',366,622],['Simple Fries',150,250]])add(n,'Sides',halves(h,f),'naan','Fries to share. See the original menu for details.');
add('Hot Wings','Sides',[['6 pieces',400],['12 pieces',750]],'wings');add('Nuggets','Sides',[['6 pieces',450],['12 pieces',790]],'nuggets');
for(const [n,p] of [['Chef Special',550],['Chicken Malai',500],['Chicken Malai Cheese',550],['Chicken Tikka',450],['Chicken Tikka Cheese',480],['Chicken Kabab',400],['Chicken Kabab Cheese',450],['Beef Kabab',430],['Beef Cheese Kabab',480],['Crunchy Chicken',510]])add(n+' Paratha Roll','Paratha Rolls',p,'roll');
for(const [n,p] of [['Zinger Burger',380],['Stuff Burger',480],['Chicken Petty Burger',300],['Double Dacker Burger',600],['Fish Burger',720]])add(n,'Burgers',p,'burger');
for(const [n,p] of [['Sada Roti',20],['Khameri Roti',30],['Sada Naan',40],['Kulcha',40],['Kalwanji Naan',70],['Roghni Naan',100],['Garlic Naan',120]])add(n,'Tandoor',p,'naan');
for(const [n,p] of [['Mineral Water Large',150],['Mineral Water Small',90],['1.5 Litre Drink',250],['1 Litre Drink',190],['1 NR Drink 345 ml',90]])add(n,'Beverages',p,'drinks');
for(const [n,p] of [['Fresh Salad',160],['Kachumar Salad',170]])add(n,'Salad & Dips',p,'salad');
for(const [n,p] of [['Mint Sauce Dip',90],['Chipotle Sauce Dip',120],['Cheese Sauce Dip',120],['BBQ Sauce Dip',90],['Honey Mustard Dip',130],['Family Raita',170],['Raita',70],['Sweet & Sour Sauce',60],['Zeera Raita',70],['Green Chutney',90],['Garlic Sauce Dip',110],['Spicy Mayo Dip',90]])add(n,'Salad & Dips',p,'raita');
add('Couple Platter','Platters',1610,'couple-platter','Quarter sajji with rice, chicken tikka, chicken kabab, gulati kabab, 4 sada roti, 2 drinks (345 ml) and raita.');
add('Family Platter','Platters',3680,'family-platter','Half sajji with rice, chicken tikka, half chicken karahi, malai boti, 2 chicken kababs, 2 beef kababs, 8 roti, 4 mint raita, salad and a 1.5 litre drink.');
add('Friends Platter','Platters',4720,'friends-platter','Half sajji with rice, 2 chicken tikka, 2 malai boti, 4 chicken kababs, leg piece, half chicken karahi, 8 roti, 4 mint raita, salad and a 1.5 litre drink.');
for(const [n,p,d] of [['Budget Bite',590,'1 Stuff Burger, regular fries and a 345 ml drink.'],['Twin Burger Treat',930,'2 Zinger Burgers, regular fries and 2 drinks (345 ml).'],['Flavour Loaded Deal',1570,'1 Zinger Burger, 1 Double Dacker Burger, 1 Chicken Chattni Paratha Roll, regular fries and 2 drinks (345 ml).'],['Cheesy Crunch Combo',1290,'1 Stuff Burger, 1 Cheese Paratha Roll, 1 Crunchy Paratha Roll, regular fries and a 345 ml drink.']])add(n,'Deals',p,'burger',d);

window.previewMenu=items;
