// World service implementation
import { Injectable, OnModuleInit } from '@nestjs/common';
import { IWorldService, IWorld, VisibleMap } from './interfaces/world.interface';
import { IPlayer } from '@modules/player/interfaces/player.interface';
import { ICell } from '@modules/cell/interfaces/cell.interface';
import { WorldCoord, VISIBLE_RADIUS, CellEventType } from '@common/interfaces/game.interface';
import { PlayerService } from '@modules/player/player.service';
import { CellService } from '@modules/cell/cell.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class WorldService implements IWorldService, OnModuleInit {
  private staticWorld: IWorld;
  private worldPlayers: Map<string, string> = new Map(); // playerId -> playerId
  
  constructor(
    private readonly playerService: PlayerService,
    private readonly cellService: CellService,
  ) {}

  async onModuleInit() {
    // Загружаем статический мир из JSON файла при инициализации
    try {
      const filePath = path.join(process.cwd(), 'src/data/static-world.json');
      const fileContent = fs.readFileSync(filePath, 'utf8');
      this.staticWorld = JSON.parse(fileContent);
      console.log(`Статический мир загружен: ${this.staticWorld.id}`);
    } catch (error) {
      console.error('Ошибка при загрузке статического мира:', error);
      // Создаем дефолтный мир, если не удалось загрузить из файла
      this.staticWorld = {
        id: 'static-world-001',
        name: 'Игровой мир',
        createdAt: new Date(),
        lastUpdated: new Date()
      };
    }
  }

  async getWorld(id: string): Promise<IWorld | null> {
    // Всегда возвращаем статический мир, независимо от запрошенного id
    return this.staticWorld;
  }

  // Метод createWorld оставлен для обратной совместимости, но всегда возвращает статический мир
  async createWorld(name: string): Promise<IWorld> {
    return this.staticWorld;
  }

  async getAllWorlds(): Promise<IWorld[]> {
    // Всегда возвращаем массив с одним статическим миром
    return [this.staticWorld];
  }

  // Метод deleteWorld оставлен для обратной совместимости, но ничего не делает
  async deleteWorld(id: string): Promise<boolean> {
    return false; // Нельзя удалить статический мир
  }

  async addPlayerToWorld(worldId: string, playerId: string, username: string): Promise<IPlayer | null> {
    // Всегда используем статический мир, игнорируя переданный worldId
    const world = this.staticWorld;
    if (!world) return null;
    
    // Create player
    let player = await this.playerService.getPlayer(playerId);
    if (!player) player = await this.playerService.createPlayer(playerId, username);

    player.lastActive = new Date();
    
    // Add player to world
    this.worldPlayers.set(playerId, playerId);
    
    // Update player visibility
    await this.updatePlayerVisibility(playerId);
    
    return player;
  }

  async getPlayerInWorld(worldId: string, playerId: string): Promise<IPlayer | null> {
    // Игнорируем worldId, проверяем только наличие игрока
    if (!this.worldPlayers.has(playerId)) {
      this.worldPlayers.set(playerId, playerId);
    }
    
    return this.playerService.getPlayer(playerId);
  }

  async getAllPlayersInWorld(worldId: string): Promise<IPlayer[]> {
    // Игнорируем worldId, возвращаем всех игроков
    const players: IPlayer[] = [];
    for (const playerId of this.worldPlayers.keys()) {
      const player = await this.playerService.getPlayer(playerId);
      if (player) players.push(player);
    }
    
    return players;
  }

  async getCellInWorld(worldId: string, x: number, y: number): Promise<ICell | null> {
    // Игнорируем worldId, всегда возвращаем ячейку
    return this.cellService.getCell(x, y);
  }

  async getVisibleMapForPlayer(worldId: string, playerId: string): Promise<import("./interfaces/world.interface").VisibleMap | null> {
    // Игнорируем worldId, используем только playerId
    const player = await this.getPlayerInWorld(this.staticWorld.id, playerId);
    if (!player) return null;

    // Собираем все исследованные ячейки
    const explored = Array.from(player.exploredCells);
    const visible = new Set(player.visibleCells);
    const cells: import("./interfaces/world.interface").VisibleCell[] = [];

    for (const cellKey of explored) {
      const [x, y] = cellKey.split(",").map(Number);
      const cell = await this.cellService.getCell(x, y);
      const isDiscovered = player.discoveredCells && player.discoveredCells.has(cellKey);
      cells.push({
        ...cell,
        eventType: isDiscovered ? cell.eventType : CellEventType.UNKNOWN,
        eventValue: isDiscovered ? cell.eventValue : undefined,
        isVisible: visible.has(cellKey),
        isExplored: true,
        isDiscovered
      });
    }

    return {
      cells,
      centerX: player.position.x,
      centerY: player.position.y
    };
  }
  
  // Helper method to update player visibility and exploration (fog of war)
  public async updatePlayerVisibility(playerId: string): Promise<void> {
    const player = await this.playerService.getPlayer(playerId);
    if (!player) return;
    
    const { x, y } = player.position;
    const visibleCells = new Set<string>();
    const exploredCells = new Set<string>();
    
    // Update visibility for all cells in visibility radius
    for (let dy = -VISIBLE_RADIUS; dy <= VISIBLE_RADIUS; dy++) {
      for (let dx = -VISIBLE_RADIUS; dx <= VISIBLE_RADIUS; dx++) {
        // Check if cell is within visibility radius
        if (Math.abs(dx) + Math.abs(dy) <= VISIBLE_RADIUS * 1.5) {
          const cellX = x + dx;
          const cellY = y + dy;
          const cellKey = `${cellX},${cellY}`;
          
          // Add cell to visible cells (currently visible)
          visibleCells.add(cellKey);
          
          // Add cell to explored cells (fog of war - once seen, always remembered)
          exploredCells.add(cellKey);
          
          // Ensure cell exists
          await this.cellService.getCell(cellX, cellY);
        }
      }
    }
    
    // Update player's visible cells and explored cells
    await this.playerService.updatePlayerVisibility(playerId, visibleCells);
    await this.playerService.updatePlayerExploration(playerId, exploredCells);
  }
}
