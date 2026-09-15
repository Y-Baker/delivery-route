import { PriorityQueue } from '@datastructures-js/priority-queue';

const processTrips = (deliveries, maxCapacity = 10.0) => {
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

    if (!areaMap.has(delivery.area)) {
      areaMap.set(delivery.area, []);
    }
    areaMap.get(delivery.area).push(delivery);
  }

  // Sort deliveries within each area
  for (const list of areaMap.values()) {
    list.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      if (a.weight !== b.weight) return a.weight - b.weight;
      return a.index - b.index;
    });
  }

  // Setup Area Pointers (to keep track of the last visited index in each area)
  const areaPointers = new Map();
  for (const area of areaMap.keys()) {
    areaPointers.set(area, 0);
  }

  const trips = [];

  // Process deliveries
  while (!pq.isEmpty()) {
    let top = pq.pop();

    while (top && top.delivered && !pq.isEmpty()) {
      top = pq.pop();
    }

    if (!top || top.delivered) break;

    const targetArea = top.area;
    const areaList = areaMap.get(targetArea);
    let ptr = areaPointers.get(targetArea);

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

      if (tripWeight + candidate.weight <= maxCapacity) {
        tripPackages.push(candidate);
        candidate.delivered = true;
        tripWeight += candidate.weight;
        ptr++;
      } else {
        // never skip a package if it not fits to avoid 
        // 1) rescanning the whole list (O(N^2))
        // 2) leaving a package without delivery (constraint violated)
        break;
      }
    }

    areaPointers.set(targetArea, ptr);

    if (tripPackages.length > 0) {
      trips.push({
        tripNumber: trips.length + 1,
        area: targetArea,
        totalWeight: tripWeight,
        packages: tripPackages
      });
    }
  }
  return trips;
}

export default processTrips;
