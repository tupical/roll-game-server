// Dice service implementation
import { Injectable } from '@nestjs/common';
import { IDiceService, IDiceRollResult } from './interfaces/dice.interface';

@Injectable()
export class DiceService implements IDiceService {
  async rollDice(bonusSteps: number = 0): Promise<IDiceRollResult> {
    // Generate random values for dice
    const die1 = Math.floor(Math.random() * 6) + 1;
    const die2 = Math.floor(Math.random() * 6) + 1;
    const diceSum = die1 + die2;
    const total = diceSum + bonusSteps;
    
    // Ensure minimum of 1 step
    const finalTotal = total > 0 ? total : 1;
    
    return {
      total: finalTotal,
      die1,
      die2,
      stepsLeft: finalTotal,
      bonusApplied: bonusSteps
    };
  }
}
