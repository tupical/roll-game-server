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

  async movePlayer(worldId: string, playerId: string, direction: Direction): Promise<IMoveResult> {
    // Get player
    const player = await this.worldService.getPlayerInWorld(worldId, playerId);
    if (!player) {
      return { success: false, message: 'Игрок или мир не найден' };
    }

    // Check if player can move
    if (player.currentRoll <= 0 || player.stepsTaken >= player.currentRoll || player.turnsToSkip > 0) {
      return { success: false, message: 'Невозможно сделать ход' };
    }

    // Calculate new position
    let newX = player.position.x;
    let newY = player.position.y;
    
    switch (direction) {
      case Direction.UP:
        newY--;
        break;
      case Direction.DOWN:
        newY++;
        break;
      case Direction.LEFT:
        newX--;
        break;
      case Direction.RIGHT:
        newX++;
        break;
    }

    // Check if cell was already visited in this turn
    if (player.pathTaken.some(pos => pos.x === newX && pos.y === newY)) {
      return { success: false, message: 'Нельзя вставать на уже пройденную ячейку в этом ходу' };
    }

    // Update player position
    const oldPosition = { ...player.position };
    player.position = { x: newX, y: newY };
    player.stepsTaken++;
    player.pathTaken.push(player.position);
    player.lastActive = new Date();

    // Update player in service
    await this.playerService.updatePlayerPosition(playerId, player.position);

    // Обновить область видимости после перемещения
    await this.worldService.updatePlayerVisibility(playerId);

    // Если игрок встал на ячейку с событием, ничего не делаем до применения события
    const cellKey = `${player.position.x},${player.position.y}`;
    const cell = await this.worldService.getCellInWorld(worldId, player.position.x, player.position.y);
    if (cell && cell.eventType !== undefined && cell.eventType !== null && cell.eventType !== 'EMPTY') {
      player.discoveredCells = player.discoveredCells || new Map<string, import("@common/interfaces/game.interface").CellEventType>();
      player.discoveredCells.set(cellKey, cell.eventType);
    }

    // Process event on cell
    let eventResult = { message: 'Нет события', applied: false };

    // Check if turn ended
    const turnEnded = player.stepsTaken >= player.currentRoll;
    if (turnEnded) {
      eventResult = await this.eventService.processEvent(player, player.position);
      player.currentRoll = 0;
      await this.playerService.updatePlayerRoll(playerId, 0, player.die1Value, player.die2Value);
      // После применения события сохраняем тип события
      if (cell && cell.eventType !== undefined && cell.eventType !== null && cell.eventType !== 'EMPTY') {
        player.discoveredCells = player.discoveredCells || new Map<string, import("@common/interfaces/game.interface").CellEventType>();
        player.discoveredCells.set(cellKey, cell.eventType);
      }
    }

    return {
      success: true,
      newPosition: player.position,
      eventTriggered: eventResult.applied,
      eventMessage: eventResult.message,
      message: turnEnded ? 'Ход завершен' : undefined,
      stepsLeft: player.currentRoll - player.stepsTaken
    };
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
    player.pathTaken = [player.position];
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
    player.pathTaken = [player.position];
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
