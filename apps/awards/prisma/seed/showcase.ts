/**
 * Starter content for the live site: the first artists, the 2026 edition with its
 * genres and honorees, a gallery album and news. Seeded once (see seedShowcase in
 * ../seed.ts); after that everything is edited in the admin, photos included.
 * No invented dates, venues, prizes, YouTube links or social accounts.
 */
type Category = "SINGER" | "MUSICIAN" | "ACTOR" | "COMEDIAN" | "DANCER" | "PRODUCER_DJ" | "HOST_MEDIA" | "OTHER";
type Status = "DRAFT" | "PUBLISHED";

export type SeedArtist = {
  slug: string;
  nameEn: string;
  nameAm: string;
  stageName?: string;
  legalNameEn?: string;
  categories: Category[];
  genres: string[];
  birthYear?: number;
  /** A bare start year shows as "Active since 2004"; never "–present". */
  yearsActive?: string;
  shortBioEn: string;
  bioEn: string;
  notableWorks: { title: string; year?: number; type?: string }[];
  isLegend?: boolean;
  featured?: boolean;
  status: Status;
};

const p = (...paras: string[]) => paras.map((t) => `<p>${t}</p>`).join("\n");

export const ARTISTS: SeedArtist[] = [
  {
    slug: "solomon-bogale",
    nameEn: "Solomon Bogale",
    nameAm: "ሰለሞን ቦጋለ",
    categories: ["ACTOR", "PRODUCER_DJ", "OTHER"],
    genres: ["Drama", "Romance", "Comedy", "Film", "Theatre", "TV"],
    yearsActive: "Since the 2000s",
    shortBioEn: "Prominent Ethiopian film, television and stage actor, director and producer known for leading roles in over 50 films and hit TV dramas like Sew Le Sew and Zemen.",
    bioEn: p(
      "Born and raised in Addis Ababa, Solomon Bogale (also spelled Selemon Bogale) left his first-year mechanical engineering studies at university to pursue his passion for acting. He quickly rose to become one of Ethiopia's highest-paid and most sought-after leading men, starring in more than 51 feature films (including The 11th Hour, Abay vs. Vegas and Triangle), 16 stage plays, 8 television serials and 7 radio dramas.",
      "Beyond acting and directing projects like Yeras Menged, he founded and manages the Hibret Lebego charity organization, leading fundraising initiatives for medical centers and dialysis treatment.",
    ),
    notableWorks: [
      { title: "Sew Le Sew", type: "TV series" },
      { title: "Zemen", type: "TV series" },
      { title: "The 11th Hour", type: "Film" },
      { title: "Abay vs. Vegas", type: "Film" },
      { title: "Triangle", type: "Film" },
      { title: "Yeras Menged", type: "Film (director)" },
    ],
    featured: true,
    status: "PUBLISHED",
  },
  {
    slug: "tadele-roba",
    nameEn: "Tadele Roba",
    nameAm: "ታደለ ሮባ",
    stageName: "Tadele Roba La-Fontaine",
    categories: ["SINGER", "MUSICIAN", "PRODUCER_DJ"],
    genres: ["Ethiopian Pop", "Afrobeat", "Reggae fusion", "Traditional"],
    yearsActive: "Since the 1990s",
    shortBioEn: "Veteran Addis Ababa-born singer, songwriter and founder of LaLa Production Company, celebrated for hits spanning from the 1990s to the present.",
    bioEn: p(
      "Born and raised in Addis Ababa, Tadele Roba began singing at age 11 and became a fixture of modern Ethiopian popular music starting in the 1990s. Known for socially conscious and romantic tracks, including \"Dangerous Crossings\", \"Ethiopia Tikdem\" and \"Enku Mesay\", he blends contemporary grooves with traditional Ethiopian rhythms.",
      "Through his LaLa Production Company, he also mentors and produces albums for emerging young Ethiopian artists.",
    ),
    notableWorks: [
      { title: "Dangerous Crossings", type: "Song" },
      { title: "Ethiopia Tikdem", type: "Song" },
      { title: "Enku Mesay", type: "Song" },
    ],
    status: "PUBLISHED",
  },
  {
    slug: "kamuzu-kassa",
    nameEn: "Kamuzu Kassa",
    nameAm: "ካሙዙ ካሳ",
    categories: ["MUSICIAN", "PRODUCER_DJ"],
    genres: ["Ethiopian Pop", "Tizita", "Contemporary", "Gospel"],
    birthYear: 1990,
    yearsActive: "2004",
    shortBioEn: "Prolific Ethiopian record producer, composer and arranger credited with composing over 2,000 songs for major Ethiopian artists at his Shakura Studio.",
    bioEn: p(
      "Born in Beklo Segno, Wolayita, and raised in Wolaita Sodo, Kamuzu Kassa developed his musical foundation in a Protestant church choir before composing gospel music in 2004. After moving to Addis Ababa in 2006 and founding Shakura Studio, he broke into mainstream secular music with Kako Getachew's 2007 hit \"Aroge Arada\".",
      "He went on to compose and arrange more than 2,000 tracks for leading stars such as Hamelmal Abate, Surafel Abebe and Jalud Awol, earning Best Composer of the Year at the 2018 Addis Music Awards and national honors from the Ministry of Culture and Tourism and Fana Broadcasting Corporate in 2021.",
    ),
    notableWorks: [{ title: "Aroge Arada (Kako Getachew)", year: 2007, type: "Song (composer)" }],
    status: "PUBLISHED",
  },
  {
    slug: "dagmawit-tsehaye",
    nameEn: "Dagmawit Tsehaye",
    nameAm: "ዳግማዊት ፀሐዬ",
    stageName: "Dagi",
    categories: ["SINGER"],
    genres: ["Ethiopian Pop", "Tizita", "Traditional fusion"],
    yearsActive: "Since the 2000s",
    shortBioEn: "Award-winning Ethiopian vocalist and Ethiopian Idol winner known for her soulful voice and acclaimed albums including Yebircho and Werk.",
    bioEn: p(
      "Dagmawit Tsehaye rose to national prominence after winning Ethiopian Idol, quickly establishing herself as one of Ethiopia's standout female vocalists.",
      "Recognized with a Best Female Singer award from New Test Entertainment & Cultural Tourism, she has released popular singles and full-length albums such as Yebircho and Werk, blending classic Amharic and Oromo melodies with modern arrangements while touring internationally for the Ethiopian diaspora.",
    ),
    notableWorks: [
      { title: "Yebircho", type: "Album" },
      { title: "Werk", year: 2024, type: "Album" },
    ],
    featured: true,
    status: "PUBLISHED",
  },
  {
    slug: "serawit-fikre",
    nameEn: "Serawit Fikre",
    nameAm: "ሰራዊት ፍቅሬ",
    categories: ["ACTOR", "PRODUCER_DJ", "OTHER"],
    genres: ["Drama", "Comedy", "Film", "Advertising"],
    yearsActive: "Since the 1980s",
    shortBioEn: "Veteran Ethiopian actor, film director, writer and advertising pioneer best known for classic radio and TV dramas, iconic commercials, and films like Hiroshima and Semayawiw Feres.",
    bioEn: p(
      "Raised in the Kazanchis neighborhood of Addis Ababa, Serawit Fikre began his artistic career in theater and radio, achieving early fame as the lead actor in the Ethiopian Radio drama Abiye Zergaw and ETV television dramas.",
      "Alongside actress Mulualem Tadesse, he co-founded a pioneering advertising agency responsible for some of Ethiopia's most memorable television commercials. As a filmmaker, he wrote, directed and produced notable Amharic films including Hiroshima (winner of Best Story at the 6th Ethiopian International Film Festival), Semayawiw Feres, Dagmawit and Sekaramu Posta.",
    ),
    notableWorks: [
      { title: "Abiye Zergaw", type: "Radio drama" },
      { title: "Hiroshima", type: "Film" },
      { title: "Semayawiw Feres", type: "Film" },
      { title: "Dagmawit", type: "Film" },
      { title: "Sekaramu Posta", type: "Film" },
    ],
    isLegend: true,
    status: "PUBLISHED",
  },
  {
    slug: "roman-ayele",
    nameEn: "Roman Ayele",
    nameAm: "ሮማን አየለ",
    categories: ["ACTOR", "PRODUCER_DJ"],
    genres: ["Drama", "Film", "Stage"],
    yearsActive: "Since the 1990s",
    shortBioEn: "Ethiopian actress, poet, assistant director and costume designer recognized for her work in Ethiopian cinema and her longtime artistic partnership with Serawit Fikre.",
    bioEn: p(
      "Roman Ayele is an Ethiopian actress and behind-the-scenes film creative active in Addis Ababa's cinema and theater community. Married to filmmaker and actor Serawit Fikre, she has worked closely with him on major Ethiopian film productions, both on screen and in key production roles such as assistant director and costume designer.",
    ),
    notableWorks: [],
    status: "PUBLISHED",
  },
  {
    slug: "mamila-lukas",
    nameEn: "Mamila Lukas",
    nameAm: "ማሚላ ሉቃስ",
    stageName: "Sisay Lukas",
    categories: ["SINGER"],
    genres: ["Ethiopian Pop", "Wolayta", "Southern Ethiopian", "Contemporary"],
    yearsActive: "Since the 2010s",
    shortBioEn: "Popular Ethiopian vocalist known for energetic modern and cultural tracks such as \"Zago\", \"Mushra Nesh Ethiopia\", \"Selo\" and \"Ende Gizew\".",
    bioEn: p(
      "Mamila Lukas (also known as Sisay Lukas) emerged in the 2010s as a dynamic voice in contemporary Ethiopian music, releasing tracks across major platforms including Nahom Records, Hope Music Ethiopia and Minew Shewa Entertainment.",
      "Blending Wolayta and wider Ethiopian musical traditions with modern pop production, he has built a steady catalog of hit singles and albums, including Zago, Selo, Mushra Nesh Ethiopia, Almilim and Ende Gizew.",
    ),
    notableWorks: [
      { title: "Zago", type: "Song" },
      { title: "Selo", type: "Song" },
      { title: "Mushra Nesh Ethiopia", type: "Song" },
      { title: "Almilim", type: "Song" },
      { title: "Ende Gizew", type: "Song" },
    ],
    status: "PUBLISHED",
  },
  {
    slug: "mesay-tefera",
    nameEn: "Mesay Tefera",
    nameAm: "መሳይ ተፈራ",
    categories: ["SINGER", "MUSICIAN"],
    genres: ["Ethiopian Pop", "R&B", "Soul", "Traditional fusion"],
    birthYear: 1983,
    yearsActive: "2013",
    shortBioEn: "Addis Ababa-born singer-songwriter acclaimed for blending traditional Ethiopian melodies with contemporary R&B and soul, including his 2024 album Yeliben.",
    bioEn: p(
      "Born in Addis Ababa in 1983, Mesay Tefera launched his professional recording career around 2013 (2006 E.C.). Known for smooth vocals and deeply emotive songwriting around themes of love and human connection, his music weaves traditional Ethiopian scales with modern R&B and soul.",
      "He remains a major live performer across Ethiopia and released his full-length album Yeliben in 2024.",
    ),
    notableWorks: [{ title: "Yeliben", year: 2024, type: "Album" }],
    featured: true,
    status: "PUBLISHED",
  },
  {
    slug: "mastewal-eyayu",
    nameEn: "Mastewal Eyayu",
    nameAm: "ማስተዋል እያዩ",
    categories: ["SINGER", "PRODUCER_DJ"],
    genres: ["Ethiopian Pop", "Traditional fusion"],
    yearsActive: "2012",
    shortBioEn: "Bahir Dar-born singer and producer who rose to fame as Ethiopian Idol runner-up, known for his debut album Enzira and viral remixes of Ethiopian classics.",
    bioEn: p(
      "Born in Bahir Dar into a musical family, Mastewal Eyayu moved to Addis Ababa and gained nationwide recognition by advancing through all eight stages of Ethiopian Idol to finish as runner-up.",
      "After debuting on the Concord Collection compilation and gaining viral acclaim for his modern take on Neway Debebe's classic \"Hagere Sew Atash Woy\", he released his debut album Enzira (\"Harmonise\") and singles like \"Almelem\", \"Ete\" and \"Embi\", bridging ancient Ethiopian melodies with contemporary pop production.",
    ),
    notableWorks: [
      { title: "Enzira", type: "Album" },
      { title: "Hagere Sew Atash Woy", type: "Song" },
      { title: "Almelem", type: "Song" },
      { title: "Ete", type: "Song" },
      { title: "Embi", type: "Song" },
    ],
    status: "PUBLISHED",
  },
  {
    slug: "million-birhane",
    nameEn: "Million Birhane",
    nameAm: "ሚሊዮን ብርሃኔ",
    categories: ["OTHER"],
    genres: ["Fine Arts", "Painting", "Sculpture", "Mixed media"],
    birthYear: 1989,
    yearsActive: "2007",
    shortBioEn: "Addis Ababa-based painter and sculptor known for experimental mixed-media works using textiles, buttons and vibrant pigments.",
    bioEn: p(
      "Born in Addis Ababa in September 1989, Million Birhane earned her diploma in sculpture from Entoto Technical and Vocational Education and Training College (TMS) in 2010.",
      "Working as a full-time studio artist, she creates colorful paintings, collages and sewn textile sculptures exploring memory, spirituality, daily life in Merkato and humanity. Her work has been exhibited in nearly 30 solo and group shows in Ethiopia and internationally, including at the Ethiopian National Theatre, Goethe-Institut, Asni Gallery and Galleria Tomoca.",
    ),
    notableWorks: [],
    status: "PUBLISHED",
  },
  {
    slug: "fitsum-t",
    nameEn: "Fitsum T",
    nameAm: "ፍፁም ቲ",
    categories: ["SINGER", "MUSICIAN"],
    genres: ["Ethiopian Pop", "Amharic"],
    yearsActive: "2013",
    shortBioEn: "Atlanta-based singer-songwriter known for melodic, uplifting Amharic pop singles such as \"Addis Aba\", \"Endi Endi\" and \"Aye Mognu\".",
    bioEn: p(
      "Based in Atlanta, Georgia, Fitsum T broke onto the Ethiopian music scene in 2013 with his popular single \"Addis Aba\", which garnered millions of views online.",
      "Drawing on childhood memories and diverse musical influences, he has released a steady string of fan-favorite singles, including \"Endi Endi\" (2016), \"Demama\" (2018), \"Dess Yelal\" (2019), \"Aye Mognu\" (2021) and \"Na Na Ye\" (2022).",
    ),
    notableWorks: [
      { title: "Addis Aba", year: 2013, type: "Single" },
      { title: "Endi Endi", year: 2016, type: "Single" },
      { title: "Demama", year: 2018, type: "Single" },
      { title: "Dess Yelal", year: 2019, type: "Single" },
      { title: "Aye Mognu", year: 2021, type: "Single" },
      { title: "Na Na Ye", year: 2022, type: "Single" },
    ],
    status: "PUBLISHED",
  },
  {
    slug: "abdu-kiar",
    nameEn: "Abdu Kiar",
    nameAm: "አብዱ ኪያር",
    categories: ["SINGER", "MUSICIAN"],
    genres: ["Ethiopian Pop", "Reggae", "Hip-Hop", "Dancehall"],
    birthYear: 1976,
    yearsActive: "1997",
    shortBioEn: "Celebrated Addis Ababa-born singer, rapper and lyricist famed for pioneering a blend of reggae, hip-hop and traditional Ethiopian music across hit albums like Merkato Sefere and Tikur Anbessa.",
    bioEn: p(
      "Born on June 23, 1976, in Addis Merkato, Addis Ababa, Abdu Kiar began his career in 1997 performing reggae, dancehall and hip-hop with the Express Music Band in local nightclubs.",
      "He rose to national stardom with his 2003 debut album Merkato Sefere, praised for its sharp Amharic lyricism and modern rhythmic fusion. He followed it with landmark albums including Fikir Beamarigna, Minew Shewa and Tikur Anbessa, establishing himself as one of modern Ethiopian music's most influential voices.",
    ),
    notableWorks: [
      { title: "Merkato Sefere", year: 2003, type: "Album" },
      { title: "Fikir Beamarigna", type: "Album" },
      { title: "Minew Shewa", type: "Album" },
      { title: "Tikur Anbessa", type: "Album" },
    ],
    featured: true,
    status: "PUBLISHED",
  },
  {
    // Too little is confirmed to publish yet: kept as a draft to complete in the admin.
    slug: "bezawit-kuma",
    nameEn: "Bezawit Kuma",
    nameAm: "ቤዛዊት ኩማ",
    categories: ["OTHER"],
    genres: [],
    shortBioEn: "Ethiopian public figure and creative associated with Addis Ababa's contemporary entertainment and awards circuit.",
    bioEn: p("Bezawit Kuma is an Ethiopian creative figure recognized within Addis Ababa's media and awards scene."),
    notableWorks: [],
    status: "DRAFT",
  },
  {
    slug: "kassahun-eshetu",
    nameEn: "Kassahun Eshetu",
    nameAm: "ካሳሁን እሸቱ",
    stageName: "Kasseye",
    categories: ["SINGER"],
    genres: ["Ethiopian Pop", "Traditional Amharic", "Contemporary"],
    yearsActive: "Since the 2020s",
    shortBioEn: "Ethiopian singer known for popular tracks including \"Twist Ena Fiker\", \"Yihun\" and \"Hayal Gonder\".",
    bioEn: p(
      "Kassahun Eshetu (affectionately known as Kasseye) is a contemporary Ethiopian vocalist who gained widespread online popularity with his 2024 album Yihun and breakout single \"Twist Ena Fiker\", which drew millions of views.",
      "He continued his momentum in 2025 with well-received traditional and modern releases such as \"Hayal Gonder\" and \"Yaradaw Menagn\".",
    ),
    notableWorks: [
      { title: "Yihun", year: 2024, type: "Album" },
      { title: "Twist Ena Fiker", type: "Single" },
      { title: "Hayal Gonder", year: 2025, type: "Single" },
      { title: "Yaradaw Menagn", year: 2025, type: "Single" },
    ],
    status: "PUBLISHED",
  },
  {
    slug: "dawit-yifru",
    nameEn: "Dawit Yifru",
    nameAm: "ዳዊት ይፍሩ",
    legalNameEn: "Dawit Yifru Godana",
    categories: ["MUSICIAN", "PRODUCER_DJ"],
    genres: ["Ethio-Jazz", "Modern Ethiopian", "Afro-Jazz", "Instrumental"],
    birthYear: 1952,
    yearsActive: "Since the 1960s",
    shortBioEn: "Legendary Ethiopian keyboardist, composer and arranger who co-founded the iconic Roha, Dahlak and Venus bands and shaped over 250 albums during Ethiopia's golden musical era.",
    bioEn: p(
      "Born in 1952 in the Dejach Wube neighborhood of Addis Ababa, Dawit Yifru began formal music training in 1962 at the Haile Selassie I Theatre under Nerses Nalbandian.",
      "Over a six-decade career, he co-founded seminal ensembles, including the Venus Band, Dahlak Band and the powerhouse Roha Band, arranging and playing keyboards on more than 250 albums for Ethiopia's greatest vocalists during the 1970s, 1980s and 1990s.",
      "A founding member and longtime Chairman of the Board of the Ethiopian Musicians Association, he helped champion Ethiopia's first copyright legislation and continues to perform internationally, including at WOMEX 2025.",
    ),
    notableWorks: [
      { title: "Roha Band", type: "Band (co-founder)" },
      { title: "Dahlak Band", type: "Band (co-founder)" },
      { title: "Venus Band", type: "Band (co-founder)" },
    ],
    isLegend: true,
    featured: true,
    status: "PUBLISHED",
  },
];

