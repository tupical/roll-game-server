// Dice module interfaces
export interface IDiceRollResult {
  total: number;
  die1: number;
  die2: number;
  stepsLeft: number;
  bonusApplied?: number;
  turnsToSkip?: number;
}

export interface IDiceService {
  rollDice(bonusSteps?: number): Promise<IDiceRollResult>;
}
