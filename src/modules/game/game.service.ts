// Game service implementation
import { Injectable } from '@nestjs/common';
import { IGameService, IMoveResult } from './interfaces/game.interface';
import { Direction, WorldCoord } from '@common/interfaces/game.interface';
import { IDiceRollResult } from '@modules/dice/interfaces/dice.interface';
import { IEventResult } from '@modules/event/interfaces/event.interface';
import { IPlayer } from '@modules/player/interfaces/player.interface';
import { WorldService } from '@modules/world/world.service';
import { PlayerService } from '@modules/player/player.service';
import { DiceService } from '@modules/dice/dice.service';
import { EventService } from '@modules/event/event.service';

@Injectable()
export class GameService implements IGameService {
  constructor(
    private readonly worldService: WorldService,
    private readonly playerService: PlayerService,
    private readonly diceService: DiceService,
    private readonly eventService: EventService,
  ) {}

  /**
   * Проверка возможности игрока сделать ход
   */
  private canPlayerMove(player: IPlayer): { canMove: boolean; message?: string } {
    if (player.currentRoll <= 0) {
      return { canMove: false, message: 'Нужно сначала бросить кубики' };
    }
    if (player.stepsTaken >= player.currentRoll) {
      return { canMove: false, message: 'Все ходы уже использованы' };
    }
    if (player.turnsToSkip > 0) {
      return { canMove: false, message: 'Ход пропущен' };
    }
    return { canMove: true };
  }

  /**
   * Вычисление новой позиции на основе направления
   */
  private calculateNewPosition(position: WorldCoord, direction: Direction): WorldCoord {
    const newPos = { ...position };
    switch (direction) {
      case Direction.UP:
        newPos.y--;
        break;
      case Direction.DOWN:
        newPos.y++;
        break;
      case Direction.LEFT:
        newPos.x--;
        break;
      case Direction.RIGHT:
        newPos.x++;
        break;
    }
    return newPos;
  }

