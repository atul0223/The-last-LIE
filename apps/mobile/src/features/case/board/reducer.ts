import type { BoardState, BoardCard, BoardLink } from '@lastlie/case-engine';

export type BoardAction =
  | { type: 'ADD_CARD'; card: BoardCard }
  | { type: 'MOVE_CARD'; id: string; x: number; y: number }
  | { type: 'REMOVE_CARD'; id: string }
  | { type: 'ADD_LINK'; a: string; b: string; explanation?: string }
  | { type: 'REMOVE_LINK'; a: string; b: string }
  | { type: 'SET_BOARD'; board: BoardState };

export const initialBoardState: BoardState = {
  cards: [],
  links: [],
};

export function isSameLink(l: BoardLink, a: string, b: string): boolean {
  return (l.a === a && l.b === b) || (l.a === b && l.b === a);
}

export function boardReducer(state: BoardState, action: BoardAction): BoardState {
  switch (action.type) {
    case 'ADD_CARD': {
      if (state.cards.some((c) => c.id === action.card.id)) {
        return state;
      }
      return {
        ...state,
        cards: [...state.cards, action.card],
      };
    }

    case 'MOVE_CARD': {
      const cardExists = state.cards.some((c) => c.id === action.id);
      if (!cardExists) return state;

      return {
        ...state,
        cards: state.cards.map((c) =>
          c.id === action.id ? { ...c, x: action.x, y: action.y } : c,
        ),
      };
    }

    case 'REMOVE_CARD': {
      const cardExists = state.cards.some((c) => c.id === action.id);
      if (!cardExists) return state;

      return {
        ...state,
        cards: state.cards.filter((c) => c.id !== action.id),
        // Removing a card removes all its connected links
        links: state.links.filter((l) => l.a !== action.id && l.b !== action.id),
      };
    }

    case 'ADD_LINK': {
      const { a, b, explanation } = action;

      // Rule: No self-links
      if (a === b) {
        return state;
      }

      // Rule: No duplicate links (a-b == b-a)
      const linkExists = state.links.some((l) => isSameLink(l, a, b));
      if (linkExists) {
        return state;
      }

      const newLink: BoardLink = { a, b };
      if (explanation !== undefined) {
        newLink.explanation = explanation;
      }

      return {
        ...state,
        links: [...state.links, newLink],
      };
    }

    case 'REMOVE_LINK': {
      const { a, b } = action;
      const filteredLinks = state.links.filter((l) => !isSameLink(l, a, b));
      if (filteredLinks.length === state.links.length) {
        return state;
      }
      return {
        ...state,
        links: filteredLinks,
      };
    }

    case 'SET_BOARD': {
      return action.board;
    }

    default:
      return state;
  }
}
