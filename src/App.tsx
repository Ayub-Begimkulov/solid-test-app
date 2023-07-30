import {
  type Component,
  For,
  onCleanup,
  createEffect,
  createSignal,
} from "solid-js";
import { createStore, produce } from "solid-js/store";
import { generateId } from "./utils/generate-id";

interface Position {
  x: number;
  y: number;
}

interface Card {
  id: string;
  position: Position;
  text: string;
}

export const App: Component = () => {
  const [cards, setCards] = createStore<Card[]>(
    getInitialCards(sessionStorage)
  );

  const addCard = () => {
    setCards(cards.length, {
      id: generateId(),
      text: "New Card",
      position: { x: 100, y: 100 },
    });
  };

  const updateCard = (id: string, card: Partial<Omit<Card, "id">>) => {
    setCards(
      (card) => card.id === id,
      produce((currentCard) => Object.assign(currentCard, card))
    );
  };

  createEffect(() => {
    const cardsString = JSON.stringify(cards);
    sessionStorage.setItem("cards", cardsString);
  });

  return (
    <div style={{ height: "100%", position: "relative" }}>
      <header style={{ position: "fixed", top: "10px", left: "10px" }}>
        <button onClick={addCard}>Add card</button>
      </header>

      <For each={cards}>
        {(card) => <Card card={card} updateCard={updateCard} />}
      </For>
    </div>
  );
};

interface CardProps {
  card: Card;
  updateCard: (id: string, card: Partial<Omit<Card, "id">>) => void;
}

const Card = (props: CardProps) => {
  const [zIndex, setZIndex] = createSignal(1);
  let cardRef!: HTMLDivElement;
  let prevMousePosition: Position | null = null;

  const handleMouseDown = (e: MouseEvent) => {
    setZIndex(2);
    cardRef.addEventListener("mousemove", handleMouseMove);
    cardRef.addEventListener("mouseup", handleMouseUp);

    prevMousePosition = {
      x: e.clientX,
      y: e.clientY,
    };
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!prevMousePosition) {
      return;
    }

    const deltaX = e.clientX - prevMousePosition.x;
    const deltaY = e.clientY - prevMousePosition.y;
    prevMousePosition = {
      x: e.clientX,
      y: e.clientY,
    };
    props.updateCard(props.card.id, {
      position: {
        x: props.card.position.x + deltaX,
        y: props.card.position.y + deltaY,
      },
    });
  };

  const handleMouseUp = () => {
    setZIndex(1);
    cardRef.removeEventListener("mousemove", handleMouseMove);
    cardRef.removeEventListener("mouseup", handleMouseUp);
    prevMousePosition = null;
  };

  onCleanup(() => {
    cardRef.removeEventListener("mousemove", handleMouseMove);
    cardRef.removeEventListener("mouseup", handleMouseUp);
  });

  return (
    <div
      ref={cardRef}
      onMouseDown={handleMouseDown}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        transform: `translate3d(${props.card.position.x}px, ${props.card.position.y}px, 0)`,
        "min-width": "200px",
        "min-height": "200px",
        border: "1px solid black",
        display: "flex",
        "justify-content": "center",
        "align-items": "center",
        background: "white",
        "z-index": zIndex(),
      }}
    >
      {props.card.text}
    </div>
  );
};

function getInitialCards(storage: Storage) {
  const storageCards = storage.getItem("cards");
  try {
    const initialCards = storageCards ? JSON.parse(storageCards) : [];
    return initialCards;
  } catch {
    return [];
  }
}
