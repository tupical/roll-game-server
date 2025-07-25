// Player module interfaces
import { WorldCoord } from '@common/interfaces/game.interface';

export interface IPlayer {
  id: string;
  username: string;
  position: WorldCoord;
  visibleCells: Set<string>; // Keys of cells currently visible to the player
  exploredCells: Set<string>; // Keys of cells explored by the player (fog of war)
  discoveredCells: Map<string, import('@common/interfaces/game.interface').CellEventType>; // Ключи ячеек и их типы, раскрытые игроком
  currentRoll: number;
  die1Value: number;
  die2Value: number;
  stepsTaken: number;
  pathTaken: WorldCoord[];
  bonusSteps: number;
  turnsToSkip: number;
  lastActive: Date;
  // Состояние боя, если игрок находится в бою с ENEMY-клеткой
  battleState?: {
    enemyCell: WorldCoord;
    enemyHp: number;
    playerHp: number;
    turn: 'player' | 'enemy';
    log: string[];
    finished: boolean;
    victory?: boolean;
  };
  // Клетки с врагами, которые очищены этим игроком (ключи вида 'x,y')
  clearedEnemyCells: Set<string>;
}

export interface IPlayerRepository {
  findById(id: string): Promise<IPlayer | null>;
  save(player: IPlayer): Promise<IPlayer>;
  findAll(): Promise<IPlayer[]>;
  delete(id: string): Promise<boolean>;
}

export interface IPlayerService {
  getPlayer(id: string): Promise<IPlayer | null>;
  createPlayer(id: string, username: string, position?: WorldCoord): Promise<IPlayer>;
  updatePlayerPosition(id: string, position: WorldCoord): Promise<IPlayer | null>;
  updatePlayerVisibility(id: string, visibleCells: Set<string>): Promise<IPlayer | null>;
  updatePlayerExploration(id: string, exploredCells: Set<string>): Promise<IPlayer | null>;
  updatePlayerRoll(id: string, roll: number, die1: number, die2: number): Promise<IPlayer | null>;
  addBonusSteps(id: string, steps: number): Promise<IPlayer | null>;
  addTurnsToSkip(id: string, turns: number): Promise<IPlayer | null>;
}
