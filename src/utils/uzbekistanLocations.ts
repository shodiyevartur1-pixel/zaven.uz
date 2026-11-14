import { DeliveryRegionRule } from '../types';

export interface UzbekistanRegionOption {
  id: string;
  nameUz: string;
  nameRu: string;
  nameEn: string;
  tariffGroup: 'tashkent_city' | 'tashkent_region' | 'other_regions';
  districts: string[];
  approxCenter: {
    lat: number;
    lng: number;
  };
  approxBounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
}

export const UZBEKISTAN_REGIONS: UzbekistanRegionOption[] = [
  {
    id: 'uz-toshkent-sh',
    nameUz: 'Toshkent shahri',
    nameRu: 'г. Ташкент',
    nameEn: 'Tashkent City',
    tariffGroup: 'tashkent_city',
    districts: [
      'Yunusobod tumani',
      'Chilonzor tumani',
      'Mirzo Ulugʻbek tumani',
      'Shayxontohur tumani',
      'Yakkasaroy tumani',
      'Mirobod tumani',
      'Olmazor tumani',
      'Uchtepa tumani',
      'Sergeli tumani',
      'Yashnobod tumani',
      'Yangihayot tumani',
      'Bektemir tumani',
    ],
    approxCenter: { lat: 41.31108, lng: 69.24056 },
    approxBounds: { minLat: 41.18, maxLat: 41.4, minLng: 69.12, maxLng: 69.42 },
  },
  {
    id: 'uz-toshkent-vil',
    nameUz: 'Toshkent viloyati',
    nameRu: 'Ташкентская область',
    nameEn: 'Tashkent Region',
    tariffGroup: 'tashkent_region',
    districts: [
      'Nurafshon shahri',
      'Chirchiq shahri',
      'Olmaliq shahri',
      'Angren shahri',
      'Bekobod shahri',
      'Yangiyoʻl shahri',
      'Qibray tumani',
      'Zangiota tumani',
      'Toshkent tumani',
      'Boʻstonliq tumani',
      'Parkent tumani',
      'Oʻrtachirchiq tumani',
    ],
    approxCenter: { lat: 41.0416, lng: 69.3578 },
    approxBounds: { minLat: 40.6, maxLat: 41.8, minLng: 68.6, maxLng: 70.5 },
  },
  {
    id: 'uz-samarqand',
    nameUz: 'Samarqand viloyati',
    nameRu: 'Самаркандская область',
    nameEn: 'Samarkand Region',
    tariffGroup: 'other_regions',
    districts: [
      'Samarqand shahri',
      'Kattaqoʻrgʻon shahri',
      'Urgut tumani',
      'Pastdargʻom tumani',
      'Samarqand tumani',
      'Toyloq tumani',
      'Oqdaryo tumani',
      'Ishtixon tumani',
      'Bulungʻur tumani',
      'Jomboy tumani',
    ],
    approxCenter: { lat: 39.65417, lng: 66.95972 },
    approxBounds: { minLat: 39.2, maxLat: 40.3, minLng: 65.5, maxLng: 67.6 },
  },
  {
    id: 'uz-buxoro',
    nameUz: 'Buxoro viloyati',
    nameRu: 'Бухарская область',
    nameEn: 'Bukhara Region',
    tariffGroup: 'other_regions',
    districts: [
      'Buxoro shahri',
      'Kogon shahri',
      'Gʻijduvon tumani',
      'Buxoro tumani',
      'Vobkent tumani',
      'Jondor tumani',
      'Qorakoʻl tumani',
      'Shofirkon tumani',
    ],
    approxCenter: { lat: 39.77472, lng: 64.42861 },
    approxBounds: { minLat: 39.1, maxLat: 40.8, minLng: 63.3, maxLng: 65.2 },
  },
  {
    id: 'uz-fargona',
    nameUz: 'Fargʻona viloyati',
    nameRu: 'Ферганская область',
    nameEn: 'Fergana Region',
    tariffGroup: 'other_regions',
    districts: [
      'Fargʻona shahri',
      'Qoʻqon shahri',
      'Margʻilon shahri',
      'Quvasoy shahri',
      'Oltiariq tumani',
      'Quva tumani',
      'Rishton tumani',
      'Uchkoʻprik tumani',
    ],
    approxCenter: { lat: 40.38421, lng: 71.78432 },
    approxBounds: { minLat: 40.1, maxLat: 40.7, minLng: 70.3, maxLng: 72.1 },
  },
  {
    id: 'uz-andijon',
    nameUz: 'Andijon viloyati',
    nameRu: 'Андижанская область',
    nameEn: 'Andijan Region',
    tariffGroup: 'other_regions',
    districts: [
      'Andijon shahri',
      'Xonobod shahri',
      'Asaka tumani',
      'Shahrixon tumani',
      'Andijon tumani',
      'Baliqchi tumani',
      'Qoʻrgʻontepa tumani',
      'Marhamat tumani',
    ],
    approxCenter: { lat: 40.78206, lng: 72.34424 },
    approxBounds: { minLat: 40.5, maxLat: 41.0, minLng: 71.8, maxLng: 73.0 },
  },
  {
    id: 'uz-namangan',
    nameUz: 'Namangan viloyati',
    nameRu: 'Наманганская область',
    nameEn: 'Namangan Region',
    tariffGroup: 'other_regions',
    districts: [
      'Namangan shahri',
      'Chust tumani',
      'Toʻraqoʻrgʻon tumani',
      'Kosonsoy tumani',
      'Uychi tumani',
      'Chortoq tumani',
      'Pop tumani',
      'Yangiqoʻrgʻon tumani',
    ],
    approxCenter: { lat: 40.9983, lng: 71.67257 },
    approxBounds: { minLat: 40.7, maxLat: 41.4, minLng: 70.6, maxLng: 72.0 },
  },
  {
    id: 'uz-qashqadaryo',
    nameUz: 'Qashqadaryo viloyati',
    nameRu: 'Кашкадарьинская область',
    nameEn: 'Kashkadarya Region',
    tariffGroup: 'other_regions',
    districts: [
      'Qarshi shahri',
      'Shahrisabz shahri',
      'Koson tumani',
      'Kitob tumani',
      'Gʻuzor tumani',
      'Chiroqchi tumani',
      'Qamashi tumani',
      'Muborak tumani',
    ],
    approxCenter: { lat: 38.86056, lng: 65.78905 },
    approxBounds: { minLat: 38.3, maxLat: 39.4, minLng: 64.8, maxLng: 67.3 },
  },
  {
    id: 'uz-surxondaryo',
    nameUz: 'Surxondaryo viloyati',
    nameRu: 'Сурхандарьинская область',
    nameEn: 'Surkhandarya Region',
    tariffGroup: 'other_regions',
    districts: [
      'Termiz shahri',
      'Denov tumani',
      'Sherobod tumani',
      'Boysun tumani',
      'Jarqoʻrgʻon tumani',
      'Qumqoʻrgʻon tumani',
      'Sariosiyo tumani',
    ],
    approxCenter: { lat: 37.22417, lng: 67.27833 },
    approxBounds: { minLat: 37.1, maxLat: 38.7, minLng: 66.5, maxLng: 68.4 },
  },
  {
    id: 'uz-navoiy',
    nameUz: 'Navoiy viloyati',
    nameRu: 'Навоийская область',
    nameEn: 'Navoi Region',
    tariffGroup: 'other_regions',
    districts: [
      'Navoiy shahri',
      'Zarafshon shahri',
      'Karmana tumani',
      'Qiziltepa tumani',
      'Xatirchi tumani',
      'Nurota tumani',
      'Uchquduq tumani',
    ],
    approxCenter: { lat: 40.08444, lng: 65.37917 },
    approxBounds: { minLat: 39.8, maxLat: 43.0, minLng: 62.5, maxLng: 66.2 },
  },
  {
    id: 'uz-jizzax',
    nameUz: 'Jizzax viloyati',
    nameRu: 'Джизакская область',
    nameEn: 'Jizzakh Region',
    tariffGroup: 'other_regions',
    districts: [
      'Jizzax shahri',
      'Sharof Rashidov tumani',
      'Zomin tumani',
      'Gʻallaorol tumani',
      'Doʻstlik tumani',
      'Paxtakor tumani',
    ],
    approxCenter: { lat: 40.11583, lng: 67.84222 },
    approxBounds: { minLat: 39.6, maxLat: 40.9, minLng: 67.2, maxLng: 68.9 },
  },
  {
    id: 'uz-sirdaryo',
    nameUz: 'Sirdaryo viloyati',
    nameRu: 'Сырдарьинская область',
    nameEn: 'Syrdarya Region',
    tariffGroup: 'other_regions',
    districts: [
      'Guliston shahri',
      'Yangiyer shahri',
      'Shirin shahri',
      'Sirdaryo tumani',
      'Boyovut tumani',
      'Mirzaobod tumani',
    ],
    approxCenter: { lat: 40.48972, lng: 68.78417 },
    approxBounds: { minLat: 40.1, maxLat: 40.9, minLng: 68.4, maxLng: 69.2 },
  },
  {
    id: 'uz-xorazm',
    nameUz: 'Xorazm viloyati',
    nameRu: 'Хорезмская область',
    nameEn: 'Khorezm Region',
    tariffGroup: 'other_regions',
    districts: [
      'Urganch shahri',
      'Xiva shahri',
      'Hazorasp tumani',
      'Xonqa tumani',
      'Shovot tumani',
      'Gurlan tumani',
      'Bogʻot tumani',
    ],
    approxCenter: { lat: 41.55, lng: 60.63333 },
    approxBounds: { minLat: 41.1, maxLat: 42.0, minLng: 60.0, maxLng: 61.5 },
  },
  {
    id: 'uz-qoraqalpogiston',
    nameUz: 'Qoraqalpogʻiston Respublikasi',
    nameRu: 'Республика Каракалпакстан',
    nameEn: 'Republic of Karakalpakstan',
    tariffGroup: 'other_regions',
    districts: [
      'Nukus shahri',
      'Toʻrtkoʻl tumani',
      'Beruniy tumani',
      'Xoʻjayli tumani',
      'Qoʻngʻirot tumani',
      'Amudaryo tumani',
      'Chimboy tumani',
    ],
    approxCenter: { lat: 42.4602, lng: 59.6166 },
    approxBounds: { minLat: 41.2, maxLat: 45.5, minLng: 56.0, maxLng: 61.5 },
  },
];

