"""Seed inventory for LuxuryCharterKings. Rental & charter model only."""

IMG = {
    "jets": [
        "https://images.unsplash.com/photo-1768346564233-d71f37bd19b6?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
        "https://images.unsplash.com/photo-1768346564210-f382cdf18375?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
        "https://images.unsplash.com/photo-1474302770737-173ee21bab63?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
    ],
    "yachts": [
        "https://images.unsplash.com/photo-1759135695910-0a6aaaab6b14?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
        "https://images.unsplash.com/photo-1598737285721-29346a5c9278?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
        "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
    ],
    "cars": [
        "https://images.unsplash.com/photo-1679506640590-f0152786dff0?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
        "https://images.unsplash.com/photo-1638686302275-0e87df720aca?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
        "https://images.unsplash.com/photo-1549632891-a0bea6d0355b?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
    ],
    "motorhomes": [
        "https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
        "https://images.unsplash.com/photo-1533591380348-14193f1de18f?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
    ],
    "villas": [
        "https://images.unsplash.com/photo-1613977257363-707ba9348227?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
        "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
        "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
    ],
    "tours": [
        "https://images.unsplash.com/photo-1544551763-46a013bb70d5?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
        "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
    ],
    "vip": [
        "https://images.unsplash.com/photo-1661954864180-e61dea14208a?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
        "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
    ],
}


def _l(**kw):
    base = {
        "subcategory": None,
        "request_quote": False,
        "price_per_day": None,
        "price_weekly": None,
        "chauffeur_option": None,
        "rental_durations": ["Daily", "Multi-Day", "Weekly"],
        "availability": "Available",
        "included_services": [],
        "featured": False,
    }
    base.update(kw)
    return base


