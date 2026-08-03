// Service categories for market segmentation
// US/Europe: emphasize scientific approach, practical benefits, data-driven
// Southeast Asia: emphasize lineage authenticity, traditional framework, cultural resonance
export const serviceCategories = {
  personal: { id: 'personal', titleKey: 'services.cat_personal', titleText: 'Personal Energy Reading' },
  home: { id: 'home', titleKey: 'services.cat_home', titleText: 'Home & Space Harmony' },
  business: { id: 'business', titleKey: 'services.cat_business', titleText: 'Business & Office' },
  premium: { id: 'premium', titleKey: 'services.cat_premium', titleText: 'VIP Exclusive' },
};

export const services = [
  {
    id: 1,
    category: 'personal',
    titleKey: "services.service_1_title",
    descKey: "services.service_1_desc",
    price: "$199",
    priceUsd: 199,
    popular: false,
    features: 4,
    // US/EU positioning: "Data-driven personal energy analysis"
    // SEA positioning: "Traditional BaZi destiny reading"
  },
  {
    id: 2,
    category: 'personal',
    titleKey: "services.service_2_title",
    descKey: "services.service_2_desc",
    price: "$299",
    priceUsd: 299,
    popular: true,
    features: 5,
  },
  {
    id: 3,
    category: 'home',
    titleKey: "services.service_3_title",
    descKey: "services.service_3_desc",
    price: "$599",
    priceUsd: 599,
    popular: false,
    features: 5,
  },
  {
    id: 4,
    category: 'business',
    titleKey: "services.service_4_title",
    descKey: "services.service_4_desc",
    price: "$899",
    priceUsd: 899,
    popular: false,
    features: 5,
  },
  {
    id: 5,
    category: 'premium',
    titleKey: "services.service_5_title",
    descKey: "services.service_5_desc",
    price: "$1999",
    priceUsd: 1999,
    vip: true,
    features: 6,
  }
];