/* ─────────────── 2026 edition ─────────────── */

export const EDITION = {
  year: 2026,
  slug: "2026",
  nameEn: "Feta Awards 2026",
  nameAm: "ፈታ ሽልማት 2026",
  status: "PUBLISHED" as const, // "Announced". Date, venue and broadcast partner are left for the admin.
};

export type SeedGenre = {
  slug: string;
  nameEn: string;
  nameAm: string;
  descriptionEn: string;
  icon: string;
  honorees: { artist: string; workTitleEn?: string; blurbEn: string }[];
};

export const GENRES: SeedGenre[] = [
  {
    slug: "modern-pop",
    nameEn: "Modern Pop",
    nameAm: "ዘመናዊ ፖፕ",
    descriptionEn: "Voices carrying Ethiopian melody into contemporary pop, from Tizita to R&B-infused ballads.",
    icon: "mic-vocal",
    honorees: [
      { artist: "dagmawit-tsehaye", workTitleEn: "Werk", blurbEn: "For a soulful voice that took her from Ethiopian Idol winner to international stages, and albums that pair classic Amharic and Oromo melodies with modern arrangements." },
      { artist: "mesay-tefera", workTitleEn: "Yeliben", blurbEn: "For emotive songwriting that weaves traditional Ethiopian scales with R&B and soul, crowned by his 2024 album Yeliben." },
      { artist: "mastewal-eyayu", workTitleEn: "Enzira", blurbEn: "For bridging ancient Ethiopian melodies and contemporary production, from his reimagining of \"Hagere Sew Atash Woy\" to his debut album Enzira." },
      { artist: "kassahun-eshetu", workTitleEn: "Yihun", blurbEn: "For a breakout run of traditional and modern releases, led by the album Yihun and the hit \"Twist Ena Fiker\"." },
      { artist: "fitsum-t", workTitleEn: "Addis Aba", blurbEn: "For a decade of melodic, uplifting Amharic pop that has connected the diaspora with home since \"Addis Aba\"." },
      { artist: "mamila-lukas", workTitleEn: "Zago", blurbEn: "For energetic songs that bring Wolayta and southern Ethiopian traditions into modern pop." },
    ],
  },
  {
    slug: "reggae-and-hip-hop",
    nameEn: "Reggae & Hip-Hop",
    nameAm: "ሬጌ እና ሂፕ ሆፕ",
    descriptionEn: "Artists fusing reggae, dancehall, Afrobeat and hip-hop with Ethiopian rhythm and lyricism.",
    icon: "disc-3",
    honorees: [
      { artist: "abdu-kiar", workTitleEn: "Merkato Sefere", blurbEn: "For pioneering a fusion of reggae, hip-hop and Ethiopian music, and for the sharp Amharic lyricism of landmark albums from Merkato Sefere to Tikur Anbessa." },
      { artist: "tadele-roba", workTitleEn: "Ethiopia Tikdem", blurbEn: "For three decades of socially conscious songs that blend contemporary grooves with Ethiopian rhythm, and for mentoring new artists through LaLa Production." },
    ],
  },
  {
    slug: "ethio-jazz-and-instrumental",
    nameEn: "Ethio-Jazz & Instrumental",
    nameAm: "ኢትዮ-ጃዝ",
    descriptionEn: "The players and arrangers behind Ethiopia's instrumental sound.",
    icon: "music",
    honorees: [
      { artist: "dawit-yifru", workTitleEn: "Roha Band", blurbEn: "For six decades at the keyboard and the arranger's desk, co-founding the Roha, Dahlak and Venus bands and shaping more than 250 albums of Ethiopia's golden era." },
    ],
  },
  {
    slug: "producers-and-composers",
    nameEn: "Producers & Composers",
    nameAm: "ፕሮዲውሰሮች እና አቀናባሪዎች",
    descriptionEn: "The composers, arrangers and producers who write and build the songs behind the stars.",
    icon: "album",
    honorees: [
      { artist: "kamuzu-kassa", workTitleEn: "Aroge Arada", blurbEn: "For composing and arranging more than 2,000 songs at Shakura Studio for many of Ethiopia's leading voices." },
    ],
  },
  {
    slug: "film-and-television",
    nameEn: "Film & Television",
    nameAm: "ፊልም እና ቴሌቪዥን",
    descriptionEn: "Actors, directors and creators of Ethiopian cinema, television, theater and radio drama.",
    icon: "clapperboard",
    honorees: [
      { artist: "solomon-bogale", workTitleEn: "Sew Le Sew", blurbEn: "For leading roles in more than 50 films and hit dramas like Sew Le Sew and Zemen, and for his charity work through Hibret Lebego." },
      { artist: "serawit-fikre", workTitleEn: "Hiroshima", blurbEn: "For a career spanning radio drama, television, landmark commercials and award-winning films such as Hiroshima." },
      { artist: "roman-ayele", blurbEn: "For her work on screen and behind the camera as an assistant director and costume designer in Ethiopian film." },
    ],
  },
  {
    slug: "visual-arts",
    nameEn: "Visual Arts",
    nameAm: "የእይታ ጥበብ",
    descriptionEn: "Painters, sculptors and visual artists.",
    icon: "sparkles",
    honorees: [
      { artist: "million-birhane", blurbEn: "For colorful paintings and sewn textile sculptures that explore memory, spirituality and daily life in Merkato." },
    ],
  },
];

