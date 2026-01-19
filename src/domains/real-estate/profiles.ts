/**
 * Rich location profiles and property detail generators for natural prospectus generation
 */

// Street name components for generating fictional addresses
export const streetNames: Record<string, string[]> = {
  oslo_cbd: [
    "Cort Adelers gate", "Dronning Mauds gate", "Haakon VIIs gate", "Ruseløkkveien",
    "Tordenskiolds gate", "Munkedamsveien", "Kronprinsens gate", "Filipstad brygge",
    "Brynjulf Bulls plass", "Dokkveien"
  ],
  oslo_centre: [
    "Karl Johans gate", "Stortingsgata", "Grensen", "Prinsens gate", "Tollbugata",
    "Rådhusgata", "Kristian IVs gate", "Nedre Slottsgate", "Øvre Slottsgate",
    "Kirkegata", "Kongens gate", "Dronningens gate"
  ],
  oslo_skoyen: [
    "Drammensveien", "Hoffsveien", "Karenslyst allé", "Professor Koths vei",
    "Hoff Terrasse", "Sjølyst plass", "Verkstedveien", "Harbitzalléen",
    "Bestumveien", "Vollsveien"
  ],
  oslo_lysaker: [
    "Lysaker Torg", "Strandveien", "Vollsveien", "Professor Kohts vei",
    "Lilleakerveien", "Oksenøyveien", "Fornebuveien", "Philip Pedersens vei",
    "Snarøyveien", "Granfossveien"
  ],
  oslo_east: [
    "Grenseveien", "Ensjøveien", "Gladengveien", "Strømsveien", "Økernveien",
    "Helsfyr plass", "Fyrstikkalléen", "Tvetenveien", "Hasleveien", "Lørenveien"
  ],
  oslo_south: [
    "Mosseveien", "Kongensgate", "Nordstrandveien", "Ekebergveien", "Ryen senter",
    "Manglerud senter", "Lambertseterveien", "Holmlia senter", "Rosenholm gate"
  ],
  stavanger: [
    "Verksgata", "Klubbgata", "Lagårdsveien", "Kannikgata", "Pedersgata",
    "Løkkeveien", "Haakon VIIs gate", "Olav Vs gate", "Kongsgata", "Kirkegata",
    "Breigata", "Hetlandsgata"
  ],
  bergen: [
    "Torgallmenningen", "Strandgaten", "Bryggen", "Lars Hilles gate", "Nygårdsgaten",
    "Christies gate", "Kaigaten", "Vågsallmenningen", "Kong Oscars gate",
    "Marken", "Vestre Strømkaien"
  ],
  trondheim: [
    "Munkegata", "Nordre gate", "Søndre gate", "Olav Tryggvasons gate",
    "Kongens gate", "Dronningens gate", "Thomas Angells gate", "Erling Skakkes gate",
    "Fjordgata", "Brattørgata", "Krambugata"
  ],
  other: [
    "Storgata", "Kirkegata", "Sjøgata", "Torggata", "Havnegata",
    "Jernbanegata", "Industrigata", "Parkveien", "Sentrumsveien"
  ],
  retail: [
    "Stortorvet", "Torggata", "Bogstadveien", "Hegdehaugsveien", "Thereses gate",
    "Majorstuen senter", "CC Vest", "Storo senter", "Oslo City"
  ],
  logistics: [
    "Industriveien", "Lagerveien", "Terminalveien", "Logistikkveien", "Næringsparken",
    "Bedriftsveien", "Transportveien", "Godsterminalen"
  ],
  hotel: [
    "Hotellplassen", "Strandpromenaden", "Parkveien", "Sentrum",
    "Konferanseveien", "Turistveien"
  ],
  residential: [
    "Parkallén", "Solveien", "Kirkeveien", "Skogsveien", "Fjellveien",
    "Bakkegata", "Hageveien", "Blomsterveien"
  ]
};

// Location contexts for each anchor type
export interface LocationProfile {
  districts: string[];
  landmarks: string[];
  transport: string[];
  characteristics: string[];
  neighborhoods: string[];
}

