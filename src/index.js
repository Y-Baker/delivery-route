import { parseCsv, MAX_CAPACITY } from './parser.js';
import processTrips from './logic.js';

const main = () => {
  const args = process.argv.slice(2);
  const filePath = args[0] || 'data/sample.csv';

  console.log('==================================================');
  console.log('             DELIVERY ROUTE logic               ');
  console.log('==================================================');
  console.log(`Input File:       ${filePath}`);

  let parseResult;
  try {
    parseResult = parseCsv(filePath);
  } catch (err) {
    console.error(`\n[Error] ${err.message}`);
    process.exit(1);
  }

  const { deliveries, warnings } = parseResult;

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

  const trips = processTrips(deliveries);

  console.log('\nTRIPS:\n');

  let totalDeliveredWeight = 0;

  for (const trip of trips) {
    totalDeliveredWeight += trip.totalWeight;
    const utilization = ((trip.totalWeight / MAX_CAPACITY) * 100).toFixed(1);

    console.log(`Trip ${trip.tripNumber}: ${trip.area}`);
    console.log(`  Total Weight: ${trip.totalWeight.toFixed(1)} kg / ${MAX_CAPACITY} kg (${utilization}% utilization)`);
    console.log(`  Packages (${trip.packages.length}):`);
    for (const pkg of trip.packages) {
      console.log(`    • ID: ${pkg.id.padEnd(4)} | Priority: ${pkg.priority} | Weight: ${pkg.weight.toFixed(1)} kg`);
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
}

main();
