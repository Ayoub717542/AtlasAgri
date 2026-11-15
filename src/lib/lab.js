// Soil laboratory values used by the demonstration.
// The sample PDF in /public has these figures. An uploaded PDF is NOT parsed in
// this prototype: we keep the file locally so the farmer can look at it, and the
// analysis uses the demonstration values, clearly labelled.

export const SAMPLE_LAB = {
  ph: 8.1,
  salinity: 0.9,
  organic: 1.4,
  nitrogen: 0.08,
  phosphorus: 14,
  potassium: 310,
  calcium: 18,
};

export const SAMPLE_LAB_META = {
  reference: 'BM-2024-0417',
  depth: '0–30 cm',
  sampled: '2024-10-17',
  plot: 'Plot 3, demonstration farm',
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Returns a lab object used by the analysis. `kind` is 'sample' or 'upload'.
export async function readLabFile(file) {
  await wait(900);
  return {
    kind: 'upload',
    fileName: file?.name ?? 'soil-report.pdf',
    values: { ...SAMPLE_LAB },
    simulated: true,
  };
}

export const sampleLab = () => ({
  kind: 'sample',
  fileName: 'soil-report-beni-mellal.pdf',
  values: { ...SAMPLE_LAB },
  simulated: true,
});

export function labSoilSummary(lab) {
  if (!lab) return null;
  const values = lab.values;
  const gaps = [];
  if (values.nitrogen < 0.1) gaps.push('nitrogen');
  if (values.organic < 2) gaps.push('organic');
  if (values.ph > 7.5) gaps.push('ph');
  return { values, gaps };
}