SEED_LISTINGS = [
    # ---------------- PRIVATE JETS ----------------
    _l(
        slug="gulfstream-g650er", category="jets", name="Gulfstream G650ER",
        location="London — Farnborough", tagline="Ultra-long-range transcontinental flagship",
        description="A statement of range and refinement. The G650ER crosses continents non-stop with a whisper-quiet cabin, hand-finished interiors and a dedicated cabin crew.",
        images=IMG["jets"], passenger_capacity=14, price_per_day=None, request_quote=True,
        specs=[["Range", "7,500 nm"], ["Top Speed", "Mach 0.925"], ["Cabin Crew", "2 dedicated"], ["Passengers", "14 seated / 6 sleeping"]],
        included_services=["Dedicated cabin crew", "Gourmet catering", "Ground transfer coordination"],
        featured=True,
    ),
    _l(
        slug="bombardier-global-7500", category="jets", name="Bombardier Global 7500",
        location="Dubai — Al Maktoum", tagline="Four true living spaces at altitude",
        description="The only business jet with four distinct living spaces, including a private suite with a full-size bed. Built for the longest routes in complete serenity.",
        images=[IMG["jets"][1], IMG["jets"][2], IMG["jets"][0]], passenger_capacity=17, price_per_day=None, request_quote=True,
        specs=[["Range", "7,700 nm"], ["Top Speed", "Mach 0.925"], ["Living Spaces", "4"], ["Passengers", "17"]],
        included_services=["Private stateroom", "Full galley & chef", "Global slot handling"],
        featured=True,
    ),
    _l(
        slug="embraer-praetor-600", category="jets", name="Embraer Praetor 600",
        location="Côte d'Azur — Nice", tagline="Super-midsize agility for the Mediterranean",
        description="Nimble, quiet and beautifully appointed. Ideal for short-notice European hops with best-in-class cabin altitude.",
        images=[IMG["jets"][2], IMG["jets"][0]], passenger_capacity=8, price_per_day=32000,
        specs=[["Range", "4,018 nm"], ["Top Speed", "Mach 0.83"], ["Cabin Crew", "1"], ["Passengers", "8"]],
        included_services=["Cabin attendant", "Premium catering", "FBO lounge access"],
    ),

    # ---------------- LUXURY YACHTS ----------------
    _l(
        slug="oceanic-serenity-72m", category="yachts", name="Serenity 72m",
        location="Monaco — Port Hercule", tagline="Full-crew superyacht for the Riviera season",
        description="A 72-metre masterpiece with beach club, spa and helipad. A crew of eighteen anticipates every wish across the Mediterranean.",
        images=IMG["yachts"], passenger_capacity=12, price_per_day=None, request_quote=True,
        specs=[["Length", "72 m"], ["Guests", "12 in 6 suites"], ["Crew", "18"], ["Cruising Speed", "16 knots"]],
        included_services=["Full professional crew", "Private chef", "Water toys & tenders", "Beach club & spa"],
        featured=True,
    ),
    _l(
        slug="azure-mirage-45m", category="yachts", name="Azure Mirage 45m",
        location="Caribbean — St. Barths", tagline="Island-hopping in the Lesser Antilles",
        description="Sleek, fast and intimate. The Mirage is built for turquoise anchorages, sundown crossings and effortless island living.",
        images=[IMG["yachts"][1], IMG["yachts"][2], IMG["yachts"][0]], passenger_capacity=10, price_per_day=48000,
        price_weekly=295000,
        specs=[["Length", "45 m"], ["Guests", "10 in 5 suites"], ["Crew", "9"], ["Cruising Speed", "18 knots"]],
        included_services=["Crew of nine", "Chef & bar service", "Diving & snorkelling gear"],
        featured=True,
    ),
    _l(
        slug="marlin-explorer-38m", category="yachts", name="Marlin Explorer 38m",
        location="Amalfi Coast — Positano", tagline="Explorer-class comfort along the coast",
        description="A rugged yet elegant explorer for the Amalfi and Aeolian isles, with generous deck space and a shaded upper lounge.",
        images=[IMG["yachts"][2], IMG["yachts"][0]], passenger_capacity=8, price_per_day=36000,
        specs=[["Length", "38 m"], ["Guests", "8 in 4 suites"], ["Crew", "7"], ["Cruising Speed", "14 knots"]],
        included_services=["Crew of seven", "Regional cuisine chef", "Paddleboards & seabobs"],
    ),

    # ---------------- LUXURY CARS ----------------
    _l(
        slug="range-rover-autobiography", category="cars", subcategory="SUV / Executive",
        name="Range Rover Autobiography", location="Dubai",
        tagline="The definitive luxury SUV, self-drive or chauffeured",
        description="Commanding presence with hand-quilted leather and near-silent refinement. The benchmark for effortless city and desert touring.",
        images=IMG["cars"], passenger_capacity=5, price_per_day=1200, price_weekly=7000,
        chauffeur_option="Self-Drive or Chauffeur",
        specs=[["Passengers", "5"], ["Drivetrain", "AWD"], ["Transmission", "Automatic"], ["Service", "Self-Drive / Chauffeur"]],
        included_services=["Full insurance", "Airport delivery", "24/7 roadside concierge"],
        featured=True,
    ),
    _l(
        slug="rolls-royce-cullinan", category="cars", subcategory="Chauffeur Sedans",
        name="Rolls-Royce Cullinan", location="Monaco",
        tagline="Chauffeur-driven presence, unmatched serenity",
        description="The pinnacle of chauffeur travel. Lambswool floors, starlight headliner and a whisper-quiet cabin for the most important arrivals.",
        images=[IMG["cars"][1], IMG["cars"][2], IMG["cars"][0]], passenger_capacity=4, price_per_day=2400,
        chauffeur_option="Chauffeur Only",
        specs=[["Passengers", "4"], ["Drivetrain", "AWD"], ["Transmission", "Automatic"], ["Service", "Chauffeur Only"]],
        included_services=["Professional chauffeur", "Bottled refreshments", "Flexible hourly extension"],
        featured=True,
    ),
    _l(
        slug="lamborghini-huracan", category="cars", subcategory="Supercars",
        name="Lamborghini Huracán EVO", location="Côte d'Azur",
        tagline="Open-road theatre along the Riviera",
        description="A naturally aspirated V10 soundtrack and razor-sharp handling for the coast roads between Nice and Monaco.",
        images=[IMG["cars"][2], IMG["cars"][0]], passenger_capacity=2, price_per_day=2900,
        chauffeur_option="Self-Drive",
        specs=[["Passengers", "2"], ["Engine", "5.2L V10"], ["0–100 km/h", "2.9s"], ["Service", "Self-Drive"]],
        included_services=["Full insurance", "Hotel delivery", "Coastal route notes"],
    ),
    _l(
        slug="mercedes-maybach-s680", category="cars", subcategory="Chauffeur Sedans",
        name="Mercedes-Maybach S680", location="London",
        tagline="Executive chauffeur sedan for the city",
        description="First-class rear seating with reclining executive chairs, refrigerated console and acoustic glass for a serene commute.",
        images=[IMG["cars"][0], IMG["cars"][1]], passenger_capacity=3, price_per_day=1600,
        chauffeur_option="Self-Drive or Chauffeur",
        specs=[["Passengers", "3"], ["Drivetrain", "AWD"], ["Transmission", "Automatic"], ["Service", "Self-Drive / Chauffeur"]],
        included_services=["Professional chauffeur", "Wi-Fi & refreshments", "City-wide coverage"],
    ),
    # -------- Motor Homes (subcategory of Luxury Cars) --------
    _l(
        slug="marchi-mobile-elemment", category="cars", subcategory="Motor Homes / Land Yachts",
        name="Marchi Mobile eleMMent Palazzo", location="Aspen",
        tagline="A land yacht for alpine expeditions",
        description="A rolling suite with a rooftop terrace, master bedroom and full lounge. Touring redefined for the mountains.",
        images=IMG["motorhomes"], passenger_capacity=6, price_per_day=None, request_quote=True,
        chauffeur_option="Chauffeur Only",
        specs=[["Sleeps", "4"], ["Passengers", "6"], ["Length", "12 m"], ["Service", "Driver included"]],
        included_services=["Professional driver", "Onboard host", "Full provisioning"],
        featured=True,
    ),
    _l(
        slug="volkner-performance", category="cars", subcategory="Motor Homes / Land Yachts",
        name="Volkner Mobil Performance", location="Côte d'Azur",
        tagline="Grand touring with a garage aboard",
        description="An engineering marvel with a hidden lower garage for a supercar, marble bath and panoramic lounge. Self-drive or with a captain.",
        images=[IMG["motorhomes"][1], IMG["motorhomes"][0]], passenger_capacity=4, price_per_day=3800,
        chauffeur_option="Self-Drive or Chauffeur",
        specs=[["Sleeps", "2"], ["Passengers", "4"], ["Length", "12 m"], ["Service", "Self-Drive / Driver"]],
        included_services=["Route planning", "Full provisioning", "Optional supercar garage"],
    ),

    # ---------------- TOUR EXPERIENCES ----------------
    _l(
        slug="private-island-maldives", category="tours", name="Private Island — Maldives",
        location="Maldives — Baa Atoll", tagline="A whole atoll, entirely your own",
        description="A fully staffed private island with overwater villas, a resident chef and a marine biologist for guided reef expeditions.",
        images=IMG["tours"], passenger_capacity=16, price_per_day=None, request_quote=True,
        specs=[["Duration", "3–10 nights"], ["Guests", "up to 16"], ["Staff", "Full island team"], ["Access", "Seaplane transfer"]],
        included_services=["Seaplane transfers", "Private chef & staff", "Reef & diving guide"],
        featured=True,
    ),
    _l(
        slug="wine-country-fly-in", category="tours", name="Wine Country Fly-In",
        location="Tuscany — Chianti", tagline="Private cellars and hilltop estates",
        description="A curated three-day fly-in through Tuscany's most exclusive estates, with private tastings and Michelin dining.",
        images=[IMG["tours"][1], IMG["tours"][0]], passenger_capacity=6, price_per_day=None, request_quote=True,
        specs=[["Duration", "3 days"], ["Guests", "up to 6"], ["Guide", "Sommelier host"], ["Transfers", "Helicopter & car"]],
        included_services=["Private tastings", "Michelin dining", "Estate accommodation"],
    ),

    # ---------------- VILLAS ----------------
    _l(
        slug="villa-oliveto-tuscany", category="villas", name="Villa Oliveto",
        location="Tuscany — Val d'Orcia", tagline="A hilltop estate with private staff",
        description="A restored 18th-century estate amid olive groves, with infinity pool, private chef and full household staff.",
        images=IMG["villas"], passenger_capacity=12, price_per_day=None, request_quote=True,
        specs=[["Bedrooms", "6"], ["Guests", "12"], ["Staff", "Chef, butler, housekeeping"], ["Grounds", "40 hectares"]],
        included_services=["Private chef", "Daily housekeeping", "Concierge & driver"],
        featured=True,
    ),
    _l(
        slug="villa-mirador-ibiza", category="villas", name="Villa Mirador",
        location="Ibiza — Cala Jondal", tagline="Cliff-edge sanctuary above the sea",
        description="A minimalist cliff-side residence with horizon pool, sunset terrace and direct access to a private cove.",
        images=[IMG["villas"][1], IMG["villas"][2], IMG["villas"][0]], passenger_capacity=10, price_per_day=9500,
        price_weekly=58000,
        specs=[["Bedrooms", "5"], ["Guests", "10"], ["Staff", "Housekeeping & chef on request"], ["Access", "Private cove"]],
        included_services=["Daily housekeeping", "Chef on request", "Boat & car concierge"],
    ),
    _l(
        slug="chalet-lumiere-verbier", category="villas", name="Chalet Lumière",
        location="Verbier — Swiss Alps", tagline="Ski-in alpine sanctuary with spa",
        description="A contemporary chalet with private spa, cinema and ski-in access, staffed by a resident chef and host.",
        images=[IMG["villas"][2], IMG["villas"][0]], passenger_capacity=10, price_per_day=12000,
        specs=[["Bedrooms", "5"], ["Guests", "10"], ["Wellness", "Spa, sauna, pool"], ["Access", "Ski-in / ski-out"]],
        included_services=["Resident chef & host", "Daily housekeeping", "Ski valet & transfers"],
    ),

    # ---------------- VIP ----------------
    _l(
        slug="vip-global-concierge", category="vip", name="Global VIP Concierge",
        location="Worldwide", tagline="24/7 priority access, anywhere",
        description="A dedicated concierge team on call around the clock — from impossible reservations and event access to security and bespoke itineraries.",
        images=IMG["vip"], passenger_capacity=0, price_per_day=None, request_quote=True,
        specs=[["Availability", "24 / 7 / 365"], ["Coverage", "Global"], ["Response", "Priority"], ["Team", "Dedicated concierge"]],
        included_services=["Dedicated concierge", "Event & restaurant access", "Security coordination", "Bespoke itineraries"],
        featured=True,
    ),
    _l(
        slug="vip-event-access", category="vip", name="VIP Event & Access",
        location="Worldwide", tagline="The rooms and moments that matter",
        description="Priority access to the season's defining events — Grand Prix paddocks, fashion weeks, gallery openings and private boxes.",
        images=[IMG["vip"][1], IMG["vip"][0]], passenger_capacity=0, price_per_day=None, request_quote=True,
        specs=[["Availability", "Season-wide"], ["Coverage", "Global"], ["Access", "Priority & backstage"], ["Host", "On-site liaison"]],
        included_services=["Priority tickets", "Paddock & backstage access", "On-site liaison"],
    ),
]

