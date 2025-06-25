// Update module definitions for world module to include controller
import { Module } from '@nestjs/common';
import { WorldService } from './world.service';
import { WorldController } from './world.controller';
import { PlayerModule } from '@modules/player/player.module';
import { CellModule } from '@modules/cell/cell.module';
import { EventModule } from '@modules/event/event.module';

@Module({
  imports: [PlayerModule, CellModule, EventModule],
  controllers: [WorldController],
  providers: [WorldService],
  exports: [WorldService],
})
export class WorldModule {}
