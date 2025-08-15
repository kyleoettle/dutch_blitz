import { Pile } from "../schema/MyState";

export class ScoringService {
  constructor(private readonly state: any) {}

  completePile(pile: Pile): void {
    console.log(`Pile ${pile.id} completed with value 10! Removing from play.`);
    pile.cardStack.forEach(cardId => { this.state.cards.delete(cardId); });
    pile.cardStack = [];
    pile.topCard = -1;
    pile.color = "";
  }

  calculateFinalScores(): void {
    this.state.players.forEach((player: any, playerId: string) => {
      const blitzPenalty = player.blitzPile.length * 2;
      const finalScore = player.score - blitzPenalty;
      player.score = finalScore;
      console.log(`Player ${playerId} final score: ${finalScore}`);
    });
  }
}
