// Cell service implementation
import { Injectable } from '@nestjs/common';
import { ICellService, ICell } from './interfaces/cell.interface';
import { CellEventType, WorldCoord } from '@common/interfaces/game.interface';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CellService implements ICellService {
  private cells: Map<string, ICell> = new Map();

  // Helper method to generate cell key
  private getCellKey(x: number, y: number): string {
    return `${x},${y}`;
  }

  // Helper method to generate cell event based on position
  private generateCellEvent(x: number, y: number): { type: CellEventType, value?: number } {
    // Starting cell is always empty
    if (x === 0 && y === 0) {
      return { type: CellEventType.EMPTY };
    } 
    // Bonus cells
    else if ((x + y) % 7 === 0 && Math.random() > 0.3) {
      return { type: CellEventType.BONUS_STEPS, value: 2 };
    } 
    // Debuff cells
    else if ((x + y) % 5 === 0 && Math.random() > 0.3) {
      return { type: CellEventType.DEBUFF_STEPS, value: -2 };
    } 
    // Enemy cells
    else if ((x * y) % 11 === 0 && x > 0 && y > 0 && Math.random() > 0.5) {
      return { type: CellEventType.ENEMY, value: 1 };
    } 
    // Empty cells by default
    else {
      return { type: CellEventType.EMPTY };
    }
  }

  async getCell(x: number, y: number): Promise<ICell> {
    const cellKey = this.getCellKey(x, y);
    let cell = this.cells.get(cellKey);
    
    if (!cell) {
      // Create new cell if it doesn't exist
      const event = this.generateCellEvent(x, y);
      cell = {
        x,
        y,
        eventType: event.type,
        eventValue: event.value,
        lastUpdated: new Date()
      };
      this.cells.set(cellKey, cell);
    }
    
    return cell;
  }

  async getCellsInRadius(center: WorldCoord, radius: number): Promise<ICell[]> {
    const cells: ICell[] = [];
    const { x, y } = center;
    
    // Get all cells in the specified radius
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        // Check if cell is within radius (using Manhattan distance)
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