export const locationProfiles: Record<string, LocationProfile> = {
  office_oslo_cbd: {
    districts: ["Vika", "Aker Brygge", "Tjuvholmen", "Filipstad"],
    landmarks: [
      "Nationaltheatret", "Oslo City Hall", "Nasjonalmuseet", "Nobel Peace Center",
      "Aker Brygge marina", "Royal Palace", "Astrup Fearnley Museum"
    ],
    transport: [
      "Nationaltheatret station (all metro lines, regional rail, airport express)",
      "frequent tram and bus services from Aker Brygge",
      "ferry terminal to Nesodden",
      "direct T-bane access"
    ],
    characteristics: [
      "established central business district",
      "dense mixed-use inner-city fabric",
      "diplomatic and institutional presence",
      "premium office location with waterfront proximity"
    ],
    neighborhoods: ["Frogner", "Sentrum", "Bygdøy"]
  },
  office_oslo_centre: {
    districts: ["Sentrum", "Kvadraturen", "Bankplassen", "Grensen"],
    landmarks: [
      "Oslo Cathedral", "Parliament building", "Central Station", "Opera House",
      "Munch Museum", "Oslo Stock Exchange"
    ],
    transport: [
      "Oslo Central Station (all lines)",
      "Jernbanetorget metro hub",
      "extensive tram network",
      "national rail connections"
    ],
    characteristics: [
      "historic city centre",
      "retail and commercial core",
      "cultural institutions",
      "pedestrian-friendly zones"
    ],
    neighborhoods: ["Grünerløkka", "Gamlebyen", "Grønland"]
  },
  office_oslo_skoyen: {
    districts: ["Skøyen", "Bestum", "Hoff"],
    landmarks: [
      "Skøyen station", "Sjølyst shopping", "CC Vest", "Hoff Park"
    ],
    transport: [
      "Skøyen station (regional trains, local trains)",
      "bus connections to city centre",
      "proximity to E18 motorway"
    ],
    characteristics: [
      "established office cluster",
      "suburban character with urban density",
      "waterfront development potential",
      "mixed residential and commercial"
    ],
    neighborhoods: ["Ullern", "Frogner", "Majorstuen"]
  },
  office_oslo_lysaker: {
    districts: ["Lysaker", "Fornebu", "Sandvika"],
    landmarks: [
      "Lysaker station", "Fornebu", "Telenor headquarters", "Statoil building"
    ],
    transport: [
      "Lysaker station (regional trains)",
      "bus connections to Fornebu and Oslo",
      "E18 motorway access",
      "planned Fornebubanen metro"
    ],
    characteristics: [
      "corporate headquarters location",
      "modern office parks",
      "proximity to Bærum municipality",
      "tech and telecom cluster"
    ],
    neighborhoods: ["Bærum", "Fornebu", "Høvik"]
  },
  office_oslo_east: {
    districts: ["Helsfyr", "Økern", "Løren", "Ensjø", "Hasle"],
    landmarks: [
      "Helsfyr T-bane", "Økern Portal", "Valle Hovin", "Hasle Line development"
    ],
    transport: [
      "Helsfyr metro station",
      "Ring 3 road access",
      "bus connections throughout eastern Oslo"
    ],
    characteristics: [
      "emerging office location",
      "urban transformation area",
      "more affordable rents than central areas",
      "improving infrastructure"
    ],
    neighborhoods: ["Alna", "Bjerke", "Grorud"]
  },
  office_oslo_south: {
    districts: ["Ryen", "Manglerud", "Lambertseter", "Nordstrand"],
    landmarks: [
      "Ryen T-bane", "Manglerud shopping", "Nordstrand station"
    ],
    transport: [
      "Ryen metro station",
      "E6 motorway access",
      "suburban train connections"
    ],
    characteristics: [
      "suburban office location",
      "lower cost profile",
      "residential surroundings",
      "car-dependent access"
    ],
    neighborhoods: ["Østensjø", "Nordstrand", "Søndre Nordstrand"]
  },
  office_stavanger: {
    districts: ["Sentrum", "Forus", "Dusavika", "Jåttåvågen"],
    landmarks: [
      "Stavanger Cathedral", "Norwegian Petroleum Museum", "Vågen harbour"
    ],
    transport: [
      "Stavanger station (regional trains)",
      "Flesland airport connection",
      "extensive bus network"
    ],
    characteristics: [
      "energy sector headquarters",
      "international business presence",
      "oil and gas industry hub",
      "compact city centre"
    ],
    neighborhoods: ["Eiganes", "Våland", "Storhaug"]
  },
  office_bergen: {
    districts: ["Sentrum", "Marineholmen", "Laksevåg", "Sandsli"],
    landmarks: [
      "Bryggen UNESCO site", "Fløibanen funicular", "Fish Market", "Bergenhus Fortress"
    ],
    transport: [
      "Bergen light rail (Bybanen)",
      "Bergen station (regional trains)",
      "Flesland airport"
    ],
    characteristics: [
      "historic trading city",
      "maritime and shipping industry",
      "university city",
      "scenic harbour location"
    ],
    neighborhoods: ["Bergenhus", "Årstad", "Fyllingsdalen"]
  },
  office_trondheim: {
    districts: ["Midtbyen", "Lade", "Sluppen", "Tyholt"],
    landmarks: [
      "Nidaros Cathedral", "NTNU university", "Bakklandet", "Solsiden"
    ],
    transport: [
      "Trondheim S station",
      "Værnes airport connection",
      "tram and bus network"
    ],
    characteristics: [
      "university and tech city",
      "historic centre",
      "startup and innovation hub",
      "SINTEF research presence"
    ],
    neighborhoods: ["Byåsen", "Lerkendal", "Moholt"]
  },
  office_other: {
    districts: ["City centre", "Industrial area", "Business park"],
    landmarks: [
      "Town hall", "Main street", "Railway station"
    ],
    transport: [
      "Regional bus connections",
      "Local train station",
      "Road access to major highways"
    ],
    characteristics: [
      "regional business centre",
      "local market focus",
      "smaller tenant base",
      "limited investor liquidity"
    ],
    neighborhoods: ["Central area", "Suburbs", "Industrial zone"]
  },
  retail_prime: {
    districts: ["Karl Johan", "Bogstadveien", "Eger", "Majorstuen"],
    landmarks: [
      "Oslo City shopping centre", "Paleet", "Steen & Strøm", "Glasmagasinet"
    ],
    transport: [
      "High footfall pedestrian areas",
      "Direct metro access",
      "Central location"
    ],
    characteristics: [
      "prime retail location",
      "international brands present",
      "high street shopping",
      "strong consumer spending"
    ],
    neighborhoods: ["Sentrum", "Frogner", "St. Hanshaugen"]
  },
  retail_normal: {
    districts: ["Grünerløkka", "Grønland", "Majorstuen outskirts"],
    landmarks: [
      "Local shopping streets", "Neighbourhood centres"
    ],
    transport: [
      "Good public transport",
      "Parking availability",
      "Bus connections"
    ],
    characteristics: [
      "neighbourhood retail",
      "local customer base",
      "mix of chains and independents",
      "stable footfall"
    ],
    neighborhoods: ["Residential areas", "Mixed-use districts"]
  },
  retail_secondary: {
    districts: ["Suburban centres", "Out-of-town retail parks"],
    landmarks: [
      "Regional shopping centres", "Big-box retail"
    ],
    transport: [
      "Car-dependent access",
      "Large parking areas",
      "Highway proximity"
    ],
    characteristics: [
      "secondary retail location",
      "price-sensitive customers",
      "higher vacancy risk",
      "dependent on anchor tenants"
    ],
    neighborhoods: ["Suburban areas", "Industrial zones"]
  },
  logistics_prime: {
    districts: ["Alnabru", "Berger", "Vestby", "Gardermoen area"],
    landmarks: [
      "Major logistics terminals", "Distribution hubs"
    ],
    transport: [
      "E6/E18 motorway access",
      "Rail freight terminal",
      "Airport proximity"
    ],
    characteristics: [
      "prime logistics location",
      "modern warehouse specifications",
      "strong tenant demand",
      "last-mile distribution hub"
    ],
    neighborhoods: ["Industrial zones", "Freight corridors"]
  },
  logistics_normal: {
    districts: ["Regional distribution centres", "Secondary industrial areas"],
    landmarks: [
      "Local industrial estates", "Smaller terminals"
    ],
    transport: [
      "Road access",
      "Limited rail connections",
      "Regional distribution"
    ],
    characteristics: [
      "secondary logistics location",
      "older building stock",
      "smaller tenant base",
      "renovation requirements"
    ],
    neighborhoods: ["Industrial parks", "Outer suburban areas"]
  },
  hotel_prime: {
    districts: ["Oslo Sentrum", "Aker Brygge", "Opera area"],
    landmarks: [
      "Opera House", "Central Station", "Akershus Fortress"
    ],
    transport: [
      "Walking distance to attractions",
      "Direct airport express access",
      "Metro and tram connections"
    ],
    characteristics: [
      "prime tourist and business location",
      "international hotel brands",
      "high occupancy rates",
      "premium room rates"
    ],
    neighborhoods: ["City centre", "Waterfront areas"]
  },
  hotel_normal: {
    districts: ["Conference areas", "Airport proximity", "Regional cities"],
    landmarks: [
      "Conference centres", "Business parks"
    ],
    transport: [
      "Airport shuttle access",
      "Highway proximity",
      "Parking availability"
    ],
    characteristics: [
      "business and conference focus",
      "seasonal variation",
      "corporate rate dependency",
      "regional tourism"
    ],
    neighborhoods: ["Airport areas", "Business districts"]
  },
  residential: {
    districts: ["Frogner", "Majorstuen", "Grünerløkka", "St. Hanshaugen"],
    landmarks: [
      "Frogner Park", "Palace Gardens", "Aker River"
    ],
    transport: [
      "Metro access",
      "Tram lines",
      "Cycling infrastructure"
    ],
    characteristics: [
      "established residential area",
      "strong rental demand",
      "urban amenities",
      "school and service proximity"
    ],
    neighborhoods: ["Inner city districts", "Popular suburbs"]
  }
};

