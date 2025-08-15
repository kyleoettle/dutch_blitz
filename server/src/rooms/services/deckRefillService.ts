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
    while (player.dutchPile.length < MAX_VISIBLE_SLOTS && player.postPile.length > 0) {
      const cardId = player.postPile.shift()!;
      const card = this.state.cards.get(cardId);
      if (card) {
        card.faceUp = true;
        player.dutchPile.push(cardId);
      }
    }
    if (player.dutchPile.length < MAX_VISIBLE_SLOTS && player.postPile.length === 0) {
      this.cycleDutchPile(player);
    }
  }

  cycleDutchPile(player: Player): void {
    if (player.dutchPile.length <= 1) return;
    const cardsToRecycle = player.dutchPile.splice(0, player.dutchPile.length - 1);
    cardsToRecycle.reverse();
    cardsToRecycle.forEach(cardId => {
      const card = this.state.cards.get(cardId);
      if (card) {
        card.faceUp = false;
        player.postPile.push(cardId);
      }
    });
    this.fillDutchPile(player);
  }

  drawFromWood(player: Player): void {
    for (let i = 0; i < MAX_VISIBLE_SLOTS; i++) {
      if (player.dutchPile[i] === "" && player.postPile.length > 0) {
        const cardId = player.postPile.shift()!;
        const card = this.state.cards.get(cardId);
        if (card) { card.faceUp = true; player.dutchPile[i] = cardId; }
      }
    }
  }
}
