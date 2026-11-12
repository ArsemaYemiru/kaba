import type { ArtistCategory } from "../../src/generated/prisma/enums";

export type NotableWork = { title: string; year?: number; type?: string };

export type SeedArtist = {
  nameEn: string;
  nameAm?: string;
  stageName?: string;
  legalNameEn?: string;
  legalNameAm?: string;
  isGroup?: boolean;
  categories: ArtistCategory[];
  genres: string[];
  birthYear?: number;
  deathYear?: number;
  yearsActive?: string;
  isLegend?: boolean;
  shortBioEn?: string;
  notableWorks?: NotableWork[];
};

/**
 * §8.4a: published profiles. Bios are verbatim from the spec; the client will
 * review and expand them. No photos, no social links (unknown).
 * Work "type" is only set where the spec states it.
 */
export const PUBLISHED_ARTISTS: SeedArtist[] = [
  {
    nameEn: "Mulatu Astatke",
    nameAm: "ሙላቱ አስታጥቄ",
    categories: ["MUSICIAN"],
    genres: ["Ethio-jazz"],
    birthYear: 1943,
    isLegend: true,
    shortBioEn:
      "Vibraphonist, composer and arranger widely regarded as the father of Ethio-jazz, blending Ethiopian scales with jazz and Latin rhythms.",
    notableWorks: [
      { title: "Mulatu of Ethiopia", year: 1972 },
      { title: "Music featured in Jim Jarmusch's Broken Flowers", year: 2005, type: "Film" },
    ],
  },
  {
    nameEn: "Mahmoud Ahmed",
    nameAm: "ማሕሙድ አሕመድ",
    categories: ["SINGER"],
    genres: ["Ethiopian pop"],
    birthYear: 1941,
    isLegend: true,
    shortBioEn:
      "One of the defining voices of Addis Ababa's 1970s golden age, whose recordings reached global audiences through the Éthiopiques reissue series.",
    notableWorks: [{ title: "Ere Mela Mela" }],
  },
  {
    nameEn: "Tilahun Gessesse",
    nameAm: "ጥላሁን ገሠሠ",
    categories: ["SINGER"],
    genres: ["Ethiopian pop", "traditional"],
    birthYear: 1940,
    deathYear: 2009,
    isLegend: true,
    shortBioEn: 'Revered as "The Voice", one of the most beloved and influential singers in Ethiopian history.',
  },
  {
    nameEn: "Alemayehu Eshete",
    nameAm: "ዓለማየሁ እሸቴ",
    categories: ["SINGER"],
    genres: ["Ethiopian pop", "soul"],
    birthYear: 1941,
    deathYear: 2021,
    isLegend: true,
    shortBioEn: 'Golden-age singer nicknamed the "Ethiopian Elvis" for his energetic, soul-influenced performances.',
  },
  {
    nameEn: "Aster Aweke",
    nameAm: "አስቴር አወቀ",
    categories: ["SINGER"],
    genres: ["Ethiopian pop", "soul"],
    isLegend: true,
    shortBioEn:
      "Powerhouse vocalist and one of the most internationally recognized Ethiopian singers, with a career spanning more than four decades.",
    notableWorks: [
      { title: "Aster", year: 1989 },
      { title: "Kabu", year: 1991 },
    ],
  },
  {
    nameEn: "Hailu Mergia",
    nameAm: "ኃይሉ መርጊያ",
    categories: ["MUSICIAN"],
    genres: ["Ethio-jazz", "funk"],
    isLegend: true,
    shortBioEn:
      "Keyboardist and leader of the Walias Band whose 1970s Ethio-jazz and funk recordings found a new global audience through reissues in the 2010s.",
    notableWorks: [{ title: "Walias Band recordings" }],
  },
  {
    nameEn: "Teddy Afro",
    nameAm: "ቴዲ አፍሮ",
    stageName: "Teddy Afro",
    legalNameEn: "Tewodros Kassahun",
    legalNameAm: "ቴዎድሮስ ካሳሁን",
    categories: ["SINGER"],
    genres: ["reggae", "Ethiopian pop"],
    birthYear: 1976,
    shortBioEn:
      "Singer-songwriter and one of the most popular Ethiopian artists of his generation, blending reggae, pop and traditional Ethiopian styles.",
    notableWorks: [
      { title: "Yasteseryal", year: 2005 },
      { title: "Tikur Sew", year: 2012 },
      { title: "Ethiopia", year: 2017 },
    ],
  },
  {
    nameEn: "Gigi",
    nameAm: "ጂጂ",
    stageName: "Gigi",
    legalNameEn: "Ejigayehu Shibabaw",
    legalNameAm: "እጅጋየሁ ሽባባው",
    categories: ["SINGER"],
    genres: ["world", "jazz", "electronic"],
    shortBioEn:
      "Singer who fuses Ethiopian song with jazz, funk and electronic production; her self-titled 2001 album, produced by Bill Laswell, brought her international acclaim.",
    notableWorks: [{ title: "Gigi", year: 2001 }],
  },
  {
    nameEn: "Betty G",
    nameAm: "ቤቲ ጂ",
    stageName: "Betty G",
    legalNameEn: "Bruktawit Getahun",
    legalNameAm: "ብሩክታዊት ጌታሁን",
    categories: ["SINGER"],
    genres: ["pop", "soft rock"],
    yearsActive: "2012",
    shortBioEn:
      "Singer-songwriter whose 2015 debut Manew Fitsum made her a star. She won Album of the Year at AFRIMA 2018, became a UNHCR Goodwill Ambassador, and performed at the 2019 Nobel Peace Prize ceremony.",
    notableWorks: [{ title: "Manew Fitsum", year: 2015 }, { title: "Wegegta" }],
  },
  {
    nameEn: "Rophnan",
    nameAm: "ሮፍናን",
    stageName: "Rophnan",
    legalNameEn: "Rophnan Nuri",
    categories: ["PRODUCER_DJ", "SINGER"],
    genres: ["electronic"],
    birthYear: 1990,
    shortBioEn:
      "Producer, DJ and singer-songwriter who pioneered electronic music in Ethiopia. His 2018 debut Reflection (Netsebrak) was the first electronic music LP released in the country, and SIDIST made him the first home-grown Ethiopian artist to sign with a major international label.",
    notableWorks: [{ title: "Reflection", year: 2018 }, { title: "SOST", year: 2021 }, { title: "SIDIST" }],
  },
  {
    nameEn: "Seifu Fantahun",
    nameAm: "ሰይፉ ፋንታሁን",
    categories: ["COMEDIAN", "HOST_MEDIA"],
    genres: ["comedy", "talk show"],
    shortBioEn:
      "Comedian and broadcaster; creator and host of Seifu on EBS, Ethiopia's first local late-night talk show, which premiered in 2013.",
    notableWorks: [{ title: "Seifu on EBS", type: "TV show" }],
  },
  {
    nameEn: "Amleset Muchie",
    nameAm: "አምለሰት ሙጬ",
    categories: ["ACTOR"],
    genres: ["film", "TV"],
    birthYear: 1987,
    shortBioEn: "Actress, filmmaker and TV personality, and winner of the 2004 Miss University pageant.",
  },
  {
    nameEn: "Jano Band",
    nameAm: "ጃኖ ባንድ",
    isGroup: true,
    categories: ["MUSICIAN"],
    genres: ["rock", "Ethiopian traditional"],
    shortBioEn: "Addis Ababa band that fuses traditional Ethiopian music with rock.",
  },
];

/** Featured on Home, in this order (§8.2). */
export const FEATURED_ARTISTS = ["Mulatu Astatke", "Aster Aweke", "Teddy Afro", "Betty G", "Rophnan", "Mahmoud Ahmed"];

/**
 * §8.4b: Feta contestants as DRAFT profiles (name only, category OTHER).
 * Hidden from the public directory until an admin publishes them.
 */
export const DRAFT_CONTESTANTS = [
  "Lij Michael",
  "Hanan Tarik",
  "Fantu Mandoye",
  "Tilahun Elfineh",
  "Mekonnen Laeke",
  "Solomon Tekalign",
  "Berhanu Tesfaye",
  "Sehar Abdulkerim",
];