// Building type templates
export interface BuildingTemplate {
  styles: string[];
  yearRanges: { min: number; max: number; description: string }[];
  floorRanges: { min: number; max: number }[];
  sizeMultipliers: { min: number; max: number }[]; // m² per floor
  structures: string[];
  features: string[];
}

export const buildingTemplates: Record<string, BuildingTemplate> = {
  office: {
    styles: [
      "functionalist architecture from the post-war period",
      "modernist design with clean lines and large windows",
      "contemporary glass and steel construction",
      "renovated historic building with preserved facade",
      "brutalist concrete structure",
      "late modernist office building",
      "new Nordic design with sustainable materials"
    ],
    yearRanges: [
      { min: 1920, max: 1945, description: "pre-war construction" },
      { min: 1945, max: 1970, description: "post-war functionalist period" },
      { min: 1970, max: 1990, description: "late modernist era" },
      { min: 1990, max: 2010, description: "contemporary period" },
      { min: 2010, max: 2025, description: "recent construction" }
    ],
    floorRanges: [
      { min: 3, max: 6 },
      { min: 5, max: 10 },
      { min: 8, max: 15 },
      { min: 12, max: 25 }
    ],
    sizeMultipliers: [
      { min: 300, max: 500 },
      { min: 450, max: 700 },
      { min: 600, max: 1200 },
      { min: 1000, max: 2500 }
    ],
    structures: [
      "reinforced concrete frame with brick infill",
      "steel frame with curtain wall glazing",
      "in-situ concrete construction",
      "precast concrete elements",
      "hybrid steel and concrete structure"
    ],
    features: [
      "two passenger lifts serving all floors",
      "open floor plates suitable for flexible layouts",
      "raised access floors for cable management",
      "suspended ceilings with integrated lighting",
      "central atrium providing natural light",
      "underground parking garage"
    ]
  },
  retail: {
    styles: [
      "street-level retail with residential above",
      "purpose-built shopping centre",
      "historic retail premises in pedestrian zone",
      "mixed-use development with retail podium",
      "big-box retail format"
    ],
    yearRanges: [
      { min: 1900, max: 1950, description: "early 20th century" },
      { min: 1960, max: 1985, description: "shopping centre era" },
      { min: 1985, max: 2005, description: "retail park period" },
      { min: 2005, max: 2025, description: "modern retail" }
    ],
    floorRanges: [
      { min: 1, max: 2 },
      { min: 2, max: 4 },
      { min: 1, max: 3 }
    ],
    sizeMultipliers: [
      { min: 200, max: 800 },
      { min: 500, max: 2000 },
      { min: 2000, max: 10000 }
    ],
    structures: [
      "traditional masonry construction",
      "steel portal frame",
      "reinforced concrete with large spans",
      "mixed construction"
    ],
    features: [
      "street-facing display windows",
      "goods delivery access at rear",
      "customer parking",
      "high ceilings suitable for retail fit-out",
      "prominent corner position"
    ]
  },
  logistics: {
    styles: [
      "modern cross-dock warehouse",
      "high-bay distribution centre",
      "multi-tenant logistics facility",
      "cold storage warehouse",
      "light industrial unit"
    ],
    yearRanges: [
      { min: 1970, max: 1995, description: "traditional warehouse" },
      { min: 1995, max: 2010, description: "modern logistics" },
      { min: 2010, max: 2025, description: "contemporary distribution" }
    ],
    floorRanges: [
      { min: 1, max: 1 },
      { min: 1, max: 2 }
    ],
    sizeMultipliers: [
      { min: 3000, max: 8000 },
      { min: 8000, max: 25000 },
      { min: 20000, max: 80000 }
    ],
    structures: [
      "steel portal frame with insulated cladding",
      "precast concrete tilt-up construction",
      "hybrid steel and concrete"
    ],
    features: [
      "multiple loading docks with levellers",
      "clear internal height of 10+ metres",
      "sprinkler system throughout",
      "secure yard with trailer parking",
      "office accommodation at mezzanine level"
    ]
  },
  hotel: {
    styles: [
      "contemporary city hotel",
      "historic building converted to boutique hotel",
      "conference hotel with meeting facilities",
      "budget hotel format",
      "full-service business hotel"
    ],
    yearRanges: [
      { min: 1960, max: 1985, description: "post-war hotel" },
      { min: 1985, max: 2005, description: "expansion era" },
      { min: 2005, max: 2025, description: "modern hospitality" }
    ],
    floorRanges: [
      { min: 4, max: 8 },
      { min: 6, max: 12 },
      { min: 10, max: 20 }
    ],
    sizeMultipliers: [
      { min: 400, max: 800 },
      { min: 600, max: 1200 },
      { min: 1000, max: 2000 }
    ],
    structures: [
      "reinforced concrete frame",
      "steel frame construction",
      "historic masonry with modern extensions"
    ],
    features: [
      "reception and lobby area",
      "restaurant and bar facilities",
      "conference and meeting rooms",
      "fitness centre",
      "underground parking"
    ]
  },
  residential: {
    styles: [
      "traditional apartment block",
      "modern residential tower",
      "converted historic building",
      "new-build residential complex",
      "terraced housing conversion"
    ],
    yearRanges: [
      { min: 1890, max: 1940, description: "early apartment era" },
      { min: 1950, max: 1975, description: "post-war housing" },
      { min: 1980, max: 2005, description: "contemporary residential" },
      { min: 2010, max: 2025, description: "recent development" }
    ],
    floorRanges: [
      { min: 3, max: 5 },
      { min: 4, max: 8 },
      { min: 6, max: 15 }
    ],
    sizeMultipliers: [
      { min: 200, max: 400 },
      { min: 300, max: 600 },
      { min: 500, max: 1000 }
    ],
    structures: [
      "traditional brick construction",
      "reinforced concrete",
      "timber frame with brick cladding",
      "modular construction"
    ],
    features: [
      "private balconies",
      "common areas and bicycle storage",
      "resident parking",
      "well-maintained communal gardens",
      "recently upgraded common facilities"
    ]
  }
};

