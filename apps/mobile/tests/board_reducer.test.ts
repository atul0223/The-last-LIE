import { describe, it, expect } from 'vitest';
import type { BoardState, BoardCard } from '@lastlie/case-engine';
import { boardReducer, initialBoardState, isSameLink } from '../src/features/case/board/reducer';

describe('boardReducer pure table tests (WP-12)', () => {
  const cardA: BoardCard = { id: 'clue_a', x: 10, y: 20 };
  const cardB: BoardCard = { id: 'clue_b', x: 100, y: 150 };
  const cardC: BoardCard = { id: 'clue_c', x: 200, y: 300 };

  it('addCard: adds a card and does not duplicate', () => {
    const s1 = boardReducer(initialBoardState, { type: 'ADD_CARD', card: cardA });
    expect(s1.cards).toHaveLength(1);
    expect(s1.cards[0]).toEqual(cardA);

    // Duplicate add should be ignored
    const s2 = boardReducer(s1, { type: 'ADD_CARD', card: { id: 'clue_a', x: 99, y: 99 } });
    expect(s2.cards).toHaveLength(1);
    expect(s2.cards[0]).toEqual(cardA);
  });

  it('moveCard: updates card position', () => {
    const s1 = boardReducer(initialBoardState, { type: 'ADD_CARD', card: cardA });
    const s2 = boardReducer(s1, { type: 'MOVE_CARD', id: 'clue_a', x: 55, y: 75 });
    expect(s2.cards[0]).toEqual({ id: 'clue_a', x: 55, y: 75 });

    // Moving non-existent card leaves state unchanged
    const s3 = boardReducer(s2, { type: 'MOVE_CARD', id: 'clue_unknown', x: 0, y: 0 });
    expect(s3).toEqual(s2);
  });

  it('removeCard: removes card AND all links involving that card', () => {
    let state: BoardState = {
      cards: [cardA, cardB, cardC],
      links: [
        { a: 'clue_a', b: 'clue_b' },
        { a: 'clue_b', b: 'clue_c' },
      ],
    };

    // Remove card B -> should remove card B and both links
    state = boardReducer(state, { type: 'REMOVE_CARD', id: 'clue_b' });
    expect(state.cards).toHaveLength(2);
    expect(state.cards.map((c) => c.id)).toEqual(['clue_a', 'clue_c']);
    expect(state.links).toHaveLength(0);
  });

  describe('addLink rules', () => {
    it('rule: rejects self-links (a === b)', () => {
      const state: BoardState = { cards: [cardA], links: [] };
      const next = boardReducer(state, { type: 'ADD_LINK', a: 'clue_a', b: 'clue_a' });
      expect(next.links).toHaveLength(0);
    });

    it('rule: adds link in canonical manner', () => {
      const state: BoardState = { cards: [cardA, cardB], links: [] };
      const next = boardReducer(state, { type: 'ADD_LINK', a: 'clue_a', b: 'clue_b' });
      expect(next.links).toHaveLength(1);
      expect(next.links[0]).toEqual({ a: 'clue_a', b: 'clue_b' });
    });

    it('rule: rejects duplicate links (a-b == b-a)', () => {
      const state: BoardState = {
        cards: [cardA, cardB],
        links: [{ a: 'clue_a', b: 'clue_b' }],
      };

      // Adding same direction
      const next1 = boardReducer(state, { type: 'ADD_LINK', a: 'clue_a', b: 'clue_b' });
      expect(next1.links).toHaveLength(1);

      // Adding opposite direction
      const next2 = boardReducer(state, { type: 'ADD_LINK', a: 'clue_b', b: 'clue_a' });
      expect(next2.links).toHaveLength(1);
    });
  });

  describe('removeLink rules', () => {
    it('removes link regardless of direction', () => {
      const state: BoardState = {
        cards: [cardA, cardB, cardC],
        links: [
          { a: 'clue_a', b: 'clue_b' },
          { a: 'clue_b', b: 'clue_c' },
        ],
      };

      // Remove b-a (opposite to stored a-b)
      const next = boardReducer(state, { type: 'REMOVE_LINK', a: 'clue_b', b: 'clue_a' });
      expect(next.links).toHaveLength(1);
      expect(next.links[0]).toEqual({ a: 'clue_b', b: 'clue_c' });
    });
  });

  it('isSameLink helper correctly identifies undirected equality', () => {
    const link = { a: 'clue_x', b: 'clue_y' };
    expect(isSameLink(link, 'clue_x', 'clue_y')).toBe(true);
    expect(isSameLink(link, 'clue_y', 'clue_x')).toBe(true);
    expect(isSameLink(link, 'clue_x', 'clue_z')).toBe(false);
  });

  it('setBoard: replaces entire board state', () => {
    const customBoard: BoardState = {
      cards: [cardC],
      links: [{ a: 'clue_c', b: 'clue_d' }],
    };
    const next = boardReducer(initialBoardState, { type: 'SET_BOARD', board: customBoard });
    expect(next).toEqual(customBoard);
  });
});
