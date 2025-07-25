import { CellEventType } from '@common/interfaces/game.interface';
import { IPlayer } from '@modules/player/interfaces/player.interface';

export interface IEventResult {
  message: string;
  applied: boolean;
  battleState?: {
    enemyCell: { x: number; y: number };
    enemyHp: number;
    playerHp: number;
    turn: 'player' | 'enemy';
    log: string[];
    finished: boolean;
    victory?: boolean;
  };
}

export interface IEventStrategy {
  handleEvent(player: IPlayer, eventType: CellEventType, eventValue?: number): Promise<IEventResult>;
}
