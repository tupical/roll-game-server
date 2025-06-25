// Player module interfaces
import { WorldCoord } from '@common/interfaces/game.interface';

export interface IPlayer {
  id: string;
  username: string;
  position: WorldCoord;
<<<<<<< HEAD
  visibleCells: Set<string>; // Keys of cells currently visible to the player
  exploredCells: Set<string>; // Keys of cells explored by the player (fog of war)
=======
  visibleCells: Set<string>; // Keys of cells visible to the player
>>>>>>> 45a3e43dadd0936aa1d227cbd8f685896cd29498
  currentRoll: number;
  die1Value: number;
  die2Value: number;
  stepsTaken: number;
  pathTaken: WorldCoord[];
  bonusSteps: number;
  turnsToSkip: number;
  lastActive: Date;
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
<<<<<<< HEAD
  updatePlayerExploration(id: string, exploredCells: Set<string>): Promise<IPlayer | null>;
=======
>>>>>>> 45a3e43dadd0936aa1d227cbd8f685896cd29498
  updatePlayerRoll(id: string, roll: number, die1: number, die2: number): Promise<IPlayer | null>;
  addBonusSteps(id: string, steps: number): Promise<IPlayer | null>;
  addTurnsToSkip(id: string, turns: number): Promise<IPlayer | null>;
}
