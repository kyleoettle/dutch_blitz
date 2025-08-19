import { Card, Player } from "../schema/MyState";
import { MAX_VISIBLE_SLOTS } from "../constants";

export class DeckRefillService {
  constructor(private readonly state: any) {}

  generatePlayerDeck(playerId: string, rng: () => number = Math.random): Card[] {
    const deck: Card[] = [];
    const colors = ["red", "green", "blue", "yellow"];
    colors.forEach(color => {
      for (let value = 1; value <= 10; value++) {
        const card = new Card();
        card.id = `${playerId}_${color}_${value}`;
        card.value = value;
        card.color = color;
        card.owner = playerId;
        card.faceUp = false;
        deck.push(card);
      }
    });
    return this.shuffleDeck(deck, rng);
  }

  shuffleDeck(deck: Card[], rng: () => number = Math.random): Card[] {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  fillDutchPile(player: Player): void {
    while (player.postPile.length < MAX_VISIBLE_SLOTS && player.reserveCards.length > 0) {
      const cardId = player.reserveCards.shift()!;
      const card = this.state.cards.get(cardId);
      if (card) {
        card.faceUp = true;
        player.postPile.push(cardId);
      }
    }
    if (player.postPile.length < MAX_VISIBLE_SLOTS && player.reserveCards.length === 0) {
      this.cycleDutchPile(player);
    }
  }

  cycleDutchPile(player: Player): void {
    if (player.postPile.length <= 1) return;
    const cardsToRecycle = player.postPile.splice(0, player.postPile.length - 1);
    cardsToRecycle.reverse();
    cardsToRecycle.forEach(cardId => {
      const card = this.state.cards.get(cardId);
      if (card) {
        card.faceUp = false;
        player.reserveCards.push(cardId);
      }
    });
    this.fillDutchPile(player);
  }

  drawFromWood(player: Player): void {
    for (let i = 0; i < MAX_VISIBLE_SLOTS; i++) {
      if (player.postPile[i] === "" && player.reserveCards.length > 0) {
        const cardId = player.reserveCards.shift()!;
        const card = this.state.cards.get(cardId);
        if (card) { card.faceUp = true; player.postPile[i] = cardId; }
      }
    }
  }
}
