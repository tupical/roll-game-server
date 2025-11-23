const fs = require('fs');
const path = require('path');

const now = '2025-06-25T12:00:00.000Z';
const size = 50;
const chunk = 10;
const outDir = path.join(__dirname, 'src/data/world/dungeon_1/chunks');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// Tile Definitions
const floorTiles = ['floor_0', 'floor_1', 'floor_2', 'floor_damaged_0'];
const wallTiles = {
  single: 'wall_single_0',
  single_damaged: 'wall_single_damaged_0',
  top_single: 'wall_top_single_0',
  top_left: 'wall_top_left_0',
  top_middle: 'wall_top_middle_0',
  top_right: 'wall_top_right_0',
  top_middle_damaged: 'wall_top_middle_damaged_0',
  side_top: 'wall_side_top_0',
  side_middle: 'wall_side_middle_0',
  side_bottom: 'wall_side_bottom_0',
  side_damaged: 'wall_side_damaged_0',
  corner_top_left: 'wall_corner_top_left_0',
  corner_top_right: 'wall_corner_top_right_0',
  corner_bottom_left: 'wall_corner_bottom_left_0',
  corner_bottom_right: 'wall_corner_bottom_right_0',
  corner_full: 'wall_corner_full_0',
  corner_top_side: 'wall_corner_top_side_0',
  corner_side_left: 'wall_corner_side_left_0',
  corner_side_right: 'wall_corner_side_right_0',
  corner_top_top: 'wall_corner_top_top_0'
};
const doorTiles = {
  closed: 'door_closed_0',
  open: 'door_open_0'
};

// Map State
const map = new Array(size).fill(null).map(() => new Array(size).fill(null));
// Initialize with default walls (filling the void)
for(let y=0; y<size; y++) {
    for(let x=0; x<size; x++) {
        map[y][x] = { type: 'VOID', cellType: wallTiles.single }; // Default fill
    }
}

// Configuration
const MIN_ROOM_SIZE = 6;
const MAX_ROOM_SIZE = 10;
const MAX_ROOMS = 20; // Try to fit this many
const PADDING = 2; // Space between rooms
const MAX_CONNECT_DIST = 5; // Try to keep rooms close

const rooms = [];

// Helper: Check overlap
function checkOverlap(room, padding) {
    const p = padding;
    for (const r of rooms) {
        if (
            room.x1 - p < r.x2 + p &&
            room.x2 + p > r.x1 - p &&
            room.y1 - p < r.y2 + p &&
            room.y2 + p > r.y1 - p
        ) {
            return true;
        }
    }
    return false;
}

// Helper: Get distance to closest room
function getMinDist(room) {
    if (rooms.length === 0) return 0;
    let min = Infinity;
    for (const r of rooms) {
        // Distance between centers? Or edges?
        // Manhattan distance between centers usually fine for this
        const dist = Math.abs(room.cx - r.cx) + Math.abs(room.cy - r.cy);
        // Approximate edge distance roughly
        const edgeDistX = Math.max(0, Math.max(r.x1 - room.x2, room.x1 - r.x2));
        const edgeDistY = Math.max(0, Math.max(r.y1 - room.y2, room.y1 - r.y2));
        const edgeDist = Math.max(edgeDistX, edgeDistY); // Chebyshev-ish for grid
        if (edgeDist < min) min = edgeDist;
    }
    return min;
}

// 1. Generate Rooms
// Place first room in center
const startW = Math.floor(Math.random() * (MAX_ROOM_SIZE - MIN_ROOM_SIZE + 1)) + MIN_ROOM_SIZE;
const startH = Math.floor(Math.random() * (MAX_ROOM_SIZE - MIN_ROOM_SIZE + 1)) + MIN_ROOM_SIZE;
const startX = Math.floor((size - startW) / 2);
const startY = Math.floor((size - startH) / 2);

rooms.push({
    x1: startX, y1: startY,
    x2: startX + startW - 1, y2: startY + startH - 1,
    cx: Math.floor(startX + startW / 2), cy: Math.floor(startY + startH / 2),
    id: 0
});

// Try to place other rooms
let attempts = 0;
while (rooms.length < MAX_ROOMS && attempts < 1000) {
    attempts++;
    const w = Math.floor(Math.random() * (MAX_ROOM_SIZE - MIN_ROOM_SIZE + 1)) + MIN_ROOM_SIZE;
    const h = Math.floor(Math.random() * (MAX_ROOM_SIZE - MIN_ROOM_SIZE + 1)) + MIN_ROOM_SIZE;
    
    // Random position
    const x = Math.floor(Math.random() * (size - w - 2)) + 1;
    const y = Math.floor(Math.random() * (size - h - 2)) + 1;
    
    const room = {
        x1: x, y1: y,
        x2: x + w - 1, y2: y + h - 1,
        cx: Math.floor(x + w / 2), cy: Math.floor(y + h / 2),
        id: rooms.length
    };

    if (checkOverlap(room, PADDING)) continue;
    
    // Check distance requirement ("not further than 4 cells")
    // We want tight packing.
    const dist = getMinDist(room);
    if (dist > 4) continue; // Too far

    rooms.push(room);
}

// Carve Rooms
rooms.forEach(room => {
    for (let ry = room.y1; ry <= room.y2; ry++) {
        for (let rx = room.x1; rx <= room.x2; rx++) {
            let isWall = (rx === room.x1 || rx === room.x2 || ry === room.y1 || ry === room.y2);
            if (isWall) {
                map[ry][rx] = { type: 'WALL', room: room };
            } else {
                map[ry][rx] = { type: 'FLOOR', room: room };
            }
        }
    }
});

