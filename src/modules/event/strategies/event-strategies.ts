// Event strategies implementation
import { Injectable } from '@nestjs/common';
import { IEventStrategy, IEventResult } from '../interfaces/event.interface';
import { CellEventType } from '@common/interfaces/game.interface';
import { IPlayer } from '@modules/player/interfaces/player.interface';

@Injectable()
export class BonusEventStrategy implements IEventStrategy {
  async handleEvent(player: IPlayer, eventType: CellEventType, eventValue: number = 0): Promise<IEventResult> {
    if (eventType !== CellEventType.BONUS_STEPS) {
      return { message: 'Неподходящий тип события', applied: false };
    }
    
    player.bonusSteps += eventValue;
    
    return {
      message: `Бонус! +${eventValue} шагов на след. ход.`,
      applied: true
    };
  }
}

@Injectable()
export class DebuffEventStrategy implements IEventStrategy {
  async handleEvent(player: IPlayer, eventType: CellEventType, eventValue: number = 0): Promise<IEventResult> {
    if (eventType !== CellEventType.DEBUFF_STEPS) {
      return { message: 'Неподходящий тип события', applied: false };
    }
    
    player.bonusSteps += eventValue; // Negative value
    
    return {
      message: `Дебафф! ${eventValue} шагов на след. ход.`,
      applied: true
    };
  }
}

@Injectable()
export class EnemyEventStrategy implements IEventStrategy {
  async handleEvent(player: IPlayer, eventType: CellEventType, eventValue: number = 1): Promise<IEventResult> {
    if (eventType !== CellEventType.ENEMY) {
      return { message: 'Неподходящий тип события', applied: false };
    }
    
    player.turnsToSkip += eventValue;
    
    return {
      message: `Враг! Вы пропускаете следующий ход.`,
      applied: true
    };
  }
}

@Injectable()
export class EmptyEventStrategy implements IEventStrategy {
  async handleEvent(player: IPlayer, eventType: CellEventType): Promise<IEventResult> {
    if (eventType !== CellEventType.EMPTY) {
      return { message: 'Неподходящий тип события', applied: false };
    }
    
    return {
      message: 'Пустая клетка',
      applied: true
    };
  }
}