// Technical upgrade types
export const technicalUpgrades = [
  { type: "lifts", descriptions: ["new passenger lifts installed", "lift modernisation completed", "elevator system upgraded"] },
  { type: "hvac", descriptions: ["ventilation system upgraded", "new HVAC installation", "climate control system replaced", "new SD system for ventilation"] },
  { type: "facade", descriptions: ["facade renovation completed", "external painting", "window replacement", "solar shading installed", "facade cleaning and repair"] },
  { type: "interior", descriptions: ["reception area refurbished", "common areas upgraded", "toilet facilities renovated", "staircase renovation"] },
  { type: "roof", descriptions: ["roof membrane replaced", "new roofing installed", "roof insulation upgraded"] },
  { type: "electrical", descriptions: ["electrical systems upgraded", "lighting retrofit to LED", "new electrical distribution"] },
  { type: "fire_safety", descriptions: ["fire alarm system upgraded", "sprinkler system installed", "emergency lighting renewed"] },
  { type: "access", descriptions: ["access control system installed", "security upgrades", "entrance renovation"] }
];

// Tenant industry types
export const tenantIndustries = [
  "professional services",
  "technology and IT",
  "financial services",
  "legal services",
  "consulting",
  "media and communications",
  "healthcare administration",
  "engineering consultancy",
  "architecture and design",
  "public sector agency",
  "non-profit organisation",
  "education and training",
  "creative industries"
];

