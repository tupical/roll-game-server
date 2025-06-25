// Module definitions for event module
import { Module } from '@nestjs/common';
import { EventService } from './event.service';
import { BonusEventStrategy, DebuffEventStrategy, EnemyEventStrategy, EmptyEventStrategy } from './strategies/event-strategies';
import { CellModule } from '@modules/cell/cell.module';
import { CellService } from '@modules/cell/cell.service';

@Module({
  imports: [CellModule],
  providers: [
    {
      provide: 'ICellService',
      useClass: CellService,
    },
    EventService,
    BonusEventStrategy,
    DebuffEventStrategy,
    EnemyEventStrategy,
    EmptyEventStrategy
  ],
  exports: [EventService],
})
export class EventModule {}
