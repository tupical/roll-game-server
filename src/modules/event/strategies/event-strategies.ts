// Event strategies implementation
import { Injectable } from '@nestjs/common';
import { IEventStrategy, IEventResult } from '../interfaces/event.interface';
import { CellEventType } from '@common/interfaces/game.interface';
import { IPlayer } from '@modules/player/interfaces/player.interface';

// ВАЖНО: eventValue для DEBUFF_STEPS и BONUS_STEPS всегда должен быть положительным!
// Тип события определяет знак применения эффекта.
// Генерация карты/ячейки должна гарантировать положительный eventValue.

@Injectable()
export class BonusEventStrategy implements IEventStrategy {
  async handleEvent(player: IPlayer, eventType: CellEventType, eventValue: number = 0): Promise<IEventResult> {
    if (eventType !== CellEventType.BONUS_STEPS) {
      return { message: 'Неподходящий тип события', applied: false };
    }
    // eventValue всегда положительный
    player.bonusSteps += Math.abs(eventValue);
    return {
      message: `Бонус! +${Math.abs(eventValue)} шагов на след. ход.`,
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
    // eventValue всегда положительный
    player.bonusSteps -= Math.abs(eventValue); // Всегда уменьшает шаги
    return {
      message: `Дебафф! -${Math.abs(eventValue)} шагов на след. ход.`,
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

    // Логика боя перенесена из game.service.ts
    // Если нет активного боя или бой завершён, создать новый бой
    if (!player.battleState || player.battleState.finished ||
        player.battleState.enemyCell.x !== player.position.x || player.battleState.enemyCell.y !== player.position.y) {
      player.battleState = {
        enemyCell: { x: player.position.x, y: player.position.y },
        enemyHp: 3,
        playerHp: 3,
        turn: 'player',
        log: ['Бой начался!'],
        finished: false
      };
    }
    // Автоматический бой до победы одного из участников
    while (!player.battleState.finished) {
      if (player.battleState.turn === 'player') {
        player.battleState.enemyHp -= 1;
        player.battleState.log.push('Игрок атакует врага! -1 HP врагу');
        if (player.battleState.enemyHp <= 0) {
          player.battleState.finished = true;
          player.battleState.victory = true;
          player.battleState.log.push('Победа! Враг повержен.');
          // Добавляем клетку в список очищенных для этого игрока
          if (!player.clearedEnemyCells) player.clearedEnemyCells = new Set<string>();
          player.clearedEnemyCells.add(`${player.position.x},${player.position.y}`);
          break;
        }
        player.battleState.turn = 'enemy';
      } else {
        player.battleState.playerHp -= 1;
        player.battleState.log.push('Враг атакует игрока! -1 HP игроку');
        if (player.battleState.playerHp <= 0) {
          player.battleState.finished = true;
          player.battleState.victory = false;
          player.battleState.log.push('Поражение! Игрок погиб.');
          break;
        }
        player.battleState.turn = 'player';
      }
    }
    // Возвращаем результат с состоянием боя
    const result = {
      message: player.battleState.finished
        ? (player.battleState.victory ? 'Победа над врагом!' : 'Поражение в бою!')
        : 'Бой с врагом!',
      applied: true,
      battleState: player.battleState
    };
    // Если бой завершён, очищаем battleState, чтобы не возвращать его на следующих шагах
    if (player.battleState.finished) {
      setTimeout(() => { player.battleState = undefined; }, 0);
    }
    return result;
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