CATEGORIES = [
    {"id": "jets", "name": "Private Jets", "path": "/jets",
     "tagline": "Ultra long-range cabin comfort & transcontinental agility",
     "image": IMG["jets"][0], "col_span": "lg:col-span-8"},
    {"id": "yachts", "name": "Luxury Yachts", "path": "/yachts",
     "tagline": "Superyacht charters with full crew in the Mediterranean & Caribbean",
     "image": IMG["yachts"][0], "col_span": "lg:col-span-4"},
    {"id": "cars", "name": "Luxury Cars", "path": "/cars",
     "tagline": "Chauffeur or self-drive supercars, SUVs and motor homes",
     "image": IMG["cars"][0], "col_span": "lg:col-span-4"},
    {"id": "villas", "name": "Villas", "path": "/villas",
     "tagline": "Secluded coastal estates & alpine sanctuaries with private staff",
     "image": IMG["villas"][0], "col_span": "lg:col-span-8"},
    {"id": "tours", "name": "Tour Experience", "path": "/tours",
     "tagline": "Tailored expeditions, private island escapes & wine country fly-ins",
     "image": IMG["tours"][0], "col_span": "lg:col-span-6"},
    {"id": "vip", "name": "VIP", "path": "/vip",
     "tagline": "24/7 priority access, security detailing & custom itineraries",
     "image": IMG["vip"][0], "col_span": "lg:col-span-6"},
]
