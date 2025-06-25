// Game module interfaces
import { Direction, WorldCoord } from '@common/interfaces/game.interface';
import { IPlayer } from '@modules/player/interfaces/player.interface';
import { IDiceRollResult } from '@modules/dice/interfaces/dice.interface';
import { IEventResult } from '@modules/event/interfaces/event.interface';

export interface IMoveResult {
  success: boolean;
  newPosition?: WorldCoord;
  message?: string;
  eventTriggered?: boolean;
  eventMessage?: string;
  stepsLeft?: number;
  battleState?: {
    enemyCell: WorldCoord;
    enemyHp: number;
    playerHp: number;
    turn: 'player' | 'enemy';
    log: string[];
    finished: boolean;
    victory?: boolean;
  };
}

export interface IGameService {
  // Player movement
  movePlayer(worldId: string, playerId: string, direction: Direction): Promise<IMoveResult>;
  
  // Dice rolling
  rollDice(worldId: string, playerId: string): Promise<IDiceRollResult>;
  
  // Turn management
  startTurn(worldId: string, playerId: string): Promise<boolean>;
  endTurn(worldId: string, playerId: string): Promise<boolean>;
  
  // Event processing
  processEvent(worldId: string, playerId: string, position: WorldCoord): Promise<IEventResult>;
  
  // Game state
  getPlayerState(worldId: string, playerId: string): Promise<IPlayer | null>;
}