// Energy labels
export const energyLabels = ["A", "B", "C", "D", "E", "F", "G"];

// Norwegian municipality names for cadastral references
export const municipalities = [
  "Oslo", "Bergen", "Trondheim", "Stavanger", "Drammen", "Fredrikstad",
  "Kristiansand", "Tromsø", "Sandnes", "Sarpsborg", "Bodø", "Sandefjord",
  "Ålesund", "Tønsberg", "Moss", "Haugesund", "Arendal", "Porsgrunn",
  "Larvik", "Halden", "Lillehammer", "Molde", "Harstad", "Kongsberg"
];

// Helper to get anchor category
export function getAnchorCategory(anchorKey: string): string {
  if (anchorKey.startsWith("office_oslo_cbd")) return "office";
  if (anchorKey.startsWith("office_")) return "office";
  if (anchorKey.startsWith("retail_")) return "retail";
  if (anchorKey.startsWith("logistics_")) return "logistics";
  if (anchorKey.startsWith("hotel_")) return "hotel";
  if (anchorKey.startsWith("residential")) return "residential";
  return "office";
}

// Helper to get streets for an anchor
export function getStreetsForAnchor(anchorKey: string): string[] {
  const mapping: Record<string, string> = {
    office_oslo_cbd: "oslo_cbd",
    office_oslo_centre: "oslo_centre",
    office_oslo_skoyen: "oslo_skoyen",
    office_oslo_lysaker: "oslo_lysaker",
    office_oslo_east: "oslo_east",
    office_oslo_south: "oslo_south",
    office_stavanger: "stavanger",
    office_bergen: "bergen",
    office_trondheim: "trondheim",
    office_other: "other",
    retail_prime: "retail",
    retail_normal: "retail",
    retail_secondary: "other",
    logistics_prime: "logistics",
    logistics_normal: "logistics",
    hotel_prime: "hotel",
    hotel_normal: "hotel",
    residential: "residential"
  };
  
  const streetKey = mapping[anchorKey] || "other";
  return streetNames[streetKey] || streetNames.other;
}

