// Supplier categories shared by the map markers and the suppliers list.
// Moving these out of FarmMap keeps Leaflet out of screens that only need labels.
export const CATEGORY_STYLE = {
  seeds: { color: '#2F6B3B', key: 'catSeeds' },
  fertilizer: { color: '#7A5C3E', key: 'catFertilizer' },
  irrigation: { color: '#1F6FA8', key: 'catIrrigation' },
  supplies: { color: '#C08A1E', key: 'catSupplies' },
  services: { color: '#A3412A', key: 'catServices' },
};

export const CATEGORY_ICON = {
  seeds: 'sprout',
  fertilizer: 'soil',
  irrigation: 'drop',
  supplies: 'store',
  services: 'shield',
};