  async movePlayer(worldId: string, playerId: string, direction: Direction): Promise<IMoveResult & { visibleCells?: any[] }> {
    // Get player
    const player = await this.worldService.getPlayerInWorld(worldId, playerId);
    if (!player) {
      return { success: false, message: 'Игрок или мир не найден' };
    }

    // Check if player can move
    const moveCheck = this.canPlayerMove(player);
    if (!moveCheck.canMove) {
      return { success: false, message: moveCheck.message || 'Невозможно сделать ход' };
    }

    // Calculate new position
    const newPosition = this.calculateNewPosition(player.position, direction);

    // Проверка проходимости клетки
    const targetCell = await this.worldService.getCellInWorld(worldId, newPosition.x, newPosition.y);
    if (!targetCell) {
      return { success: false, message: 'Нельзя выйти за пределы карты' };
    }

    // Разрешаем ходить только по полу и дверям (которые не стены)
    const isPassable = targetCell.cellType && (
      targetCell.cellType.startsWith('floor') || 
      targetCell.cellType.startsWith('door') ||
      targetCell.cellType.startsWith('corridor') // Если используется такой тип
    );

    if (!isPassable) {
       return { success: false, message: 'Сюда нельзя пройти' };
    }

    // Проверка на повторное посещение ячейки в этом ходу
    if (player.pathTaken.slice(0, -1).some(pos => pos.x === newPosition.x && pos.y === newPosition.y)) {
      return { success: false, message: 'Нельзя вставать на уже пройденную ячейку в этом ходу' };
    }

    // Обновление позиции
    player.position = newPosition;
    player.stepsTaken++;
    player.pathTaken.push({ x: newPosition.x, y: newPosition.y });
    player.lastActive = new Date();

    // Автоматическое открытие дверей
    const cellsToCheck = [
        { x: newPosition.x, y: newPosition.y }, // Current cell (if we stepped on a closed door)
        { x: newPosition.x, y: newPosition.y - 1 }, // Up
        { x: newPosition.x, y: newPosition.y + 1 }, // Down
        { x: newPosition.x - 1, y: newPosition.y }, // Left
        { x: newPosition.x + 1, y: newPosition.y }  // Right
    ];

    for (const pos of cellsToCheck) {
        const cell = await this.worldService.getCellInWorld(worldId, pos.x, pos.y);
        if (cell && cell.cellType === 'door_closed_0') {
            cell.cellType = 'door_open_0';
            cell.lastUpdated = new Date();
            await this.worldService.updateCellInWorld(worldId, cell);
        }
    }

    // Update player in service
    await this.playerService.updatePlayerPosition(playerId, player.position);

    // Обновить область видимости после перемещения
    await this.worldService.updatePlayerVisibility(playerId);

    // Проверка ENEMY-клетки и запуск боя
    const cellKey = `${player.position.x},${player.position.y}`;
    const cell = await this.worldService.getCellInWorld(worldId, player.position.x, player.position.y);
    // Если клетка ENEMY и она уже очищена этим игроком, не запускаем бой и не отправляем событие
    if (cell && cell.eventType === 'ENEMY' && player.clearedEnemyCells && player.clearedEnemyCells.has(cellKey)) {
      const visibleCells = await this.getVisibleCellsAroundPlayer(worldId, playerId, player.position, 10);
      return {
        success: true,
        newPosition: player.position,
        eventTriggered: false,
        eventMessage: undefined,
        message: undefined,
        stepsLeft: player.currentRoll - player.stepsTaken,
        visibleCells,
        battleState: undefined
      };
    }
    // Если клетка ENEMY и не очищена — запускаем EventService.processEvent, чтобы получить battleState
    if (cell && cell.eventType === 'ENEMY') {
      const eventResult = await this.eventService.processEvent(player, player.position);
      const visibleCells = await this.getVisibleCellsAroundPlayer(worldId, playerId, player.position, 10);
      return {
        success: true,
        newPosition: player.position,
        eventTriggered: !!eventResult.applied,
        eventMessage: eventResult.applied ? eventResult.message : undefined,
        stepsLeft: player.currentRoll - player.stepsTaken,
        battleState: eventResult.battleState,
        message: undefined,
        visibleCells
      };
    }

    // Если игрок встал на ячейку с событием, ничего не делаем до применения события
    // УБРАНО: раскрытие типа ячейки при простом перемещении
    // if (cell && cell.eventType !== undefined && cell.eventType !== null && cell.eventType !== 'EMPTY') {
    //   player.discoveredCells = player.discoveredCells || new Map<string, import("@common/interfaces/game.interface").CellEventType>();
    //   player.discoveredCells.set(cellKey, cell.eventType);
    // }

    // Process event on cell
    let eventResult = { message: 'Нет события', applied: false };

    // Check if turn ended
    const turnEnded = player.stepsTaken >= player.currentRoll;
    if (turnEnded) {
      // Логирование для отладки применения события
      console.log(`[movePlayer] Завершение хода на клетке (${player.position.x},${player.position.y}), eventType: ${cell?.eventType}, player.bonusSteps: ${player.bonusSteps}, player.turnsToSkip: ${player.turnsToSkip}`);
      eventResult = await this.eventService.processEvent(player, player.position);
      // Лог после применения события
      console.log(`[movePlayer] После processEvent: applied=${eventResult.applied}, message=${eventResult.message}, bonusSteps: ${player.bonusSteps}, turnsToSkip: ${player.turnsToSkip}`);
      player.currentRoll = 0;
      await this.playerService.updatePlayerRoll(playerId, 0, player.die1Value, player.die2Value);
      // После применения события сохраняем тип события
      if (cell && cell.eventType !== undefined && cell.eventType !== null && cell.eventType !== 'EMPTY') {
        player.discoveredCells = player.discoveredCells || new Map<string, import("@common/interfaces/game.interface").CellEventType>();
        player.discoveredCells.set(cellKey, cell.eventType);
      }
    }

    // Возвращаем состояние боя клиенту
    const visibleCells = await this.getVisibleCellsAroundPlayer(worldId, playerId, player.position, 10);
    if (player.battleState) {
      return {
        success: true,
        newPosition: player.position,
        eventTriggered: true,
        eventMessage: player.battleState.finished
          ? (player.battleState.victory ? 'Победа над врагом!' : 'Поражение в бою!')
          : 'Бой с врагом!',
        stepsLeft: player.currentRoll - player.stepsTaken,
        battleState: player.battleState,
        message: undefined,
        visibleCells
      };
    } else {
      return {
        success: true,
        newPosition: player.position,
        eventTriggered: turnEnded ? eventResult.applied : false,
        eventMessage: turnEnded && eventResult.applied ? eventResult.message : undefined,
        stepsLeft: player.currentRoll - player.stepsTaken,
        battleState: undefined,
        message: undefined,
        visibleCells
      };
    }
  }

