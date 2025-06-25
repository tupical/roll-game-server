// World module interfaces
import { ICell } from '@modules/cell/interfaces/cell.interface';
import { IPlayer } from '@modules/player/interfaces/player.interface';
import { WorldCoord } from '@common/interfaces/game.interface';

export interface IWorld {
  id: string;
  name: string;
  createdAt: Date;
  lastUpdated: Date;
}

export interface IWorldRepository {
  findById(id: string): Promise<IWorld | null>;
  save(world: IWorld): Promise<IWorld>;
  findAll(): Promise<IWorld[]>;
  delete(id: string): Promise<boolean>;
}

export interface IWorldService {
  getWorld(id: string): Promise<IWorld | null>;
  createWorld(name: string): Promise<IWorld>;
  getAllWorlds(): Promise<IWorld[]>;
  deleteWorld(id: string): Promise<boolean>;
  
  // Player management in world
  addPlayerToWorld(worldId: string, playerId: string, username: string): Promise<IPlayer | null>;
  getPlayerInWorld(worldId: string, playerId: string): Promise<IPlayer | null>;
  getAllPlayersInWorld(worldId: string): Promise<IPlayer[]>;
  
  // Cell management in world
  getCellInWorld(worldId: string, x: number, y: number): Promise<ICell | null>;
  getVisibleMapForPlayer(worldId: string, playerId: string): Promise<VisibleMap | null>;
}

export interface VisibleCell extends ICell {
  isVisible: boolean;
  isExplored: boolean;
}

export interface VisibleMap {
  cells: VisibleCell[];
  centerX: number;
  centerY: number;
}
