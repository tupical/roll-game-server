// Cell module interfaces
import { CellEventType, WorldCoord } from '@common/interfaces/game.interface';

export interface ICell {
  x: number;
  y: number;
  eventType: CellEventType;
  eventValue?: number;
  lastUpdated: Date;
}

export interface ICellRepository {
  findByCoordinates(x: number, y: number): Promise<ICell | null>;
  save(cell: ICell): Promise<ICell>;
  findAllInRadius(center: WorldCoord, radius: number): Promise<ICell[]>;
}

export interface ICellFactory {
  createCell(x: number, y: number): ICell;
}

export interface ICellService {
  getCell(x: number, y: number): Promise<ICell>;
  getCellsInRadius(center: WorldCoord, radius: number): Promise<ICell[]>;
}
