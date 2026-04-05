import { buildDeck, drawCard, shuffleDeck } from '../deck';

describe('deck', () => {
  it('builds a 94-card deck with unique ids and correct counts', () => {
    const deck = buildDeck(42);
    expect(deck).toHaveLength(94);
    expect(new Set(deck.map((card) => card.id)).size).toBe(94);

    const numberSevens = deck.filter((card) => card.type === 'NUMBER' && card.value === 7);
    const freezes = deck.filter((card) => card.type === 'ACTION_FREEZE');
    const x2Cards = deck.filter((card) => card.type === 'MODIFIER_MULT' && card.value === 2);

    expect(numberSevens).toHaveLength(7);
    expect(freezes).toHaveLength(3);
    expect(x2Cards).toHaveLength(2);
  });

  it('shuffles deterministically for the same seed', () => {
    const first = buildDeck(100);
    const second = buildDeck(100);
    const third = buildDeck(101);

    expect(first.map((card) => card.id)).toEqual(second.map((card) => card.id));
    expect(first.map((card) => card.id)).not.toEqual(third.map((card) => card.id));
  });

  it('draws immutably from the front of the deck', () => {
    const original = shuffleDeck(
      [
        { id: 'NUMBER_1_1', type: 'NUMBER', value: 1 },
        { id: 'NUMBER_2_1', type: 'NUMBER', value: 2 },
      ],
      1
    );
    const snapshot = [...original];
    const { card, remainingDeck } = drawCard(original);

    expect(original).toEqual(snapshot);
    expect(card).toEqual(original[0]);
    expect(remainingDeck).toEqual(original.slice(1));
  });

  it('throws when drawing from an empty deck', () => {
    expect(() => drawCard([])).toThrow('Cannot draw from an empty deck.');
  });
});
