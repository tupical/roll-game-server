// Cell service implementation
import { Injectable } from '@nestjs/common';
import { ICellService, ICell } from './interfaces/cell.interface';
import { CellEventType, WorldCoord } from '@common/interfaces/game.interface';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CellService implements ICellService {
  private chunkCache: Map<string, ICell[]> = new Map();
  private chunkSize = 10;
  private worldSize = 50;
  private chunkDir = path.join(process.cwd(), 'src/data/world/dungeon_1/chunks');

  constructor() {}

  // Получить ключ чанка по координатам
  private getChunkKey(x: number, y: number): string {
    const cx = Math.floor(x / this.chunkSize);
    const cy = Math.floor(y / this.chunkSize);
    return `${cx}_${cy}`;
  }

  // Загрузить чанк из файла (или из кэша)
  private loadChunk(x: number, y: number): ICell[] {
    const chunkKey = this.getChunkKey(x, y);
    if (this.chunkCache.has(chunkKey)) {
      return this.chunkCache.get(chunkKey)!;
    }
    const filePath = path.join(this.chunkDir, `chunk_${chunkKey}.json`);
    if (!fs.existsSync(filePath)) return [];
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const chunk = JSON.parse(fileContent);
    this.chunkCache.set(chunkKey, chunk.cells);
    return chunk.cells;
  }

  // Helper method to generate cell key
  private getCellKey(x: number, y: number): string {
    return `${x},${y}`;
  }

  async getCell(x: number, y: number): Promise<ICell> {
    // Проверка границ мира
    if (x < 0 || y < 0 || x >= this.worldSize || y >= this.worldSize) {
      return {
        x, y,
        eventType: CellEventType.EMPTY,
        lastUpdated: new Date()
      };
    }
    const chunkCells = this.loadChunk(x, y);
    const cell = chunkCells.find(c => c.x === x && c.y === y);
    if (cell) {
      return {
        ...cell,
        lastUpdated: cell.lastUpdated ? new Date(cell.lastUpdated) : new Date()
      };
    }
    // Если клетки нет в чанке — возвращаем пустую клетку
    return {
      x, y,
      eventType: CellEventType.EMPTY,
      lastUpdated: new Date()
    };
  }

  async getCellsInRadius(center: WorldCoord, radius: number): Promise<ICell[]> {
    const cells: ICell[] = [];
    const { x, y } = center;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (Math.abs(dx) + Math.abs(dy) <= radius * 1.5) {
          const cellX = x + dx;
          const cellY = y + dy;
          const cell = await this.getCell(cellX, cellY);
          cells.push(cell);
        }
      }
    }
    return cells;
  }

  async updateCell(cell: ICell): Promise<void> {
    const chunkKey = this.getChunkKey(cell.x, cell.y);
    // Load chunk to cache if not present
    if (!this.chunkCache.has(chunkKey)) {
        this.loadChunk(cell.x, cell.y);
    }
    
    if (this.chunkCache.has(chunkKey)) {
        const cells = this.chunkCache.get(chunkKey)!;
        const index = cells.findIndex(c => c.x === cell.x && c.y === cell.y);
        if (index !== -1) {
            cells[index] = cell;
        } else {
            cells.push(cell);
        }
        // No persistence for now, just memory update
    }
  }
}
