// World controller implementation
import { Controller, Get, Post, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { WorldService } from './world.service';

// DTOs
class CreateWorldDto {
  name: string;
}

@Controller('world')
export class WorldController {
  constructor(
    private readonly worldService: WorldService,
  ) {}

  @Get()
  async getAllWorlds() {
    return this.worldService.getAllWorlds();
  }

  @Get(':id')
  async getWorld(@Param('id') id: string) {
    const world = await this.worldService.getWorld(id);
    
    if (!world) {
      throw new HttpException("World not found", HttpStatus.NOT_FOUND);
    }
    
    return world;
  }

  @Post()
  async createWorld(@Body() createWorldDto: CreateWorldDto) {
    return this.worldService.createWorld(createWorldDto.name);
  }

  @Get(':id/players')
  async getPlayersInWorld(@Param('id') id: string) {
    const players = await this.worldService.getAllPlayersInWorld(id);
    return players;
  }
}
