# Delivery Route Planner

A Node.js program that organizes delivery requests into capacity-constrained vehicle trips while balancing delivery urgency, geographic grouping, and edge-case resilience.

---

## 1. How to Run

### Prerequisites
- Node.js (v18+ recommended; tested on Node v22).
- Zero build steps required (uses native ES Modules).

### Setup
```bash
npm install
```

### Running the Program

```bash
# 1. Run with the default challenge dataset
node src/index.js data/sample.csv
# or via npm:
npm start

# 2. Run with Geographic Zone enabled
node src/index.js data/zone_sample.csv --zone
```

---

## 2. Input Format

Deliveries are read from a CSV file matching the following structure:

```csv
ID,Area,Priority,Package Weight (kg)
1,Nasr City,2,4.5
2,Maadi,1,2.0
3,Nasr City,3,1.2
4,Zamalek,1,7.0
5,Maadi,2,3.5
```

- **Validation**:
  - `Priority`: Positive integer (`1` = most urgent, `2` = next).
  - `Weight`: Positive number $\le 10.0$ kg (the vehicle's physical limit).
  - Packages $> 10.0$ kg, negative values, malformed lines, or duplicate IDs log descriptive warnings and are skipped without crashing.

---

## 3. Technical Reasoning Questions

### 1. Explain your solution approach in your own words.

The core idea: repeatedly find the most urgent unshipped delivery, build one trip and add possible packages that can add without exceed max capacity, then repeat until nothing is left.

To do that without re-scanning the whole list every time (which would take O(N ^ 2)), I stored the deliveries in two structures:

- A priority queue of every undelivered item, ordered by priority first, then weight, then original file order as a tiebreaker. Popping it tells me the single most urgent delivery left.
- A map from area name to that area's deliveries, pre-sorted by the same rule that helps picking the next packages for the current trip to group with as same location. 

Each trip starts by popping the priority queue to find the next most urgent
delivery — that becomes the trip's anchor and its area becomes the trip's area
(deliveries to different areas are never mixed in one trip). Then I walk forward
through that area's list, adding deliveries as long as they still fit under 10kg.
The moment one doesn't fit, I close the trip right there instead of skipping ahead
to look for something smaller that would fit — that keeps the scan a single pass (avoid O(N^2) complexity)
instead of degrading badly on certain inputs (more on this in question 3).

Because the queue and the area map hold references to the same delivery objects,
marking one `delivered` updates it everywhere at once (avoid need to sync structures). So if the queue later pops
a delivery that already went out with its area, I just discard it and move on —
no need to search for it or remove it from the middle of the heap.

Net effect: every delivery is looked at a small, constant number of times overall,
so the whole thing runs in O(N log N) time and O(N) space even in the worst case.

---

### 2. What was the most difficult part of the assignment?

The trickiest part wasn't the initial design — it was noticing a subtle performance
bug in it. My first version of the packing loop re-scanned an entire area's delivery
list from the start every time it built a new trip for that area, just skipping over
items already marked as delivered. That looks fine at a glance, and it's easy to miss
in a quick read-through, but it's actually quadratic in the worst case: if an area has
many deliveries that only fit one per trip (e.g. everything is just over half the
vehicle's capacity), you end up re-scanning a shrinking list over and over — closer to
O(N²) than the O(N log N) I was aiming for.

The fix was to give each area a forward-only pointer instead of rescanning from index
zero: once an item is passed over, the next trip never looks at it again. That also
forced a decision I hadn't thought through up front — when an item is too heavy for
the remaining space in the current trip, do I skip it and keep checking smaller items
further down the list, or close the trip immediately? Skipping and continuing packs
trips a bit tighter on average, but it reopens the same quadratic risk, since a
skipped item still has to be revisited in a later trip. I chose to close the trip
immediately (Next-Fit) specifically to keep the scan-once guarantee, and accepted the
tradeoff that some trips ship a little under capacity as a result.

Getting from "a design that looks correct" to "a design where I can actually defend
the complexity bound under an adversarial input" was the real difficulty — the happy
path was never the hard part.

---

### 3. Are there situations where your algorithm may not produce the best possible grouping? Explain.

Yes — finding the absolute best packing (fewest trips, fullest vehicles) is a
well-known hard problem in general, so any algorithm that runs fast has to give up
some packing density in exchange. A few concrete ways this shows up here:

1. **Next-Fit leaves capacity on the table.** Say a trip has 3.0 kg of space left
   and the next item in line weighs 4.0 kg — it doesn't fit, so I close the trip
   right there. I don't look further down the list for something smaller (like a
   2.0 kg item) that would fit, because that would mean revisiting items I'd
   already passed over, which is what caused the performance bug in question 2.
   So a trip can ship with unused capacity even though a better-fitting item
   existed a few positions later.

3. **Anchors are chosen greedily, not globally.** Each trip is built around
   whichever delivery is most urgent *right now*, not by looking ahead at the
   whole remaining list to find the grouping that minimizes total trips. That
   keeps the algorithm fast and predictable, but it's a local decision, not a
   globally optimal one.

In short: the algorithm prioritizes speed and predictable behavior over squeezing
out every last kilogram of capacity, and priority order is treated as more
important than packing density when the two are in tension.
---

### 4. If the input contained 1,000,000 delivery requests, what part of your solution might become slow or memory-intensive?

The algorithm itself stays O(N log N), so it wouldn't blow up in the way a 
O(N^2) solution would.

1. **CSV parsing** Reading a million rows with something
   like `fs.readFileSync` loads the whole file into memory as one string before
   parsing it into a million individual objects.

   A streaming parser that processes and discards rows incrementally would use less peak memory 
   and avoid holding two large representations of the same data at once.

2. **Stdout I/O Bottleneck.** Formatting and writing hundreds of thousands of trips to 
   the console terminal would be the slowest part of the program (I/O bound).
   Production systems should stream output directly to an indexed database or export 
   file.

---

### 5. What would you improve if you had another day to work on the solution?

1. **Real geographic clustering instead of a hand-curated region list.** Right now,
   nearby areas that can share a trip are defined by a static list I write myself
   (e.g. grouping "Nasr City" and "Heliopolis" together). That's a reasonable
   starting point, but it doesn't scale to areas I haven't thought to list, and it
   can't express "close enough" as a matter of degree. With more time, I'd use
   actual coordinates for each area and either a distance threshold or a simple
   clustering method (like k-means) to group areas automatically, rather than
   hardcoding the list.

2. **Benchmark the 1M-row case for real instead of estimating it.** My answer to
   question 4 is a reasoned guess about where the time would go — parsing, GC,
   output — but I haven't actually generated a million-row file and measured it.
   I'd want to do that, profile where the time actually goes, and fix whatever the
   data shows rather than what I assume.

3. **Add Unit Tests.** Add a native test suite with Node's built-in `node:test` runner 
   verifying invariant properties (e.g. `sum(tripWeight) <= 10.0`, all valid IDs accounted for exactly once).

---

## Bonus Feature: Zone Clustering (`--zone`)

### Why I chose this

The requirements say deliveries to the same area should be grouped "where
reasonably possible," but the core algorithm treats area as a strict boundary —
two deliveries a few streets apart don't get grouped just because they're
administratively in different neighborhoods (e.g. Dokki and Mohandessin). In a
real delivery operation, that means sending two half-full vans to streets that
are basically next to each other. I wanted a way to relax that boundary without
touching the parts of the algorithm I'd already worked out were correct.

### How it works

It's an opt-in flag (`--zone`) that merges nearby areas into a single group
*before* the algorithm ever sees the data — nothing about the packing logic
itself changes.

1. **Zone list.** Clusters of nearby areas are defined in `data/zones.csv`, one
   cluster per line:
```csv
   Nasr City, Heliopolis, Madinaty
   Maadi, Zamalek, Downtown
   Dokki, Mohandessin, Agouza
   Sheikh Zayed, 6th of October
```
2. **A lookup table, not a code change.** Before building the area map, I build
   an `areaToRegion` map from that file — each area points to its cluster name.
   Any area not listed just maps to itself, so the feature is fully optional and
   doesn't change behavior when it's off.
3. **One line different.** The area map gets keyed by region instead of by raw
   area name. That's the entire change — the priority queue, the packing loop,
   and the forward-only pointer per group are exactly the same code as before.

### Why I did it this way instead of a fallback during packing

An earlier version of this idea let a trip pull filler deliveries from a nearby
area whenever the anchor's own area ran out — chosen dynamically, during packing.
I moved away from that because it means a delivery that doesn't fit *this* trip
has to stay eligible for a *later* one, which reopens the same kind of repeated
re-scanning that caused the performance bug in question 2. Merging zones before
packing even starts avoids that risk entirely — the algorithm's O(N log N)
guarantee doesn't need to change or be re-proven, because as far as the packing
logic is concerned, nothing about its input has changed shape.


### Impact Demonstration (`data/zone_sample.csv`)

| Mode | Command | Total Trips | Capacity Utilization |
| :--- | :--- | :--- | :--- |
| **Strict Single-Area** | `node src/index.js data/zone_sample.csv` | **3 Trips** | 41.7% |
| **Zone Clustering** | `node src/index.js data/zone_sample.csv --zone` | **2 Trips** | **62.5%** *(Saved 1 vehicle trip & fuel)* |
