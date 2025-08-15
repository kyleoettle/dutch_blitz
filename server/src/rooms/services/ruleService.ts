import { Card, Pile, Player } from "../schema/MyState";

export class RuleService {
  constructor(private readonly state: any) {}

  isValidSequenceMove(card: Card, targetPile: Pile): boolean {
    if (targetPile.cardStack.length === 0) {
      return card.value === 1;
    }
    const topCardId = targetPile.cardStack[targetPile.cardStack.length - 1];
    const topCard = this.state.cards.get(topCardId);
    if (!topCard) return false;
    if (targetPile.color && card.color !== targetPile.color) return false;
    return card.value === topCard.value + 1;
  }

  checkWinCondition(player: Player): boolean {
    return player.blitzPile.length === 0;
  }
}
