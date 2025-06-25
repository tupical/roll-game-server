// Event service implementation
import { Injectable, Inject } from '@nestjs/common';
import { IEventStrategy, IEventResult } from './interfaces/event.interface';
import { CellEventType, WorldCoord } from '@common/interfaces/game.interface';
import { IPlayer } from '@modules/player/interfaces/player.interface';
import { ICellService } from '@modules/cell/interfaces/cell.interface';
import { BonusEventStrategy, DebuffEventStrategy, EnemyEventStrategy, EmptyEventStrategy } from './strategies/event-strategies';

@Injectable()
export class EventService {
  private eventStrategies: Map<CellEventType, IEventStrategy> = new Map();
  private processedCells: Map<string, Set<string>> = new Map(); // worldId -> Set<playerId:cellKey>
  
  constructor(
    @Inject('ICellService') private readonly cellService: ICellService,
    private readonly bonusStrategy: BonusEventStrategy,
    private readonly debuffStrategy: DebuffEventStrategy,
    private readonly enemyStrategy: EnemyEventStrategy,
    private readonly emptyStrategy: EmptyEventStrategy,
  ) {
    // Register default strategies
    this.registerEventStrategy(CellEventType.BONUS_STEPS, this.bonusStrategy);
    this.registerEventStrategy(CellEventType.DEBUFF_STEPS, this.debuffStrategy);
    this.registerEventStrategy(CellEventType.ENEMY, this.enemyStrategy);
    this.registerEventStrategy(CellEventType.EMPTY, this.emptyStrategy);
  }

  registerEventStrategy(eventType: CellEventType, strategy: IEventStrategy): void {
    this.eventStrategies.set(eventType, strategy);
  }

  async processEvent(player: IPlayer, position: WorldCoord): Promise<IEventResult> {
    const cell = await this.cellService.getCell(position.x, position.y);

    console.log(cell);
    
    // Check if cell has already been processed for this player
    const worldId = 'default'; // This would come from a context in a real implementation
    const cellKey = `${position.x},${position.y}`;
    const processedKey = `${player.id}:${cellKey}`;
    
    if (!this.processedCells.has(worldId)) {
      this.processedCells.set(worldId, new Set<string>());
    }
    
    const processedCellsForWorld = this.processedCells.get(worldId)!;
    const alreadyProcessed = processedCellsForWorld.has(processedKey);
    
    // If cell is empty or already processed, return empty result
    if (cell.eventType === CellEventType.EMPTY || alreadyProcessed) {
      return { message: 'Нет события', applied: false };
    }
    
    // Get the appropriate strategy for this event type
    const strategy = this.eventStrategies.get(cell.eventType);
    if (!strategy) {
      return { message: 'Неизвестный тип события', applied: false };
    }
    
    // Process the event
    const result = await strategy.handleEvent(player, cell.eventType, cell.eventValue);
    
    // Mark cell as processed for this player
    if (result.applied) {
      processedCellsForWorld.add(processedKey);
    }
    
    return result;
  }
  
  // Reset processed cells for a player (called when starting a new turn)
  resetProcessedCellsForPlayer(worldId: string, playerId: string): void {
    const processedCellsForWorld = this.processedCells.get(worldId);
    if (processedCellsForWorld) {
      const playerPrefix = `${playerId}:`;
      for (const key of [...processedCellsForWorld]) {
        if (key.startsWith(playerPrefix)) {
          processedCellsForWorld.delete(key);
        }
      }
    }
  }

  public isCellProcessedForPlayer(worldId: string, playerId: string, x: number, y: number): boolean {
    const processedCellsForWorld = this.processedCells.get(worldId || 'default');
    if (!processedCellsForWorld) return false;
    const processedKey = `${playerId}:${x},${y}`;
    return processedCellsForWorld.has(processedKey);
  }
}
