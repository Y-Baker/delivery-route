import { parseCsv, parseZonesCsv, MAX_CAPACITY } from './parser.js';
import processTrips from './logic.js';

const ZONES_FILE_PATH = 'data/zones.csv';

const main = () => {
  const args = process.argv.slice(2);
  const isZoneMode = args.includes('--zone');
  const filePath = args.find(arg => !arg.startsWith('--')) || 'data/sample.csv';

  console.log('==================================================');
  console.log('             DELIVERY ROUTE PLANNER               ');
  console.log('==================================================');
  console.log(`Input File:       ${filePath}`);
  console.log(`Zone Clustering:  ${isZoneMode ? `Enabled (${ZONES_FILE_PATH})` : 'Disabled (Strict Single-Area)'}`);

  // Parse input deliveries
  let parseResult;
  try {
    parseResult = parseCsv(filePath);
  } catch (err) {
    console.error(`\n[Error] ${err.message}`);
    process.exit(1);
  }

  const { deliveries, warnings } = parseResult;

  // If zone mode enabled, parse fixed zones configuration
  let areaToRegion = new Map();
  if (isZoneMode) {
    try {
      areaToRegion = parseZonesCsv(ZONES_FILE_PATH);
    } catch (err) {
      console.error(`\n[Error loading zones] ${err.message}`);
      process.exit(1);
    }
  }

  if (warnings.length > 0) {
    console.log('\nValidation Warnings:');
    for (const warning of warnings) {
      console.log(`  [Warning] ${warning}`);
    }
  }

  console.log(`Valid Deliveries: ${deliveries.length}`);
  console.log(`Vehicle Capacity: ${MAX_CAPACITY} kg`);
  console.log('--------------------------------------------------');

  // Edge case: No deliveries found or empty file
  if (deliveries.length === 0) {
    console.log('\nNo valid deliveries to schedule.');
    console.log('Total Trips Scheduled: 0');
    console.log('==================================================');
    process.exit(0);
  }

  const trips = processTrips(deliveries, MAX_CAPACITY, areaToRegion);

  console.log('\nTRIPS:\n');

  let totalDeliveredWeight = 0;

  for (const trip of trips) {
    totalDeliveredWeight += trip.totalWeight;
    const utilization = ((trip.totalWeight / MAX_CAPACITY) * 100).toFixed(1);

    const areasLabel =
      trip.areas && trip.areas.length > 1
        ? `${trip.region} [${trip.areas.join(', ')}]`
        : trip.areas && trip.areas.length === 1
        ? trip.areas[0]
        : trip.region;

    console.log(`Trip ${trip.tripNumber}: ${areasLabel}`);
    console.log(`  Total Weight: ${trip.totalWeight.toFixed(1)} kg / ${MAX_CAPACITY} kg (${utilization}% utilization)`);
    console.log(`  Packages (${trip.packages.length}):`);
    for (const pkg of trip.packages) {
      const areaNote = trip.areas && trip.areas.length > 1 ? ` (${pkg.area})` : '';
      console.log(`    • ID: ${pkg.id.padEnd(4)} | Priority: ${pkg.priority} | Weight: ${pkg.weight.toFixed(1)} kg${areaNote}`);
    }
    console.log('');
  }

  const avgUtilization = trips.length > 0 ? (totalDeliveredWeight / (trips.length * MAX_CAPACITY)) * 100 : 0;

  console.log('==================================================');
  console.log('               EXECUTION SUMMARY                  ');
  console.log('==================================================');
  console.log(`Total Trips Scheduled:    ${trips.length}`);
  console.log(`Total Weight Delivered:   ${totalDeliveredWeight.toFixed(1)} kg`);
  console.log(`Avg Capacity Utilization: ${avgUtilization.toFixed(1)}%`);
  console.log('==================================================');
};

main();
