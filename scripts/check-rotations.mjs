// Recomputes the rotation water and legume-nitrogen averages from the crop
// records and fails if the stored scenario values drift away from them.
import fs from 'fs';

const read = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const rotations = read('src/data/rotations.json');
const gaez = read('src/data/gaez.json');
const details = read('src/data/crop-details.json');
const crops = Object.fromEntries(gaez.crops.map((crop) => [crop.id, crop]));

const problems = [];

for (const crop of gaez.crops) {
  if (!Array.isArray(crop.seasonMonths) || crop.seasonMonths.length !== 2) {
    problems.push(`${crop.id}: missing seasonMonths`);
    continue;
  }
  const [start, end] = crop.seasonMonths;
  if (![start, end].every((m) => Number.isInteger(m) && m >= 1 && m <= 12)) {
    problems.push(`${crop.id}: seasonMonths must be integers from 1 to 12`);
  }
}

for (const [profile, data] of Object.entries(rotations.profiles)) {
  if (!data.scenarios.some((scenario) => scenario.id === 'current')) {
    problems.push(`${profile}: missing current scenario`);
  }

  for (const scenario of data.scenarios) {
    const tag = `${profile}/${scenario.id}`;
    if (!Array.isArray(scenario.years) || !scenario.years.length) {
      problems.push(`${tag}: no rotation years`);
      continue;
    }

    const cycle = scenario.years.flat();
    for (const crop of cycle) {
      if (!crops[crop.crop]) problems.push(`${tag}: unknown crop ${crop.crop}`);
      if (!details[crop.crop]) problems.push(`${tag}: no detail record for ${crop.crop}`);
      if (!Number.isInteger(crop.start) || !Number.isInteger(crop.end)) {
        problems.push(`${tag}: bad sowing window for ${crop.crop}`);
      }
    }

    if (cycle.some((crop) => !crops[crop.crop])) continue;

    const water = cycle.reduce((sum, crop) => sum + crops[crop.crop].waterMm, 0) / scenario.years.length;
    const fixedN = cycle.reduce((sum, crop) => sum + (details[crop.crop]?.nitrogenKgHa ?? 0), 0) / scenario.years.length;

    if (Math.round(water) !== scenario.waterMm) {
      problems.push(`${tag}: waterMm ${scenario.waterMm}, recomputed ${Math.round(water)}`);
    }
    if (Math.round(fixedN) !== scenario.nitrogenKgHa) {
      problems.push(`${tag}: nitrogenKgHa ${scenario.nitrogenKgHa}, recomputed ${Math.round(fixedN)}`);
    }
  }
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}

const scenarios = Object.values(rotations.profiles).reduce((sum, profile) => sum + profile.scenarios.length, 0);
console.log(
  `Rotation data consistent: ${scenarios} scenarios across ${Object.keys(rotations.profiles).length} profiles; `
  + 'water and legume nitrogen match crop records and actual cycle length.',
);
