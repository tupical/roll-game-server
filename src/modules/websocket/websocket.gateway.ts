// WebSocket gateway implementation
import { 
  WebSocketGateway, 
  WebSocketServer, 
  SubscribeMessage, 
  OnGatewayConnection, 
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';
import { 
  IWebSocketGateway, 
  IPlayerJoinData, 
  IPlayerMoveData, 
  IPlayerRollData, 
  IPlayerUpdateData,
  IEventTriggeredData
} from './interfaces/websocket.interface';
import { GameService } from '@modules/game/game.service';
import { WorldService } from '@modules/world/world.service';
import { VisibleMap } from '@modules/world/interfaces/world.interface';
import { IDiceRollResult } from '@modules/dice/interfaces/dice.interface';
import { Direction } from '@common/interfaces/game.interface';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
@Injectable()
export class GameGateway implements IWebSocketGateway, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private clientToPlayer: Map<string, { worldId: string, playerId: string }> = new Map();

  constructor(
    private readonly gameService: GameService,
    private readonly worldService: WorldService,
  ) {}

  handleConnection(client: Socket): void {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    console.log(`Client disconnected: ${client.id}`);
    this.clientToPlayer.delete(client.id);
  }

  @SubscribeMessage('player:join')
  async handlePlayerJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: IPlayerJoinData
  ): Promise<void> {
    try {
      const { worldId, playerId, username } = data;
      
      // Add player to world
      const player = await this.worldService.addPlayerToWorld(worldId, playerId, username);
      
      if (!player) {
        this.emitError(client.id, 'Мир не найден');
        return;
      }
      
      // Associate client with player
      this.clientToPlayer.set(client.id, { worldId, playerId });
      
      // Join socket rooms
      client.join(`world:${worldId}`);
      client.join(`player:${playerId}`);
      
      // Send initial data to player
      const visibleMap = await this.worldService.getVisibleMapForPlayer(worldId, playerId);
      
      this.emitPlayerUpdate(client.id, {
        id: player.id,
        playerId: player.id,
        username: player.username,
        position: player.position,
        currentRoll: player.currentRoll,
        stepsTaken: player.stepsTaken,
        stepsLeft: player.currentRoll - player.stepsTaken,
        bonusSteps: player.bonusSteps,
        turnsToSkip: player.turnsToSkip
      });
      
      if (visibleMap) {
        this.emitMapUpdate(client.id, visibleMap);
      }
      
      // Notify other players
      client.to(`world:${worldId}`).emit('world:update', {
        type: 'player:joined',
        player: {
          id: player.id,
          username: player.username,
          position: player.position
        }
      });
      
    } catch (error) {
      console.error('Error in player:join:', error);
      this.emitError(client.id, 'Ошибка при присоединении к игре');
    }
  }

  @SubscribeMessage('player:roll')
  async handlePlayerRoll(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: IPlayerRollData
  ): Promise<void> {
    try {
      const { worldId, playerId } = data;
      
      // Roll dice
      const rollResult = await this.gameService.rollDice(worldId, playerId);
      
      // Get updated player
      const player = await this.gameService.getPlayerState(worldId, playerId);
      
      if (!player) {
        this.emitError(client.id, 'Игрок не найден');
        return;
      }
      
      // Send roll result to player
      this.emitDiceRolled(client.id, {
        die1: rollResult.die1,
        die2: rollResult.die2,
        total: rollResult.total,
        stepsLeft: rollResult.stepsLeft,
        bonusApplied: rollResult.bonusApplied,
        turnsToSkip: player.turnsToSkip
      });
      
      // Send updated player state
      this.emitPlayerUpdate(client.id, {
        id: player.id,
        playerId: player.id,
        currentRoll: player.currentRoll,
        stepsTaken: player.stepsTaken,
        stepsLeft: player.currentRoll - player.stepsTaken,
        pathTaken: [player.position]
      });
      
      // Notify other players
      client.to(`world:${worldId}`).emit('world:update', {
        type: 'player:rolled',
        playerId,
        roll: rollResult.total
      });
      
    } catch (error) {
      console.error('Error in player:roll:', error);
      this.emitError(client.id, 'Ошибка при броске кубиков');
    }
  }

  @SubscribeMessage('player:move')
  async handlePlayerMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: IPlayerMoveData
  ): Promise<void> {
    try {
      const { worldId, playerId, direction } = data;
      
      // Convert string direction to enum
      let directionEnum: Direction;
      switch (direction) {
        case 'up':
          directionEnum = Direction.UP;
          break;
        case 'down':
          directionEnum = Direction.DOWN;
          break;
        case 'left':
          directionEnum = Direction.LEFT;
          break;
        case 'right':
          directionEnum = Direction.RIGHT;
          break;
        default:
          this.emitError(client.id, 'Неверное направление движения');
          return;
      }
      
      // Move player
      const moveResult = await this.gameService.movePlayer(worldId, playerId, directionEnum);
      
      if (!moveResult.success) {
        this.emitError(client.id, moveResult.message || 'Ошибка при перемещении');
        return;
      }
      
      // Get updated player
      const player = await this.gameService.getPlayerState(worldId, playerId);
      
      if (!player) {
        this.emitError(client.id, 'Игрок не найден');
        return;
      }
      
      // Send updated player state
      this.emitPlayerUpdate(client.id, {
        id: player.id,
        playerId: player.id,
        position: player.position,
        currentRoll: player.currentRoll,
        stepsTaken: player.stepsTaken,
        stepsLeft: moveResult.stepsLeft || (player.currentRoll - player.stepsTaken),
        pathTaken: player.pathTaken
      });
      
      // Send updated map
      const visibleMap = await this.worldService.getVisibleMapForPlayer(worldId, playerId);
      if (visibleMap) {
        this.emitMapUpdate(client.id, visibleMap);
      }
      
      // Send event if triggered
      if (moveResult.eventTriggered && moveResult.eventMessage) {
        this.emitEventTriggered(client.id, {
          message: moveResult.eventMessage,
          position: player.position,
          battleState: moveResult.battleState // Новое поле для передачи состояния боя
        });
      }
      
      // Notify other players
      client.to(`world:${worldId}`).emit('world:update', {
        type: 'player:moved',
        playerId,
        position: player.position
      });
      
    } catch (error) {
      console.error('Error in player:move:', error);
      this.emitError(client.id, 'Ошибка при перемещении');
    }
  }

  @SubscribeMessage('player:end-turn')
  async handlePlayerEndTurn(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { worldId: string, playerId: string }
  ): Promise<void> {
    try {
      const { worldId, playerId } = data;
      
      // End turn
      const success = await this.gameService.endTurn(worldId, playerId);
      
      if (!success) {
        this.emitError(client.id, 'Игрок или мир не найден');
        return;
      }
      
      // Get updated player
      const player = await this.gameService.getPlayerState(worldId, playerId);
      
      if (!player) {
        this.emitError(client.id, 'Игрок не найден');
        return;
      }
      
      // Send updated player state
      this.emitPlayerUpdate(client.id, {
        id: player.id,
        playerId: player.id,
        currentRoll: 0,
        stepsTaken: 0,
        stepsLeft: 0,
        pathTaken: [player.position]
      });
      
      // Notify other players
      client.to(`world:${worldId}`).emit('world:update', {
        type: 'player:ended-turn',
        playerId
      });
      
    } catch (error) {
      console.error('Error in player:end-turn:', error);
      this.emitError(client.id, 'Ошибка при завершении хода');
    }
  }

  // Emitters
  emitPlayerUpdate(clientId: string, data: IPlayerUpdateData & { playerId?: string }): void {
    // Добавляем playerId, если его нет
    if (!data.id && data.playerId) {
      data.id = data.playerId;
    }
    this.server.to(clientId).emit('player:update', data);
  }

  emitMapUpdate(clientId: string, map: VisibleMap): void {
    this.server.to(clientId).emit('map:update', map);
  }

  emitDiceRolled(clientId: string, result: IDiceRollResult): void {
    this.server.to(clientId).emit('dice:rolled', result);
  }

  emitEventTriggered(clientId: string, data: IEventTriggeredData): void {
    this.server.to(clientId).emit('event:triggered', data);
  }

  emitError(clientId: string, message: string): void {
    this.server.to(clientId).emit('error', { message });
  }
}