// 2. Connect Rooms
// Connect each room to its nearest neighbor
function connectPoints(x1, y1, x2, y2) {
    let cx = x1;
    let cy = y1;
    const path = [];
    if (Math.random() < 0.5) {
        while (cx !== x2) { cx += (cx < x2 ? 1 : -1); path.push({x: cx, y: cy}); }
        while (cy !== y2) { cy += (cy < y2 ? 1 : -1); path.push({x: cx, y: cy}); }
    } else {
        while (cy !== y2) { cy += (cy < y2 ? 1 : -1); path.push({x: cx, y: cy}); }
        while (cx !== x2) { cx += (cx < x2 ? 1 : -1); path.push({x: cx, y: cy}); }
    }
    return path;
}

// Using Minimum Spanning Tree idea implicitly by connecting to nearest connected set?
// Simpler: Just connect room i to nearest room j (where j != i)
// But this might create disjoint sets.
// Better: Start with Room 0 in "Connected Set".
// Find closest room NOT in Connected Set to ANY room IN Connected Set.
// Connect them. Repeat. (Prim's Algorithm)

const connected = [rooms[0]];
const unconnected = rooms.slice(1);

while (unconnected.length > 0) {
    let minDist = Infinity;
    let bestRoomA = null; // From connected
    let bestRoomB = null; // From unconnected

    for (const rA of connected) {
        for (const rB of unconnected) {
            const dist = (rA.cx - rB.cx)**2 + (rA.cy - rB.cy)**2; // Squared euclidean
            if (dist < minDist) {
                minDist = dist;
                bestRoomA = rA;
                bestRoomB = rB;
            }
        }
    }

    if (bestRoomA && bestRoomB) {
        // Connect
        const path = connectPoints(bestRoomA.cx, bestRoomA.cy, bestRoomB.cx, bestRoomB.cy);
        path.forEach(p => {
            const cell = map[p.y][p.x];
            if (cell.type === 'WALL') {
                map[p.y][p.x] = { type: 'DOOR_CANDIDATE', room: cell.room };
            } else if (cell.type === 'VOID') {
                map[p.y][p.x] = { type: 'CORRIDOR' };
            }
        });

        // Move B to connected
        connected.push(bestRoomB);
        const idx = unconnected.indexOf(bestRoomB);
        unconnected.splice(idx, 1);
    } else {
        break; // Should not happen
    }
}

// 2.1 Validate Doors
for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
        if (map[y][x].type === 'DOOR_CANDIDATE') {
             const left = (map[y][x-1].type === 'WALL' || map[y][x-1].type === 'VOID' || map[y][x-1].type === 'DOOR_CANDIDATE');
             const right = (map[y][x+1].type === 'WALL' || map[y][x+1].type === 'VOID' || map[y][x+1].type === 'DOOR_CANDIDATE');
             const top = (map[y-1][x].type === 'WALL' || map[y-1][x].type === 'VOID' || map[y-1][x].type === 'DOOR_CANDIDATE');
             const bottom = (map[y+1][x].type === 'WALL' || map[y+1][x].type === 'VOID' || map[y+1][x].type === 'DOOR_CANDIDATE');
             
             if ((left && right) || (top && bottom)) {
                 map[y][x].type = 'DOOR';
             } else {
                 map[y][x].type = 'FLOOR';
             }
        }
    }
}

// 3. Assign Tiles
function getRoomWallTile(x, y, room) {
    if (x === room.x1 && y === room.y1) return wallTiles.corner_top_left;
    if (x === room.x2 && y === room.y1) return wallTiles.corner_top_right;
    if (x === room.x1 && y === room.y2) return wallTiles.corner_bottom_left;
    if (x === room.x2 && y === room.y2) return wallTiles.corner_bottom_right;
    if (y === room.y1) return wallTiles.top_middle;
    if (y === room.y2) return wallTiles.top_middle;
    if (x === room.x1) return wallTiles.side_middle;
    if (x === room.x2) return wallTiles.side_middle;
    return wallTiles.single;
}

for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
        const cell = map[y][x];
        let cellType = wallTiles.single;

        if (cell.type === 'FLOOR') {
            cellType = floorTiles[Math.floor(Math.random() * floorTiles.length)];
        } else if (cell.type === 'CORRIDOR') {
            cellType = floorTiles[0];
        } else if (cell.type === 'DOOR') {
            cellType = doorTiles.closed;
        } else if (cell.type === 'WALL') {
            if (cell.room) {
                cellType = getRoomWallTile(x, y, cell.room);
            } else {
                cellType = wallTiles.single;
            }
        } else {
             cellType = wallTiles.single;
        }
        cell.cellType = cellType;
    }
}

// Output
for (let cy = 0; cy < size / chunk; cy++) {
  for (let cx = 0; cx < size / chunk; cx++) {
    const cells = [];
    for (let y = 0; y < chunk; y++) {
      for (let x = 0; x < chunk; x++) {
        let gx = cx * chunk + x, gy = cy * chunk + y;
        if (gx >= size || gy >= size) continue;

        const mapCell = map[gy][gx];
        const cell = { 
            x: gx, 
            y: gy, 
            cellType: mapCell.cellType, 
            eventType: 'EMPTY', 
            lastUpdated: now 
        };
        cells.push(cell);
      }
    }
    const filePath = path.join(outDir, `chunk_${cx}_${cy}.json`);
    fs.writeFileSync(filePath, JSON.stringify({ cells }, null, 2));
    console.log('Written', filePath);
  }
}

const roomsFilePath = path.join(path.dirname(outDir), 'rooms.json');
fs.writeFileSync(roomsFilePath, JSON.stringify({ rooms }, null, 2));
console.log('Written rooms metadata', roomsFilePath);
