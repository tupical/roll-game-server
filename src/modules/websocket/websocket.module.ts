// Module definitions for websocket module
import { Module } from '@nestjs/common';
import { GameGateway } from './websocket.gateway';
import { GameModule } from '@modules/game/game.module';
import { WorldModule } from '@modules/world/world.module';

@Module({
  imports: [GameModule, WorldModule],
  providers: [GameGateway],
  exports: [GameGateway],
})
export class WebsocketModule {}
