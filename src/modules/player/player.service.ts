// Player service implementation
import { Injectable } from '@nestjs/common';
import { IPlayerService, IPlayer } from './interfaces/player.interface';
import { WorldCoord } from '@common/interfaces/game.interface';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PlayerService implements IPlayerService {
  private players: Map<string, IPlayer> = new Map();

  async getPlayer(id: string): Promise<IPlayer | null> {
    return this.players.get(id) || null;
  }

  async createPlayer(id: string, username: string, position: WorldCoord = { x: 0, y: 0 }): Promise<IPlayer> {
    const player: IPlayer = {
      id,
      username,
      position,
      visibleCells: new Set<string>(),
      exploredCells: new Set<string>(),
      currentRoll: 0,
      die1Value: 0,
      die2Value: 0,
      stepsTaken: 0,
      pathTaken: [position],
      bonusSteps: 0,
      turnsToSkip: 0,
      lastActive: new Date(),
      discoveredCells: new Set<string>(),
    };

    this.players.set(id, player);
    return player;
  }

  async updatePlayerPosition(id: string, position: WorldCoord): Promise<IPlayer | null> {
    const player = await this.getPlayer(id);
    if (!player) return null;

    player.position = position;
    player.lastActive = new Date();
    return player;
  }

  async updatePlayerVisibility(id: string, visibleCells: Set<string>): Promise<IPlayer | null> {
    const player = await this.getPlayer(id);
    if (!player) return null;

    player.visibleCells = visibleCells;
    return player;
  }

  async updatePlayerRoll(id: string, roll: number, die1: number, die2: number): Promise<IPlayer | null> {
    const player = await this.getPlayer(id);
    if (!player) return null;

    player.currentRoll = roll;
    player.die1Value = die1;
    player.die2Value = die2;
    player.stepsTaken = 0;
    player.pathTaken = [player.position];
    player.lastActive = new Date();
    return player;
  }

  async addBonusSteps(id: string, steps: number): Promise<IPlayer | null> {
    const player = await this.getPlayer(id);
    if (!player) return null;

    player.bonusSteps += steps;
    return player;
  }

  async addTurnsToSkip(id: string, turns: number): Promise<IPlayer | null> {
    const player = await this.getPlayer(id);
    if (!player) return null;

    player.turnsToSkip += turns;
    return player;
  }

  async updatePlayerExploration(id: string, exploredCells: Set<string>): Promise<IPlayer | null> {
    const player = await this.getPlayer(id);
    if (!player) return null;

    // Добавляем новые исследованные ячейки к уже существующим
    exploredCells.forEach(cellKey => {
      player.exploredCells.add(cellKey);
    });
    
    return player;
  }
}
