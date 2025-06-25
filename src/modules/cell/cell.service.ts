// Cell service implementation
import { Injectable } from '@nestjs/common';
import { ICellService, ICell } from './interfaces/cell.interface';
import { CellEventType, WorldCoord } from '@common/interfaces/game.interface';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CellService implements ICellService {
  private cells: Map<string, ICell> = new Map();
  private staticCells: Map<string, ICell> = new Map();

  constructor() {
    // Загружаем клетки из статического JSON при инициализации
    try {
      const filePath = path.join(process.cwd(), 'src/data/static-world.json');
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const world = JSON.parse(fileContent);
      if (world.cells && Array.isArray(world.cells)) {
        for (const cell of world.cells) {
          const key = `${cell.x},${cell.y}`;
          this.staticCells.set(key, {
            ...cell,
            lastUpdated: cell.lastUpdated ? new Date(cell.lastUpdated) : new Date()
          });
        }
      }
    } catch (e) {
      console.error('Ошибка загрузки статических клеток:', e);
    }
  }

  // Helper method to generate cell key
  private getCellKey(x: number, y: number): string {
    return `${x},${y}`;
  }

  async getCell(x: number, y: number): Promise<ICell> {
    const cellKey = this.getCellKey(x, y);
    let cell = this.staticCells.get(cellKey);
    if (!cell) {
      // Если клетки нет в статическом мире — возвращаем пустую клетку
      cell = {
        x,
        y,
        eventType: CellEventType.EMPTY,
        lastUpdated: new Date()
      };
    }
    return cell;
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
}
