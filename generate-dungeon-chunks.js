const fs = require('fs');
const path = require('path');

const now = '2025-06-25T12:00:00.000Z';
const size = 50;
const chunk = 10;
const outDir = path.join(__dirname, 'src/data/world/dungeon_1/chunks');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// Допустимые ключи для cellType - используем новые названия из dungeon_crypt.json
const floorTiles = ['floor_0', 'floor_1', 'floor_2', 'floor_damaged_0'];
const wallTiles = {
  // Основные стены
  single: 'wall_single_0',
  single_damaged: 'wall_single_damaged_0',
  
  // Верхние стены
  top_single: 'wall_top_single_0',
  top_left: 'wall_top_left_0',
  top_middle: 'wall_top_middle_0',
  top_right: 'wall_top_right_0',
  top_middle_damaged: 'wall_top_middle_damaged_0',
  
  // Боковые стены
  side_top: 'wall_side_top_0',
  side_middle: 'wall_side_middle_0',
  side_bottom: 'wall_side_bottom_0',
  side_damaged: 'wall_side_damaged_0',
  
  // Углы
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

const stairTiles = {
  up: 'stairs_up_0',
  down: 'stairs_down_0'
};

// Простая генерация помещений (комнат)
const rooms = [
  { x1: 2, y1: 2, x2: 17, y2: 17 },
  { x1: 20, y1: 2, x2: 35, y2: 17 },
  { x1: 2, y1: 20, x2: 17, y2: 35 },
  { x1: 20, y1: 20, x2: 35, y2: 35 }
];

// Функция проверки, принадлежит ли точка комнате
function inRoom(x, y) {
  return rooms.some(r => x >= r.x1 && x <= r.x2 && y >= r.y1 && y <= r.y2);
}

// Функция проверки, находится ли точка на стене комнаты
function isRoomWall(x, y) {
  return rooms.some(r =>
    (x === r.x1 || x === r.x2 || y === r.y1 || y === r.y2) &&
    x >= r.x1 && x <= r.x2 && y >= r.y1 && y <= r.y2
  );
}

// Функция проверки, находится ли точка на углу комнаты
function isRoomCorner(x, y) {
  return rooms.some(r =>
    ((x === r.x1 && y === r.y1) ||
     (x === r.x2 && y === r.y1) ||
     (x === r.x1 && y === r.y2) ||
     (x === r.x2 && y === r.y2))
  );
}

// Функция для генерации дверей между комнатами
function isDoor(x, y) {
  // Двери между комнатами по центру каждой стены
  return rooms.some(r => (
    ((x === Math.floor((r.x1 + r.x2) / 2)) && (y === r.y1 || y === r.y2)) ||
    ((y === Math.floor((r.y1 + r.y2) / 2)) && (x === r.x1 || x === r.x2))
  ));
}

// Функция для определения типа стены в зависимости от положения
function getWallType(x, y, room) {
  // Углы комнаты
  if (x === room.x1 && y === room.y1) return wallTiles.corner_top_left;
  if (x === room.x2 && y === room.y1) return wallTiles.corner_top_right;
  if (x === room.x1 && y === room.y2) return wallTiles.corner_bottom_left;
  if (x === room.x2 && y === room.y2) return wallTiles.corner_bottom_right;
  
  // Верхние стены
  if (y === room.y1) return wallTiles.top_middle;
  // Нижние стены
  if (y === room.y2) return wallTiles.top_middle; // Используем тот же тайл для нижней стены
  // Левые стены
  if (x === room.x1) return wallTiles.side_middle;
  // Правые стены
  if (x === room.x2) return wallTiles.side_middle;
  
  return wallTiles.single;
}

for (let cy = 0; cy < 5; cy++) {
  for (let cx = 0; cx < 5; cx++) {
    const cells = [];
    for (let y = 0; y < chunk; y++) {
      for (let x = 0; x < chunk; x++) {
        let gx = cx * chunk + x, gy = cy * chunk + y;
        let cellType = null, eventType = 'EMPTY', eventValue;

        // Углы карты
        if (gx === 0 && gy === 0) cellType = wallTiles.corner_top_left;
        else if (gx === size-1 && gy === 0) cellType = wallTiles.corner_top_right;
        else if (gx === 0 && gy === size-1) cellType = wallTiles.corner_bottom_left;
        else if (gx === size-1 && gy === size-1) cellType = wallTiles.corner_bottom_right;
        // Границы карты
        else if (gy === 0) cellType = wallTiles.top_middle;
        else if (gy === size-1) cellType = wallTiles.top_middle;
        else if (gx === 0) cellType = wallTiles.side_middle;
        else if (gx === size-1) cellType = wallTiles.side_middle;
        // Внутри комнат
        else if (inRoom(gx, gy)) {
          // Стены комнат
          if (isRoomCorner(gx, gy)) {
            // Определяем нужный угол
            const r = rooms.find(r =>
              (gx === r.x1 && gy === r.y1) ||
              (gx === r.x2 && gy === r.y1) ||
              (gx === r.x1 && gy === r.y2) ||
              (gx === r.x2 && gy === r.y2)
            );
            if (gx === r.x1 && gy === r.y1) cellType = wallTiles.corner_top_left;
            else if (gx === r.x2 && gy === r.y1) cellType = wallTiles.corner_top_right;
            else if (gx === r.x1 && gy === r.y2) cellType = wallTiles.corner_bottom_left;
            else if (gx === r.x2 && gy === r.y2) cellType = wallTiles.corner_bottom_right;
          }
          else if (isRoomWall(gx, gy)) {
            // Двери на стенах
            if (isDoor(gx, gy)) cellType = doorTiles.closed;
            // Стены
            else {
              const room = rooms.find(r => 
                (gx === r.x1 || gx === r.x2 || gy === r.y1 || gy === r.y2) &&
                gx >= r.x1 && gx <= r.x2 && gy >= r.y1 && gy <= r.y2
              );
              cellType = getWallType(gx, gy, room);
            }
          }
          // Внутри комнаты — пол
          else cellType = floorTiles[Math.floor(Math.random() * floorTiles.length)];
        }
        // Между комнатами — двери
        else if (isDoor(gx, gy)) cellType = doorTiles.closed;
        // Вне комнат — пол
        else cellType = floorTiles[0];

        const cell = { x: gx, y: gy, cellType, eventType, lastUpdated: now };
        if (eventValue) cell.eventValue = eventValue;
        cells.push(cell);
      }
    }
    const filePath = path.join(outDir, `chunk_${cx}_${cy}.json`);
    fs.writeFileSync(filePath, JSON.stringify({ cells }, null, 2));
    console.log('Written', filePath);
  }
}