/**
 * Matches a chosen Uzbekistan region against the store owner's configured DeliveryRegionRule list.
 * Never invents prices: returns null if no rule matches or no rules are enabled.
 */
export function resolveRegionTariffRule(
  selectedRegionName: string,
  enabledRules: DeliveryRegionRule[]
): DeliveryRegionRule | null {
  if (enabledRules.length === 0) return null;

  const normalized = selectedRegionName.toLowerCase();

  const directMatch = enabledRules.find(
    (r) =>
      r.regionName.toLowerCase() === normalized ||
      r.regionName.toLowerCase().includes(normalized) ||
      normalized.includes(r.regionName.toLowerCase())
  );
  if (directMatch) return directMatch;

  const regionMeta = UZBEKISTAN_REGIONS.find(
    (reg) =>
      reg.nameUz.toLowerCase() === normalized ||
      reg.nameRu.toLowerCase() === normalized ||
      reg.nameEn.toLowerCase() === normalized
  );

  if (regionMeta?.tariffGroup === 'tashkent_city') {
    return (
      enabledRules.find(
        (r) =>
          r.id === 'reg-tashkent' ||
          r.regionName.toLowerCase().includes('toshkent sh')
      ) || null
    );
  }

  if (regionMeta?.tariffGroup === 'tashkent_region') {
    return (
      enabledRules.find(
        (r) =>
          r.id === 'reg-tashkent-vil' ||
          r.regionName.toLowerCase().includes('viloyat')
      ) || null
    );
  }

  if (regionMeta?.tariffGroup === 'other_regions') {
    return (
      enabledRules.find(
        (r) =>
          r.id === 'reg-regions' ||
          r.regionName.toLowerCase().includes('boshqa')
      ) || null
    );
  }

  return null;
}

