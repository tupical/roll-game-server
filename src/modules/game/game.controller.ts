// Game controller implementation
import { Controller, Get, Post, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { GameService } from './game.service';
import { Direction } from '@common/interfaces/game.interface';
import { IDiceRollResult } from '@modules/dice/interfaces/dice.interface';
import { IMoveResult } from './interfaces/game.interface';
import { WorldService } from '@modules/world/world.service';

// DTOs
class RollDiceDto {
  worldId: string;
  playerId: string;
}

class MovePlayerDto {
  worldId: string;
  playerId: string;
  direction: Direction;
}

class CreatePlayerDto {
  worldId: string;
  playerId: string;
  username: string;
}

@Controller('game')
export class GameController {
  constructor(
    private readonly gameService: GameService,
    private readonly worldService: WorldService,
  ) {}

  @Post('roll')
  async rollDice(@Body() rollDiceDto: RollDiceDto): Promise<IDiceRollResult> {
    try {
      return await this.gameService.rollDice(rollDiceDto.worldId, rollDiceDto.playerId);
    } catch (error) {
      throw new HttpException(error.message || 'Failed to roll dice', HttpStatus.BAD_REQUEST);
    }
  }

  @Post('move')
  async movePlayer(@Body() movePlayerDto: MovePlayerDto): Promise<IMoveResult> {
    const result = await this.gameService.movePlayer(
      movePlayerDto.worldId,
      movePlayerDto.playerId,
      movePlayerDto.direction
    );

    if (!result.success) {
      throw new HttpException(result.message || 'Failed to move player', HttpStatus.BAD_REQUEST);
    }

    return result;
  }

  @Post('player')
  async createPlayer(@Body() { worldId, playerId, username }: { worldId: string, playerId: string, username: string }) {
    const player = await this.worldService.addPlayerToWorld(
      worldId,
      playerId,
      username
    );

    if (!player) {
      throw new HttpException('Failed to create player', HttpStatus.BAD_REQUEST);
    }

    return player;
  }

  @Get('player/:worldId/:playerId')
  async getPlayer(@Param('worldId') worldId: string, @Param('playerId') playerId: string) {
    const player = await this.worldService.getPlayerInWorld(worldId, playerId);

    if (!player) {
      throw new HttpException('Player not found', HttpStatus.NOT_FOUND);
    }

    return player;
  }

  @Get('map/:worldId/:playerId')
  async getVisibleMap(@Param('worldId') worldId: string, @Param('playerId') playerId: string) {
    const map = await this.worldService.getVisibleMapForPlayer(worldId, playerId);

    if (!map) {
      throw new HttpException('Map not found', HttpStatus.NOT_FOUND);
    }

    return map;
  }

  @Post('end-turn')
  async endTurn(@Body() { worldId, playerId }: { worldId: string, playerId: string }) {
    const success = await this.gameService.endTurn(worldId, playerId);

    if (!success) {
      throw new HttpException('Failed to end turn', HttpStatus.BAD_REQUEST);
    }

    return { success: true };
  }
}