/* ─────────────── Gallery ─────────────── */

/** Draft until photos are added in the admin (Gallery → Add photos). */
export const ALBUMS = [
  {
    slug: "feta-awards-2026",
    titleEn: "Feta Awards 2026",
    titleAm: "ፈታ ሽልማት 2026",
    descriptionEn: "Photos from the 2026 edition.",
    edition: true,
    status: "DRAFT" as const,
  },
];

/* ─────────────── News ─────────────── */

export const SHOWCASE_NEWS = [
  {
    slug: "introducing-the-feta-awards-2026-honorees",
    title: "Introducing the Feta Awards 2026 honorees",
    excerpt: "Fourteen artists across six genres, from Modern Pop to Visual Arts, are recognized in the 2026 edition.",
    tags: ["announcement", "honorees"],
    featured: false,
    edition: true,
    body: `<p>The 2026 edition of Feta Awards recognizes fourteen artists across six genres. Every artist in a genre is honored equally: open a genre to read each citation and the work it celebrates.</p>
<ul>
<li><a href="/awards/2026/modern-pop">Modern Pop</a>: Dagmawit Tsehaye, Mesay Tefera, Mastewal Eyayu, Kassahun Eshetu, Fitsum T and Mamila Lukas.</li>
<li><a href="/awards/2026/reggae-and-hip-hop">Reggae &amp; Hip-Hop</a>: Abdu Kiar and Tadele Roba.</li>
<li><a href="/awards/2026/ethio-jazz-and-instrumental">Ethio-Jazz &amp; Instrumental</a>: Dawit Yifru.</li>
<li><a href="/awards/2026/producers-and-composers">Producers &amp; Composers</a>: Kamuzu Kassa.</li>
<li><a href="/awards/2026/film-and-television">Film &amp; Television</a>: Solomon Bogale, Serawit Fikre and Roman Ayele.</li>
<li><a href="/awards/2026/visual-arts">Visual Arts</a>: Million Birhane.</li>
</ul>`,
  },
  {
    slug: "dawit-yifru-six-decades-of-ethiopian-sound",
    title: "Dawit Yifru: six decades of Ethiopian sound",
    excerpt: "The keyboardist and arranger behind the Roha, Dahlak and Venus bands shaped more than 250 albums.",
    tags: ["artists", "ethio-jazz"],
    featured: false,
    edition: false,
    body: `<p>Born in 1952 in Addis Ababa, Dawit Yifru began formal music training in 1962 at the Haile Selassie I Theatre. Over six decades he co-founded the Venus, Dahlak and Roha bands and arranged and played keyboards on more than 250 albums for Ethiopia's greatest vocalists.</p>
<p>A founding member of the Ethiopian Musicians Association, he helped champion the country's first copyright legislation. <a href="/artists/dawit-yifru">Read his profile</a>.</p>`,
  },
];
