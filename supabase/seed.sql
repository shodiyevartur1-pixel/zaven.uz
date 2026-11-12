-- =============================================================================
-- ZAVEN ONLINE STORE — PRODUCTION & INITIAL CATALOG SEED SCRIPT
-- File: supabase/seed.sql
-- Safe to run multiple times; existing owner-managed records are preserved (ON CONFLICT DO NOTHING)
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. SEED PRODUCT CATEGORIES
-- -----------------------------------------------------------------------------
insert into public.categories (
  id,
  slug,
  name,
  description,
  icon_name,
  image,
  is_active,
  sort_order,
  updated_at
)
values
  (
    'cat-home',
    'uy-rozgor-buyumlari',
    'Uy-roʻzgʻor buyumlari',
    'Oshxona, tartib saqlash va xonadon qulayligi uchun zamonaviy vositalar',
    'Home',
    'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=600&q=80',
    true,
    1,
    now()
  ),
  (
    'cat-phone',
    'telefon-aksessuarlari',
    'Telefon aksessuarlari',
    'Quvvatlagichlar, powerbanklar, tutqichlar va himoya vositalari',
    'Smartphone',
    'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=600&q=80',
    true,
    2,
    now()
  ),
  (
    'cat-gadgets',
    'kundalik-texnika',
    'Kundalik texnika',
    'Har kuni asqotadigan ixcham elektronika va aqlli yoritgichlar',
    'Zap',
    'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=600&q=80',
    true,
    3,
    now()
  ),
  (
    'cat-gifts',
    'sovgalar-va-foydali-jihozlar',
    'Sovgʻalar va foydali jihozlar',
    'Yaqinlaringiz va oʻzingiz uchun amaliy, chiroyli qadoqdagi buyumlar',
    'Gift',
    'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=600&q=80',
    true,
    4,
    now()
  ),
  (
    'cat-auto',
    'avto-va-sayohat',
    'Avto va sayohat buyumlari',
    'Avtomobil saloni va safarlar uchun qulay organayzer hamda moslamalar',
    'Compass',
    'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=600&q=80',
    true,
    5,
    now()
  )
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 2. SEED PRODUCTS (UZBEK BASE TEXT PLUS RUSSIAN & ENGLISH TRANSLATIONS)
-- -----------------------------------------------------------------------------
insert into public.products (
  id,
  slug,
  sku,
  name,
  category_id,
  price,
  sale_price,
  cost_price,
  stock,
  low_stock_threshold,
  status,
  short_description,
  description,
  features,
  specifications,
  translations,
  images,
  is_new,
  is_popular,
  is_recommended,
  sold_count,
  created_at,
  updated_at
)
values
  (
    'prod-1',
    'sensorli-led-stol-chirogi-zaven-lux',
    'ZVN-LED-101',
    'Sensorli akkumulyatorli LED stol chirogʻi (3 xil yorugʻlik rejimi)',
    'cat-gadgets',
    165000,
    129000,
    78000,
    24,
    5,
    'active',
    'Koʻzni charchatmaydigan, USB Type-C orqali quvvatlanuvchi ixcham stol chirogʻi.',
    'ZAVEN tomonidan keltirilgan ushbu zamonaviy LED stol chirogʻi oʻqish, ishlash va tungi yoritish uchun juda qulay. Ichki 2400 mA/soat akkumulyatori elektr oʻchganda ham 6–8 soatgacha barqaror ishlashni taʼminlaydi.',
    '["3 xil rang harorati: iliq, tabiiy va sovuq oq yorugʻlik", "Sensorli tugma orqali yorugʻlik kuchini ravon sozlash (dimmer)", "Buklanuvchan korpus — joy kam egallaydi", "USB Type-C kabeli toʻplamda mavjud"]'::jsonb,
    '[{"label": "Quvvat manbai", "value": "Ichki akkumulyator (2400 mAh) / USB 5V"}, {"label": "Material", "value": "Mustahkam ABS plastik va alyuminiy"}, {"label": "Quvvati", "value": "7 Vt"}, {"label": "Ishlab chiqarilgan mamlakat", "value": "Xitoy (ZAVEN sifat nazorati)"}]'::jsonb,
    '{
      "ru": {
        "name": "Сенсорная аккумуляторная LED настольная лампа (3 режима света)",
        "shortDescription": "Компактная настольная лампа без мерцания с зарядкой через USB Type-C.",
        "description": "Современная настольная LED-лампа от ZAVEN идеально подходит для учебы, работы и ночного освещения. Встроенный аккумулятор 2400 мАч обеспечивает 6–8 часов автономной работы.",
        "features": [
          "3 цветовых режима: теплый, естественный и холодный белый свет",
          "Плавная сенсорная регулировка яркости (диммер)",
          "Складной корпус — занимает минимум места на столе",
          "Кабель USB Type-C входит в комплект"
        ]
      },
      "en": {
        "name": "Rechargeable Touch LED Desk Lamp (3 Lighting Modes)",
        "shortDescription": "Eye-friendly cordless LED desk lamp with USB Type-C charging.",
        "description": "Imported and quality-checked by ZAVEN, this rechargeable LED desk lamp is built for reading, study, and bedside lighting. Its 2400 mAh battery delivers 6–8 hours of cordless illumination.",
        "features": [
          "3 color temperatures: warm, neutral, and cool daylight",
          "Stepless touch dimming control",
          "Foldable space-saving design",
          "Includes USB Type-C charging cable"
        ]
      }
    }'::jsonb,
    '["https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=80", "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=900&q=80"]'::jsonb,
    true,
    true,
    true,
    84,
    now(),
    now()
  ),
  (
    'prod-2',
    'magsafe-tez-quvvatlovchi-powerbank-10000',
    'ZVN-PWR-204',
    'Magnitli simsiz Powerbank 10 000 mAh (22.5W tez quvvatlash)',
    'cat-phone',
    245000,
    199000,
    125000,
    18,
    6,
    'active',
    'Telefon orqasiga magnit orqali yopishuvchi va simli PD 22.5W tez quvvatlovchi ixcham batareya.',
    'Kundalik harakatda kabelsiz qulay quvvatlash uchun moʻljallangan ixcham Powerbank. Raqamli LED displeyda qolgan foiz aniq koʻrinib turadi. Ham simsiz (15W), ham Type-C kabeli orqali (22.5W) tez quvvatlaydi.',
    '["Aniq foizni koʻrsatuvchi raqamli LED ekran", "Yigʻiladigan metall tirgak (telefonni stolga qoʻyib video koʻrish uchun)", "Qizib ketish va qisqa tutashuvdan himoya tizimi", "Choʻntakbop yupqa oʻlcham"]'::jsonb,
    '[{"label": "Sigʻimi", "value": "10 000 mA/soat"}, {"label": "Simli chiqish quvvati", "value": "22.5W (USB-C PD / QC 3.0)"}, {"label": "Simsiz quvvatlash", "value": "15W Max"}, {"label": "Ogʻirligi", "value": "195 gramm"}]'::jsonb,
    '{
      "ru": {
        "name": "Магнитный беспроводной Powerbank 10 000 мАч (быстрая зарядка 22.5W)",
        "shortDescription": "Компактный магнитный внешний аккумулятор с LED-дисплеем и PD 22.5W.",
        "description": "Удобный внешний аккумулятор на каждый день с магнитным креплением и точным цифровым индикатором заряда. Поддерживает беспроводную (15W) и быструю проводную зарядку Type-C (22.5W).",
        "features": [
          "Цифровой LED-экран с точным процентом заряда",
          "Складная металлическая подставка для просмотра видео",
          "Многоуровневая защита от перегрева и короткого замыкания",
          "Тонкий карманный корпус весом 195 г"
        ]
      },
      "en": {
        "name": "Magnetic Wireless Powerbank 10,000 mAh (22.5W Fast Charge)",
        "shortDescription": "Snap-on magnetic battery pack with digital LED display and 22.5W USB-C PD.",
        "description": "Designed for effortless everyday charging on the go. Features a clear LED percentage display, a built-in foldable kickstand, 15W wireless charging, and 22.5W wired fast charging.",
        "features": [
          "Digital LED display showing exact battery percentage",
          "Built-in foldable metal kickstand for hands-free viewing",
          "Overheat and short-circuit protection",
          "Pocket-friendly 195g lightweight body"
        ]
      }
    }'::jsonb,
    '["https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?auto=format&fit=crop&w=900&q=80", "https://images.unsplash.com/photo-1585338107529-13afc5f02586?auto=format&fit=crop&w=900&q=80"]'::jsonb,
    true,
    true,
    true,
    112,
    now(),
    now()
  ),
  (
    'prod-3',
    'oshxona-uchun-aylanuvchi-ziravorlar-organayzeri',
    'ZVN-HOM-309',
    'Oshxona uchun 360° aylanuvchi koʻp funksiyali organayzer patnis',
    'cat-home',
    89000,
    null,
    45000,
    35,
    8,
    'active',
    'Ziravorlar, souslar va kosmetika vositalarini tartibli saqlash uchun 360 daraja aylanuvchi taglik.',
    'Shkaf ichidagi eng orqa qismda turgan buyumlarni ham bir harakat bilan olish imkonini beradi. Sirpanmaydigan silikon qoplamasi idishlarning tushib ketishini oldini oladi.',
    '["360 daraja ravon va shovqinsiz aylanish mexanizmi", "Sirpanishga qarshi maxsus ichki yuza", "Yuvish va tozalash juda oson", "Oshxona, vannaxona yoki muzlatkich ichida foydalanish mumkin"]'::jsonb,
    '[{"label": "Diametri", "value": "28 sm"}, {"label": "Balandligi", "value": "6.5 sm"}, {"label": "Material", "value": "Qalin oziq-ovqatga xavfsiz PET/ABS plastik"}]'::jsonb,
    '{
      "ru": {
        "name": "Кухонный вращающийся на 360° органайзер-поднос для специй",
        "shortDescription": "Нескользящая вращающаяся подставка 360° для специй, соусов и косметики.",
        "description": "Позволяет легко достать баночки даже из самой глубины кухонного шкафа или холодильника одним плавным поворотом. Нескользящее внутреннее покрытие удерживает предметы на месте."
      },
      "en": {
        "name": "360° Rotating Kitchen Spice & Pantry Organizer Tray",
        "shortDescription": "Non-slip 360-degree turntable tray for spices, condiments, and cosmetics.",
        "description": "Reach items at the back of cabinets or refrigerators with a single spin. Features a non-slip textured surface and raised rim to keep bottles secure."
      }
    }'::jsonb,
    '["https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=900&q=80"]'::jsonb,
    false,
    true,
    true,
    67,
    now(),
    now()
  ),
  (
    'prod-4',
    'harorat-korsatkichli-vakuum-termos-500ml',
    'ZVN-GFT-402',
    'Aqlli LED harorat ekranli zanglamas poʻlat termos (500 ml)',
    'cat-gifts',
    115000,
    85000,
    48000,
    4,
    5,
    'active',
    'Qopqogʻiga tegilganda ichimlik haroratini koʻrsatuvchi zamonaviy vakuumli termos.',
    'Issiq choy yoki qahvani 12 soatgacha issiq, salqin ichimliklarni esa uzoq vaqt muzdek saqlaydi. Ichki qismi SUS 304 markali oziq-ovqat poʻlatidan ishlangan va choy barglari uchun maxsus toʻrli filtrga ega.',
    '["Sensorli LED qopqoq — ichimlik haroratini darhol koʻrsatadi", "SUS 304 zanglamas tibbiy poʻlat kolba", "Choy damlash uchun olinadigan metall filtr-setka", "Sovgʻa qilishga tayyor chiroyli quti"]'::jsonb,
    '[{"label": "Hajmi", "value": "500 ml"}, {"label": "Material", "value": "SUS 304 zanglamas poʻlat"}, {"label": "Haroratni saqlash", "value": "12 soatgacha"}]'::jsonb,
    '{
      "ru": {
        "name": "Умный вакуумный термос из нержавеющей стали с LED-экраном (500 мл)",
        "shortDescription": "Современный термос с сенсорным датчиком температуры напитка на крышке.",
        "description": "Сохраняет чай или кофе горячими до 12 часов. Колба выполнена из пищевой нержавеющей стали SUS 304 и оснащена съемным ситечком для заваривания листового чая."
      },
      "en": {
        "name": "Smart LED Temperature Display Stainless Steel Thermos (500 ml)",
        "shortDescription": "Vacuum-insulated flask with touch-activated LED temperature readout.",
        "description": "Keeps beverages hot or cold for up to 12 hours. Crafted from food-grade SUS 304 stainless steel with a removable tea infuser mesh."
      }
    }'::jsonb,
    '["https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=900&q=80"]'::jsonb,
    false,
    true,
    false,
    143,
    now(),
    now()
  ),
  (
    'prod-5',
    'elektr-mini-blender-va-maydalagich-usb',
    'ZVN-HOM-512',
    'Simsiz akkumulyatorli oshxona mini-maydalagichi (250 ml)',
    'cat-home',
    135000,
    109000,
    62000,
    19,
    5,
    'active',
    'Sarimsoq, piyoz, koʻkat, yongʻoq va bolalar ovqatini 10 soniyada maydalovchi yordamchi.',
    'Katta kombaynni ishlatish shart boʻlmagan kundalik oz miqdordagi mahsulotlarni tez va oson maydalaydi. Bir tugmani bosish orqali ishlaydi, barcha qismlari oson ajraladi va yuviladi.',
    '["3 ta oʻtkir zanglamas poʻlat tigʻ", "Simsiz qulay ishlash (USB orqali quvvatlanadi)", "Suv oʻtkazmaydigan motor bloki", "Hid oʻziga tortmaydigan qalin idish"]'::jsonb,
    '[{"label": "Idish hajmi", "value": "250 ml"}, {"label": "Quvvati", "value": "30 Vt"}, {"label": "Tigʻlar soni", "value": "3 ta (zanglamas poʻlat)"}]'::jsonb,
    '{
      "ru": {
        "name": "Беспроводной кухонный мини-измельчитель на аккумуляторе (250 мл)",
        "shortDescription": "Измельчает чеснок, лук, зелень и орехи за 10 секунд одним нажатием.",
        "description": "Незаменимый помощник для быстрого измельчения небольших порций продуктов без громоздкого комбайна. Заряжается по USB, все части легко разбираются и моются."
      },
      "en": {
        "name": "Cordless USB Rechargeable Kitchen Mini Chopper (250 ml)",
        "shortDescription": "Chops garlic, onions, herbs, nuts, and baby food in 10 seconds.",
        "description": "Skip bulky food processors for everyday prep. One-touch operation with 3 stainless steel blades and a detachable, easy-to-wash bowl."
      }
    }'::jsonb,
    '["https://images.unsplash.com/photo-1570222094114-d054a817e56b?auto=format&fit=crop&w=900&q=80"]'::jsonb,
    true,
    false,
    true,
    51,
    now(),
    now()
  ),
  (
    'prod-6',
    'gan-65w-tez-quvvatlash-adapteri-3-portli',
    'ZVN-PHN-608',
    'GaN 65W ultra-tez quvvatlash adapteri (2x Type-C + 1x USB-A)',
    'cat-phone',
    210000,
    null,
    118000,
    14,
    4,
    'active',
    'Noutbuk, planshet va smartfonni bir vaqtning oʻzida tez quvvatlovchi GaN texnologiyali blok.',
    'Yangi avlod Galliy Nitrid (GaN) mikrochiplari tufayli oddiy quvvatlagichlardan 40% kichikroq va kamroq qiziydi. Bir vaqtning oʻzida 3 ta qurilmani xavfsiz quvvatlay oladi.',
    '["65W gacha yuqori quvvat — MacBook va ultrabuklarni ham quvvatlaydi", "3 ta port: 2 ta USB Type-C va 1 ta USB-A", "Aqlli quvvat taqsimlash tizimi", "Yevropa standartidagi mustahkam vilka"]'::jsonb,
    '[{"label": "Maksimal quvvat", "value": "65 Vt"}, {"label": "Portlar", "value": "USB-C1 (65W), USB-C2 (33W), USB-A (30W)"}, {"label": "Texnologiya", "value": "GaN Pro III"}]'::jsonb,
    '{
      "ru": {
        "name": "Ультрабыстрое зарядное устройство GaN 65W (2x Type-C + 1x USB-A)",
        "shortDescription": "Компактный блок GaN 65W для одновременной зарядки ноутбука и смартфона.",
        "description": "Благодаря чипам нитрида галлия (GaN) адаптер на 40% компактнее стандартных блоков и меньше нагревается. Безопасно заряжает до 3 устройств одновременно."
      },
      "en": {
        "name": "GaN 65W Ultra-Fast 3-Port Charger (2x USB-C + 1x USB-A)",
        "shortDescription": "Compact GaN III power adapter capable of charging laptops, tablets, and phones.",
        "description": "Powered by Gallium Nitride (GaN) technology, running cooler and 40% smaller than traditional laptop bricks while charging up to three devices simultaneously."
      }
    }'::jsonb,
    '["https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=900&q=80"]'::jsonb,
    true,
    false,
    true,
    39,
    now(),
    now()
  ),
  (
    'prod-7',
    'avtomobil-uchun-simsiz-changyutgich-pro',
    'ZVN-AUT-701',
    'Avtomobil va uy uchun ixcham simsiz qoʻl changyutgichi',
    'cat-auto',
    230000,
    185000,
    110000,
    3,
    5,
    'active',
    'Avtomobil oʻrindiqlari, klaviatura va tor joylarni tozalash uchun kuchli mini-changyutgich.',
    'Ikki tomonlama ishlaydi: changni tortib olish va havoni puflash funksiyasiga ega. Yuviladigan HEPA filtri mayda chang zarralarini ham ushlab qoladi.',
    '["3 xil maxsus uchlik (choʻtkali, uzun tor va puflash uchligi)", "Yuvib qayta ishlatiladigan HEPA filtr", "4000 mA/soat sigʻimli batareya", "Bardoshli saqlash xaltachasi bilan"]'::jsonb,
    '[{"label": "Tortish kuchi", "value": "9000 Pa"}, {"label": "Ishlash vaqti", "value": "25–30 daqiqa"}, {"label": "Ogʻirligi", "value": "360 gramm"}]'::jsonb,
    '{
      "ru": {
        "name": "Компактный беспроводной ручной пылесос для авто и дома",
        "shortDescription": "Мощный мини-пылесос для салона автомобиля, клавиатуры и труднодоступных мест.",
        "description": "Работает на всасывание и выдув. Моющийся фильтр HEPA задерживает мелкую пыль, а емкий аккумулятор обеспечивает до 30 минут уборки."
      },
      "en": {
        "name": "Compact Cordless Handheld Vacuum for Car & Home",
        "shortDescription": "High-suction mini vacuum cleaner for car seats, keyboards, and tight corners.",
        "description": "Dual-function suction and air-duster design with a washable HEPA filter and 4000 mAh battery providing up to 30 minutes of cordless runtime."
      }
    }'::jsonb,
    '["https://images.unsplash.com/photo-1558317374-067fb5f30001?auto=format&fit=crop&w=900&q=80"]'::jsonb,
    false,
    true,
    false,
    73,
    now(),
    now()
  ),
  (
    'prod-8',
    'ultrasonik-havo-namlagich-va-aroma-diffuzor',
    'ZVN-GFT-805',
    'Tungi chiroqli ultratovushli havo namlagich va aroma-diffuzor (400 ml)',
    'cat-gifts',
    149000,
    null,
    79000,
    0,
    4,
    'out_of_stock',
    'Xona havosini meʼyoriy namlikda saqlovchi, sokin ishlovchi zamonaviy namlagich.',
    'Quruq iqlim va isitish mavsumida xona hamda ofis havosini namlantirish uchun aʼlo tanlov. Suv tugaganda avtomatik oʻchish tizimi mavjud.',
    '["Shovqinsiz ultratovush texnologiyasi (25 dB dan past)", "Suv qolmaganda avtomatik xavfsiz oʻchish", "Mayin tungi yoritish chirogʻi", "Xushboʻy efir moylari bilan ishlash imkoni"]'::jsonb,
    '[{"label": "Suv idishi hajmi", "value": "400 ml"}, {"label": "Tavsiya etilgan xona maydoni", "value": "15–25 m²"}, {"label": "Ulanish", "value": "USB Type-C"}]'::jsonb,
    '{
      "ru": {
        "name": "Ультразвуковой увлажнитель воздуха и аромадиффузор с ночником (400 мл)",
        "shortDescription": "Тихий увлажнитель воздуха для спальни, детской и рабочего стола.",
        "description": "Поддерживает комфортную влажность воздуха в сухой климат и отопительный сезон. Автоматически отключается при нехватке воды."
      },
      "en": {
        "name": "Ultrasonic Air Humidifier & Aroma Diffuser with Night Light (400 ml)",
        "shortDescription": "Whisper-quiet cool mist humidifier for bedrooms and office desks.",
        "description": "Maintains comfortable indoor humidity during dry seasons. Features automatic waterless shut-off and a gentle ambient night light."
      }
    }'::jsonb,
    '["https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=900&q=80"]'::jsonb,
    false,
    false,
    true,
    62,
    now(),
    now()
  )
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 3. SEED INITIAL STOCK LOGS
-- -----------------------------------------------------------------------------
insert into public.stock_logs (
  id,
  product_id,
  product_name,
  sku,
  previous_stock,
  new_stock,
  change_amount,
  reason,
  updated_by,
  created_at
)
values
  (
    'log-seed-1',
    'prod-1',
    'Sensorli akkumulyatorli LED stol chirogʻi (3 xil yorugʻlik rejimi)',
    'ZVN-LED-101',
    14,
    24,
    10,
    'Yangi partiya qabul qilindi (Xitoy omboridan)',
    'Store Owner',
    now()
  ),
  (
    'log-seed-2',
    'prod-2',
    'Magnitli simsiz Powerbank 10 000 mAh (22.5W tez quvvatlash)',
    'ZVN-PWR-204',
    10,
    18,
    8,
    'Yangi partiya qabul qilindi (Xitoy omboridan)',
    'Store Owner',
    now()
  )
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 4. SEED STORE SETTINGS SINGLETON (id = 1)
-- Note: Humo and Uzcard card numbers are intentionally left blank ("") so
-- the store owner configures their real cards in Admin -> Toʻlov va Karta.
-- -----------------------------------------------------------------------------
insert into public.store_settings (id, payload, updated_at)
values (
  1,
  '{
    "storeName": "ZAVEN",
    "tagline": "Zamonaviy, foydali va hamyonbop mahsulotlar onlayn doʻkoni",
    "supportPhone": "",
    "supportTelegram": "",
    "instagramUrl": "https://instagram.com/zaven.uz",
    "instagramHandle": "@zaven.uz",
    "workingHours": "Dushanba – Shanba, 09:00 dan 20:00 gacha",
    "cityLocation": "Toshkent shahri, Oʻzbekiston",
    "seoTitle": "ZAVEN — Zamonaviy va foydali mahsulotlar onlayn doʻkoni",
    "seoDescription": "Xitoydan keltirilgan sifatli uy-roʻzgʻor buyumlari, telefon aksessuarlari va kundalik texnika vositalari.",
    "socialShareImage": "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?auto=format&fit=crop&w=1200&q=80",
    "trustItems": [
      {
        "id": "trust-1",
        "title": "Saralangan sifat nazorati",
        "description": "Har bir mahsulot omborga qabul qilinishidan oldin ZAVEN jamoasi tomonidan tekshiriladi.",
        "iconName": "ShieldCheck",
        "isEnabled": true
      },
      {
        "id": "trust-2",
        "title": "Tushunarli yetkazib berish shartlari",
        "description": "Taxminiy yetkazib berish muddati: Taxminan 10–25 kun. Hudud qoidalari ochiq koʻrsatiladi.",
        "iconName": "Truck",
        "isEnabled": true
      },
      {
        "id": "trust-3",
        "title": "Qulay toʻlov usullari",
        "description": "Humo / Uzcard kartaga oʻtkazma (chek yuklash bilan) yoki joyida naqd toʻlov.",
        "iconName": "CreditCard",
        "isEnabled": true
      },
      {
        "id": "trust-4",
        "title": "Mijozlar bilan tezkor aloqa",
        "description": "Savollaringiz boʻyicha telefon yoki Telegram orqali ish vaqtida murojaat qiling.",
        "iconName": "Headphones",
        "isEnabled": true
      }
    ],
    "delivery": {
      "isDeliveryEnabled": true,
      "generalDeliveryNote": "Taxminiy yetkazib berish muddati: Taxminan 10–25 kun (kafolatlangan aniq sana emas). Buyurtma tasdiqlangandan soʻng operator tomonidan aniqlashtiriladi.",
      "showDeliveryInfoOnProductPage": true,
      "regions": [
        {
          "id": "reg-tashkent",
          "regionName": "Toshkent shahri",
          "fee": 25000,
          "freeDeliveryThreshold": 400000,
          "note": "Toshkent shahri boʻylab yetkazib berish (Taxminan 10–25 kun).",
          "isEnabled": true
        },
        {
          "id": "reg-tashkent-vil",
          "regionName": "Toshkent viloyati",
          "fee": 35000,
          "freeDeliveryThreshold": 600000,
          "note": "Tuman markazlarigacha yetkazib berish (Taxminan 10–25 kun).",
          "isEnabled": true
        },
        {
          "id": "reg-regions",
          "regionName": "Boshqa viloyatlar (Samarqand, Buxoro, Fargʻona, Andijon, Namangan va b.)",
          "fee": 45000,
          "freeDeliveryThreshold": 800000,
          "note": "Hududiy kuryerlik yoki pochta orqali yetkazib berish (Taxminan 10–25 kun).",
          "isEnabled": true
        }
      ]
    },
    "paymentMethods": [
      {
        "id": "pay-card",
        "name": "Humo / Uzcard kartaga oʻtkazma (Chek yuklash bilan)",
        "description": "Koʻrsatilgan Humo yoki Uzcard kartasiga yakuniy summani oʻtkazing va toʻlov cheki skrinshotini yuklang.",
        "type": "card_transfer",
        "isEnabled": true,
        "isDemoMode": false,
        "configurationNote": "Karta rekvizitlari doʻkon egasi (Owner) tomonidan Toʻlov sozlamalarida kiritiladi."
      },
      {
        "id": "pay-cod",
        "name": "Qabul qilganda toʻlov (Naqd yoki terminal)",
        "description": "Buyurtmani qoʻlingizga olganingizda naqd pul yoki terminal orqali toʻlash.",
        "type": "cash",
        "isEnabled": true,
        "isDemoMode": false,
        "configurationNote": "Joyida toʻlov qabul qilish faol."
      }
    ],
    "bankTransfer": {
      "isEnabled": true,
      "humoCardNumber": "",
      "humoCardHolder": "",
      "uzcardCardNumber": "",
      "uzcardCardHolder": "",
      "bankName": "",
      "transferInstructions": "Iltimos, buyurtmaning aniq yakuniy summasini koʻrsatilgan Humo yoki Uzcard kartasiga oʻtkazing va toʻlov cheki (skrinshot yoki PDF) faylini quyidagi maydonga yuklang. Chek doʻkon egasi tomonidan tekshirilgach buyurtma tasdiqlanadi."
    }
  }'::jsonb,
  now()
)
on conflict (id) do nothing;

commit;
