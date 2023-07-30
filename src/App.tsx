import {
  type Component,
  For,
  onCleanup,
  createSignal,
  onMount,
} from "solid-js";
import { produce } from "solid-js/store";
import { generateId, clamp, countNewLines } from "./utils";
import { createPersistentStore } from "./hooks/created-persisted-store";

interface Position {
  x: number;
  y: number;
}

interface Card {
  id: string;
  position: Position;
  text: string;
}

const MAX_SCALE = 5;
const MIN_SCALE = 0.25;
const SCALING_FACTOR = 0.01;

export const App: Component = () => {
  const [cards, setCards] = createPersistentStore<Card[]>([], {
    key: "cards",
    type: "session",
  });
  const [canvasPosition, setCanvasPosition] = createPersistentStore(
    {
      x: 0,
      y: 0,
      scale: 1,
    },
    { key: "position", type: "session" }
  );

  let backgroundRef!: HTMLDivElement;

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

  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();

    const currentScale = canvasPosition.scale;
    const direction = e.deltaY < 0 ? "up" : "down";
    const absoluteDiff = Math.abs(e.deltaY) * SCALING_FACTOR;

    const unclampedNewScale =
      direction === "up"
        ? currentScale + absoluteDiff
        : currentScale - absoluteDiff;
    const newScale = clamp(unclampedNewScale, MIN_SCALE, MAX_SCALE);

    const distanceX = e.clientX - canvasPosition.x;
    const distanceY = e.clientY - canvasPosition.y;

    const scaledDistanceX = (distanceX / currentScale) * newScale;
    const scaledDistanceY = (distanceY / currentScale) * newScale;

    const newX = e.clientX - scaledDistanceX;
    const newY = e.clientY - scaledDistanceY;

    setCanvasPosition(
      produce((position) => {
        position.scale = newScale;
        position.x = newX;
        position.y = newY;
      })
    );
  };

  let mouseDownPosition: Position | null = null;

  const handleBackgroundMouseDown = (e: MouseEvent) => {
    mouseDownPosition = {
      x: e.clientX,
      y: e.clientY,
    };
    backgroundRef.addEventListener("mousemove", handleBackgroundMouseMove);
    backgroundRef.addEventListener("mouseup", handleBackgroundMouseUp);
  };

  const handleBackgroundMouseMove = (e: MouseEvent) => {
    if (!mouseDownPosition) {
      return;
    }

    const deltaX = mouseDownPosition.x - e.clientX;
    const deltaY = mouseDownPosition.y - e.clientY;

    mouseDownPosition = { x: e.clientX, y: e.clientY };

    setCanvasPosition(
      produce((position) => {
        position.x = position.x - deltaX;
        position.y = position.y - deltaY;
      })
    );
  };

  const handleBackgroundMouseUp = () => {
    mouseDownPosition = null;
    backgroundRef.removeEventListener("mousemove", handleBackgroundMouseMove);
    backgroundRef.removeEventListener("mouseup", handleBackgroundMouseUp);
  };

  onMount(() => {
    document.addEventListener("wheel", handleWheel, { passive: false });
    backgroundRef.addEventListener("mousedown", handleBackgroundMouseDown);
  });

  onCleanup(() => {
    document.removeEventListener("wheel", handleWheel);
    backgroundRef.removeEventListener("mousedown", handleBackgroundMouseDown);
    backgroundRef.removeEventListener("mousemove", handleBackgroundMouseMove);
    backgroundRef.removeEventListener("mouseup", handleBackgroundMouseUp);
  });

  return (
    <div style={{ height: "100%", position: "relative" }}>
      <header
        style={{ position: "fixed", top: "10px", left: "10px", "z-index": 2 }}
      >
        <button onClick={addCard}>Add card</button>
      </header>

      <div
        ref={backgroundRef}
        style={{ position: "fixed", top: 0, left: 0, bottom: 0, right: 0 }}
      ></div>
      <div
        style={{
          position: "relative",
          "transform-origin": "0 0",
          transform: `translate3d(${canvasPosition.x}px, ${canvasPosition.y}px, 0) scale(${canvasPosition.scale})`,
        }}
      >
        <For each={cards}>
          {(card) => (
            <Card
              card={card}
              scale={canvasPosition.scale}
              updateCard={updateCard}
            />
          )}
        </For>
      </div>
    </div>
  );
};

interface CardProps {
  card: Card;
  scale: number;
  updateCard: (id: string, card: Partial<Omit<Card, "id">>) => void;
}

const Card = (props: CardProps) => {
  const [zIndex, setZIndex] = createSignal(1);
  const [isReadonly, setIsReadonly] = createSignal(true);

  let cardRef!: HTMLDivElement;
  let textAreaRef!: HTMLTextAreaElement;
  let prevMousePosition: Position | null = null;

  const handleMouseDown = (e: MouseEvent) => {
    if (e.detail > 1) {
      e.preventDefault();
    }
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
        x: props.card.position.x + deltaX / props.scale,
        y: props.card.position.y + deltaY / props.scale,
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

  const handleDoubleClick = () => {
    textAreaRef.focus();
    setIsReadonly(false);
  };

  const handleBlur = () => {
    setIsReadonly(true);
  };

  const onInput = (e: InputEvent) => {
    props.updateCard(props.card.id, {
      text: (e.target as HTMLInputElement).value,
    });
  };

  return (
    <div
      ref={cardRef}
      onMouseDown={handleMouseDown}
      onDblClick={handleDoubleClick}
      onInput={onInput}
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
      <textarea
        ref={textAreaRef}
        readOnly={isReadonly()}
        onBlur={handleBlur}
        rows={countNewLines(props.card.text)}
        style={{
          border: "none",
          outline: "none",
          resize: "none",
          "text-align": "center",
          height: "100%",
        }}
      >
        {props.card.text}
      </textarea>
    </div>
  );
};