/**
 * Matches coordinates to the closest Uzbekistan region (first by bounding box, then by nearest center).
 */
export function detectUzbekistanRegionFromCoords(
  lat: number,
  lng: number
): UzbekistanRegionOption | null {
  for (const reg of UZBEKISTAN_REGIONS) {
    const b = reg.approxBounds;
    if (
      lat >= b.minLat &&
      lat <= b.maxLat &&
      lng >= b.minLng &&
      lng <= b.maxLng
    ) {
      return reg;
    }
  }

  // Fallback to closest regional center if within broader Uzbekistan bounds
  if (lat >= 36.8 && lat <= 46.0 && lng >= 55.5 && lng <= 73.8) {
    let closest: UzbekistanRegionOption | null = null;
    let minDistance = Infinity;
    for (const reg of UZBEKISTAN_REGIONS) {
      const dLat = lat - reg.approxCenter.lat;
      const dLng = lng - reg.approxCenter.lng;
      const dist = dLat * dLat + dLng * dLng;
      if (dist < minDistance) {
        minDistance = dist;
        closest = reg;
      }
    }
    return closest;
  }

  return null;
}

/**
 * Normalizes Uzbek/Russian/English location strings for reliable matching:
 * strips apostrophes (ʻ, ʼ, ', `), suffixes (viloyati, tumani, shahri, область, район, г., region, district, city),
 * and extra punctuation.
 */
