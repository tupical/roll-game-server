// Update module definitions for game module to include controller
import { Module } from '@nestjs/common';
import { GameService } from './game.service';
import { GameController } from './game.controller';
import { WorldModule } from '@modules/world/world.module';
import { PlayerModule } from '@modules/player/player.module';
import { DiceModule } from '@modules/dice/dice.module';
import { EventModule } from '@modules/event/event.module';

@Module({
  imports: [WorldModule, PlayerModule, DiceModule, EventModule],
  controllers: [GameController],
  providers: [GameService],
  exports: [GameService],
})
export class GameModule {}
