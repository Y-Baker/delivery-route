import { PriorityQueue } from '@datastructures-js/priority-queue';

const processTrips = (deliveries, maxCapacity = 10.0, areaToRegion = new Map()) => {
  if (!deliveries || deliveries.length === 0) {
    return [];
  }

  // Setup Global Priority Queue & Area Map
  // Priority ASC -> Weight ASC -> Index ASC
  const pq = new PriorityQueue((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    if (a.weight !== b.weight) return a.weight - b.weight;
    return a.index - b.index;
  });

  const areaMap = new Map();

  for (const delivery of deliveries) {
    pq.push(delivery);


    const region = areaToRegion.get(delivery.area) || delivery.area;
    delivery.region = region;

    if (!areaMap.has(region)) {
      areaMap.set(region, []);
    }
    areaMap.get(region).push(delivery);
  }

  // Sort deliveries within each region
  for (const list of areaMap.values()) {
    list.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      if (a.weight !== b.weight) return a.weight - b.weight;
      return a.index - b.index;
    });
  }

  // Setup Area Pointers (to keep track of the last visited index in each region)
  const areaPointers = new Map();
  for (const region of areaMap.keys()) {
    areaPointers.set(region, 0);
  }

  const trips = [];

  // Process deliveries
  while (!pq.isEmpty()) {
    let top = pq.pop();

    while (top && top.delivered && !pq.isEmpty()) {
      top = pq.pop();
    }

    if (!top || top.delivered) break;

    const targetRegion = top.region;
    const areaList = areaMap.get(targetRegion);
    let ptr = areaPointers.get(targetRegion);

    const tripPackages = [top];
    top.delivered = true;
    let tripWeight = top.weight;

    // one-time iteration through each area list
    while (ptr < areaList.length) {
      const candidate = areaList[ptr];

      if (candidate.delivered) {
        ptr++;
        continue;
      }

      const newWeight = tripWeight + candidate.weight;
      if (newWeight <= maxCapacity) {
        tripPackages.push(candidate);
        candidate.delivered = true;
        tripWeight = newWeight;
        ptr++;
      } else {
        // never skip a package if it not fits to avoid:
        // 1) rescanning the whole list (O(N^2))
        // 2) leaving a package without delivery (constraint violated)
        break;
      }
    }

    areaPointers.set(targetRegion, ptr);

    if (tripPackages.length > 0) {
      const distinctAreas = [...new Set(tripPackages.map(p => p.area))];
      trips.push({
        tripNumber: trips.length + 1,
        region: targetRegion,
        areas: distinctAreas,
        totalWeight: tripWeight,
        packages: tripPackages
      });
    }
  }
  return trips;
};

export default processTrips;
