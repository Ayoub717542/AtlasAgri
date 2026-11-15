// Language-aware names for crops (places use lib/places.js)
import credits from '../data/photo-credits.json';

export const cropName = (crop, lang) => {
  if (!crop) return '';
  if (lang === 'ar') return crop.nameAr ?? crop.name;
  if (lang === 'fr') return crop.nameFr ?? crop.name;
  return crop.name;
};

export const cropSeason = (crop, lang) => {
  if (!crop) return '';
  if (lang === 'ar') return crop.seasonAr ?? crop.season;
  if (lang === 'fr') return crop.seasonFr ?? crop.season;
  return crop.season;
};

export const cropPhoto = (id) => credits[id]?.file;
export const photoCredits = credits;
