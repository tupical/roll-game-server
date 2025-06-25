// Main application module
import { Module } from '@nestjs/common';
import { CellModule } from '@modules/cell/cell.module';
import { DiceModule } from '@modules/dice/dice.module';
import { PlayerModule } from '@modules/player/player.module';
import { EventModule } from '@modules/event/event.module';
import { WorldModule } from '@modules/world/world.module';
import { GameModule } from '@modules/game/game.module';
import { WebsocketModule } from '@modules/websocket/websocket.module';

@Module({
  imports: [
    CellModule,
    DiceModule,
    PlayerModule,
    EventModule,
    WorldModule,
    GameModule,
    WebsocketModule,
  ],
})
export class AppModule {}
