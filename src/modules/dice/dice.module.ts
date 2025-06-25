// Module definitions for dice module
import { Module } from '@nestjs/common';
import { DiceService } from './dice.service';

@Module({
  providers: [DiceService],
  exports: [DiceService],
})
export class DiceModule {}
