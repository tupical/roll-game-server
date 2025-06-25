// WebSocket module interfaces
import { Direction, WorldCoord } from '@common/interfaces/game.interface';
import { IDiceRollResult } from '@modules/dice/interfaces/dice.interface';
import { IMoveResult } from '@modules/game/interfaces/game.interface';
import { IPlayer } from '@modules/player/interfaces/player.interface';
import { VisibleMap } from '@modules/world/interfaces/world.interface';

export interface ISocketEvent {
  type: string;
  payload: any;
}

export interface IPlayerJoinData {
  worldId: string;
  playerId: string;
  username: string;
}

export interface IPlayerMoveData {
  worldId: string;
  playerId: string;
  direction: Direction;
}

export interface IPlayerRollData {
  worldId: string;
  playerId: string;
}

export interface IPlayerUpdateData {
  id?: string;
  username?: string;
  position?: WorldCoord;
  currentRoll?: number;
  stepsTaken?: number;
  stepsLeft?: number;
  pathTaken?: WorldCoord[];
  bonusSteps?: number;
  turnsToSkip?: number;
}

export interface IEventTriggeredData {
  message: string;
  position: WorldCoord;
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

export interface IWebSocketGateway {
  handleConnection(client: any): void;
  handleDisconnect(client: any): void;
  handlePlayerJoin(client: any, data: IPlayerJoinData): Promise<void>;
  handlePlayerMove(client: any, data: IPlayerMoveData): Promise<void>;
  handlePlayerRoll(client: any, data: IPlayerRollData): Promise<void>;
  handlePlayerEndTurn(client: any, data: { worldId: string, playerId: string }): Promise<void>;
  
  // Emitters
  emitPlayerUpdate(playerId: string, data: IPlayerUpdateData): void;
  emitMapUpdate(playerId: string, map: VisibleMap): void;
  emitDiceRolled(playerId: string, result: IDiceRollResult): void;
  emitEventTriggered(playerId: string, data: IEventTriggeredData): void;
  emitError(playerId: string, message: string): void;
}