  /**
   * Получить клетки вокруг игрока в радиусе radius (включительно)
   */
  private async getVisibleCellsAroundPlayer(worldId: string, playerId: string, position: WorldCoord, radius: number) {
    // Получаем все клетки в радиусе
    const cells = await this.worldService.getCellsInRadius(position, radius);
    // Фильтруем Enemy-клетки, которые очищены этим игроком
    const player = await this.worldService.getPlayerInWorld(worldId, playerId);
    return cells.filter(cell => {
      if (cell.eventType === 'ENEMY' && player?.clearedEnemyCells?.has(`${cell.x},${cell.y}`)) {
        return false;
      }
      return true;
    });
  }

  async rollDice(worldId: string, playerId: string): Promise<IDiceRollResult> {
    // Get player
    const player = await this.worldService.getPlayerInWorld(worldId, playerId);
    if (!player) {
      throw new Error('Игрок или мир не найден');
    }

    // Check if player is skipping turns
    if (player.turnsToSkip > 0) {
      player.turnsToSkip--;
      player.currentRoll = 0;
      player.die1Value = 0;
      player.die2Value = 0;
      player.stepsTaken = 0;
      player.pathTaken = [player.position];
      player.lastActive = new Date();

      await this.playerService.updatePlayerRoll(playerId, 0, 0, 0);
      
      return { total: 0, die1: 0, die2: 0, stepsLeft: 0 };
    }

    // Roll dice
    const rollResult = await this.diceService.rollDice(player.bonusSteps);

    // Update player
    player.die1Value = rollResult.die1;
    player.die2Value = rollResult.die2;
    player.currentRoll = rollResult.total;
    player.bonusSteps = 0; // Reset bonus
    player.stepsTaken = 0;
    player.pathTaken = [{ x: player.position.x, y: player.position.y }];
    player.lastActive = new Date();

    // Update player in service
    await this.playerService.updatePlayerRoll(playerId, rollResult.total, rollResult.die1, rollResult.die2);

    // Reset processed cells for this player
    this.eventService.resetProcessedCellsForPlayer(worldId, playerId);

    return rollResult;
  }

  async startTurn(worldId: string, playerId: string): Promise<boolean> {
    const player = await this.worldService.getPlayerInWorld(worldId, playerId);
    if (!player) return false;

    // Reset player's turn state
    player.stepsTaken = 0;
    player.pathTaken = [player.position];
    player.lastActive = new Date();

    return true;
  }

  async endTurn(worldId: string, playerId: string): Promise<boolean> {
    const player = await this.worldService.getPlayerInWorld(worldId, playerId);
    if (!player) return false;

    // Reset player's turn state
    player.currentRoll = 0;
    player.stepsTaken = 0;
    player.pathTaken = [{ x: player.position.x, y: player.position.y }];
    player.lastActive = new Date();

    await this.playerService.updatePlayerRoll(playerId, 0, player.die1Value, player.die2Value);

    return true;
  }

  async processEvent(worldId: string, playerId: string, position: WorldCoord): Promise<IEventResult> {
    const player = await this.worldService.getPlayerInWorld(worldId, playerId);
    if (!player) {
      return { message: 'Игрок или мир не найден', applied: false };
    }

    return this.eventService.processEvent(player, position);
  }

  async getPlayerState(worldId: string, playerId: string): Promise<IPlayer | null> {
    return this.worldService.getPlayerInWorld(worldId, playerId);
  }
}
