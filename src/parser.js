import fs from 'node:fs';

const MAX_CAPACITY = 10.0;
const ID_IDX = 0;
const AREA_IDX = 1;
const PRIORITY_IDX = 2;
const WEIGHT_IDX = 3;


const parseCsv = (filePath) => {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Input file not found at path: ${filePath}`);
  }

  const rawContent = fs.readFileSync(filePath, 'utf-8');
  const lines = rawContent.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0); // split by endline

  if (lines.length === 0) {
    return { deliveries: [], warnings: [] };
  }

  const deliveries = [];
  const warnings = [];
  const seenIds = new Set();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const rowNumber = i + 1;
    const tokens = line.split(',').map(t => t.trim());

    if (tokens.length <= Math.max(ID_IDX, AREA_IDX, PRIORITY_IDX, WEIGHT_IDX)) {
      warnings.push(`Line ${rowNumber}: Incomplete row "${line}". Skipping.`);
      continue;
    }

    const rawId = tokens[ID_IDX];
    const rawArea = tokens[AREA_IDX];
    const rawPriority = tokens[PRIORITY_IDX];
    const rawWeight = tokens[WEIGHT_IDX];

    // Validate ID
    if (!rawId) {
      warnings.push(`Line ${rowNumber}: Missing delivery ID. Skipping.`);
      continue;
    }
    if (seenIds.has(rawId)) {
      warnings.push(`Line ${rowNumber}: Duplicate delivery ID "${rawId}". Skipping.`);
      continue;
    }

    // Validate Area
    if (!rawArea) {
      warnings.push(`Line ${rowNumber} (ID ${rawId}): Missing destination area. Skipping.`);
      continue;
    }

    // Validate Priority
    const priority = Number(rawPriority);
    if (!Number.isInteger(priority) || priority <= 0) {
      warnings.push(
        `Line ${rowNumber} (ID ${rawId}): Invalid priority "${rawPriority}". Priority must be a positive integer. Skipping.`
      );
      continue;
    }

    // Validate Weight
    const weight = Number(rawWeight);
    if (isNaN(weight) || weight <= 0) {
      warnings.push(
        `Line ${rowNumber} (ID ${rawId}): Invalid package weight "${rawWeight}". Weight must be a positive number. Skipping.`
      );
      continue;
    }

    // Edge Case: Package weight > MAX_CAPACITY
    if (weight > MAX_CAPACITY) {
      warnings.push(
        `Line ${rowNumber} (ID ${rawId}): Package weight ${weight.toFixed(1)} kg exceeds maximum vehicle capacity (${MAX_CAPACITY} kg). Skipping.`
      );
      continue;
    }

    seenIds.add(rawId);
    deliveries.push({
      id: rawId,
      area: rawArea,
      priority,
      weight,
      index: deliveries.length,
      delivered: false
    });
  }

  return { deliveries, warnings };
};

const parseZonesCsv = (filePath) => {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Zones configuration file not found at path: ${filePath}`);
  }

  const rawContent = fs.readFileSync(filePath, 'utf-8').trim();
  if (rawContent.length === 0) {
    return new Map();
  }

  const areaToRegion = new Map();

  const lines = rawContent.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);

  for (const line of lines) {
    const areas = line
      .split(',')
      .map(a => a.trim().replace(/^["']|["']$/g, ''))  // regex remove quotes
      .filter(a => a.length > 0);

    if (areas.length > 0) {
      const regionName = `${areas[0]} Cluster`;
      for (const area of areas) {
        areaToRegion.set(area, regionName);
      }
    }
  }

  return areaToRegion;
};

export { parseCsv, parseZonesCsv, MAX_CAPACITY };
