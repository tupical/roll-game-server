// Module definitions for cell module
import { Module } from '@nestjs/common';
import { CellService } from './cell.service';

@Module({
  providers: [CellService],
  exports: [CellService],
})
export class CellModule {}