function normalizeGeoToken(input: string | undefined | null): string {
  if (!input) return '';
  return input
    .toLowerCase()
    .replace(/[ʻʼ'`´']/g, '')
    .replace(/o‘|o’/g, 'o')
    .replace(/g‘|g’/g, 'g')
    .replace(
      /\b(viloyati|viloyat|respublikasi|respublika|tumani|tuman|shahri|shahar|область|район|город|республика|region|province|district|city|town)\b/gi,
      ' '
    )
    .replace(/[^a-z0-9а-яё\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const REGION_KEYWORDS: Record<string, string[]> = {
  'uz-toshkent-sh': ['toshkent shahri', 'tashkent city', 'ташкент'],
  'uz-toshkent-vil': [
    'toshkent viloyati',
    'tashkent region',
    'tashkent province',
    'ташкентская',
  ],
  'uz-samarqand': ['samarqand', 'samarkand', 'самарканд'],
  'uz-buxoro': ['buxoro', 'bukhara', 'бухар'],
  'uz-fargona': ['fargona', 'fergana', 'ferghana', 'ферган'],
  'uz-andijon': ['andijon', 'andijan', 'андижан'],
  'uz-namangan': ['namangan', 'наманган'],
  'uz-qashqadaryo': [
    'qashqadaryo',
    'kashkadarya',
    'qashqadaryo',
    'кашкадарь',
    'qarshi',
    'карши',
  ],
  'uz-surxondaryo': [
    'surxondaryo',
    'surkhandarya',
    'сурхандарь',
    'termiz',
    'термез',
  ],
  'uz-navoiy': ['navoiy', 'navoi', 'навои'],
  'uz-jizzax': ['jizzax', 'jizzakh', 'джизак'],
  'uz-sirdaryo': ['sirdaryo', 'syrdarya', 'сырдарь', 'guliston', 'гулистан'],
  'uz-xorazm': ['xorazm', 'khorezm', 'хорезм', 'urganch', 'ургенч', 'xiva'],
  'uz-qoraqalpogiston': [
    'qoraqalpogiston',
    'karakalpakstan',
    'каракалпакстан',
    'nukus',
    'нукус',
  ],
};

const DISTRICT_CYRILLIC_ALIASES: Record<string, string[]> = {
  'Qarshi shahri': ['qarshi', 'karshi', 'карши'],
  'Shahrisabz shahri': ['shahrisabz', 'shakhrisabz', 'шахрисабз'],
  'Samarqand shahri': ['samarqand', 'samarkand', 'самарканд'],
  'Buxoro shahri': ['buxoro', 'bukhara', 'бухара'],
  'Fargʻona shahri': ['fargona', 'fergana', 'фергана'],
  'Qoʻqon shahri': ['qoqon', 'kokand', 'коканд'],
  'Margʻilon shahri': ['margilon', 'margilan', 'маргилан'],
  'Andijon shahri': ['andijon', 'andijan', 'андижан'],
  'Namangan shahri': ['namangan', 'наманган'],
  'Termiz shahri': ['termiz', 'termez', 'термез'],
  'Navoiy shahri': ['navoiy', 'navoi', 'навои'],
  'Jizzax shahri': ['jizzax', 'jizzakh', 'джизак'],
  'Guliston shahri': ['guliston', 'gulistan', 'гулистан'],
  'Urganch shahri': ['urganch', 'urgench', 'ургенч'],
  'Xiva shahri': ['xiva', 'khiva', 'хива'],
  'Nukus shahri': ['nukus', 'нукус'],
  'Chirchiq shahri': ['chirchiq', 'chirchik', 'чирчик'],
  'Olmaliq shahri': ['olmaliq', 'almalyk', 'алмалык'],
  'Angren shahri': ['angren', 'ангрен'],
  'Bekobod shahri': ['bekobod', 'bekabad', 'бекабад'],
  'Nurafshon shahri': ['nurafshon', 'нурафшон'],
  'Yunusobod tumani': ['yunusobod', 'yunusabad', 'юнусабад'],
  'Chilonzor tumani': ['chilonzor', 'chilanzar', 'чиланзар'],
  'Mirzo Ulugʻbek tumani': [
    'mirzo ulugbek',
    'mirzo-ulugbek',
    'мирзо улугбек',
    'мирзо-улугбек',
  ],
  'Shayxontohur tumani': ['shayxontohur', 'shaykhantakhur', 'шайхантахур'],
  'Yakkasaroy tumani': ['yakkasaroy', 'yakkasaray', 'яккасарай'],
  'Mirobod tumani': ['mirobod', 'mirabad', 'мирабад'],
  'Olmazor tumani': ['olmazor', 'almazar', 'алмазар'],
  'Uchtepa tumani': ['uchtepa', 'учтепа'],
  'Sergeli tumani': ['sergeli', 'сергели'],
  'Yashnobod tumani': ['yashnobod', 'yashnabad', 'яшнабад'],
  'Yangihayot tumani': ['yangihayot', 'янгихаёт'],
  'Bektemir tumani': ['bektemir', 'бектемир'],
};

export interface GeocodeLocationMatchResult {
  matchedRegion: UzbekistanRegionOption | null;
  matchedDistrict: string | null;
  isConfidentRegion: boolean;
  isConfidentDistrict: boolean;
}

/**
 * Confidently matches a Nominatim reverse-geocode payload + coordinates against
 * the project's real UZBEKISTAN_REGIONS and districts data.
 * Never guesses a district if it doesn't match the geocoded locality/district fields.
 */
export function matchUzbekistanRegionAndDistrictFromGeocode(
  addressObj: Record<string, string | undefined> | undefined,
  displayName: string | undefined,
  lat: number,
  lng: number
): GeocodeLocationMatchResult {
  // Outside Uzbekistan geographic bounds
  if (lat < 36.8 || lat > 46.0 || lng < 55.5 || lng > 73.8) {
    return {
      matchedRegion: null,
      matchedDistrict: null,
      isConfidentRegion: false,
      isConfidentDistrict: false,
    };
  }

  const rawState = addressObj?.state || addressObj?.region || '';
  const rawCity =
    addressObj?.city ||
    addressObj?.town ||
    addressObj?.municipality ||
    addressObj?.village ||
    '';
  const rawCounty =
    addressObj?.county ||
    addressObj?.city_district ||
    addressObj?.suburb ||
    addressObj?.borough ||
    '';

  const combinedText = `${rawState} ${rawCounty} ${rawCity} ${
    displayName || ''
  }`
    .toLowerCase()
    .replace(/[ʻʼ'`´']/g, '');

  let matchedRegion: UzbekistanRegionOption | null = null;

  // 1. Distinguish Tashkent City vs Tashkent Region first
  const tashkentCityBounds = UZBEKISTAN_REGIONS[0].approxBounds;
  const isInsideTashkentCityBounds =
    lat >= tashkentCityBounds.minLat &&
    lat <= tashkentCityBounds.maxLat &&
    lng >= tashkentCityBounds.minLng &&
    lng <= tashkentCityBounds.maxLng;

  if (
    combinedText.includes('toshkent viloyati') ||
    combinedText.includes('tashkent region') ||
    combinedText.includes('ташкентская область')
  ) {
    matchedRegion =
      UZBEKISTAN_REGIONS.find((r) => r.id === 'uz-toshkent-vil') || null;
  } else if (
    (combinedText.includes('toshkent') ||
      combinedText.includes('tashkent') ||
      combinedText.includes('ташкент')) &&
    isInsideTashkentCityBounds
  ) {
    matchedRegion =
      UZBEKISTAN_REGIONS.find((r) => r.id === 'uz-toshkent-sh') || null;
  }

  // 2. Match other regions by explicit state/region/city keywords
  if (!matchedRegion) {
    for (const reg of UZBEKISTAN_REGIONS) {
      if (reg.id === 'uz-toshkent-sh') continue;
      const keywords = REGION_KEYWORDS[reg.id] || [];
      if (keywords.some((kw) => combinedText.includes(kw))) {
        matchedRegion = reg;
        break;
      }
    }
  }

  // 3. Fallback to non-overlapping bounding box only if unambiguous
  if (!matchedRegion) {
    const bboxMatches = UZBEKISTAN_REGIONS.filter((reg) => {
      const b = reg.approxBounds;
      return (
        lat >= b.minLat && lat <= b.maxLat && lng >= b.minLng && lng <= b.maxLng
      );
    });
    if (bboxMatches.length === 1) {
      matchedRegion = bboxMatches[0];
    }
  }

  if (!matchedRegion) {
    return {
      matchedRegion: null,
      matchedDistrict: null,
      isConfidentRegion: false,
      isConfidentDistrict: false,
    };
  }

  // 4. Match District within the identified Region (or across regions if a specific city/district matched)
  const candidateTokens = [
    normalizeGeoToken(rawCounty),
    normalizeGeoToken(rawCity),
    normalizeGeoToken(displayName),
  ].filter(Boolean);

  let matchedDistrict: string | null = null;

  for (const dist of matchedRegion.districts) {
    const baseDistToken = normalizeGeoToken(dist);
    const aliases = [
      baseDistToken,
      ...(DISTRICT_CYRILLIC_ALIASES[dist] || []),
    ].filter(Boolean);

    const isHit = aliases.some(
      (alias) =>
        alias.length >= 3 &&
        (candidateTokens.some((tok) => tok.includes(alias)) ||
          combinedText.includes(alias))
    );

    if (isHit) {
      matchedDistrict = dist;
      break;
    }
  }

  return {
    matchedRegion,
    matchedDistrict,
    isConfidentRegion: Boolean(matchedRegion),
    isConfidentDistrict: Boolean(matchedDistrict),
  };
}

