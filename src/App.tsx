import React, { useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { rest, setupWorker } from "msw";

import "./App.css";

import seed from "./__fixtures__/example.json";

const worker = setupWorker(
  rest.get("/seed", (req, res, ctx) => {
    return res(ctx.json({ data: seed.data }));
  })
);

worker.start();

const COLORS = ["#A3A3A3", "#5DAAFF", "#2CB48A"];

const Container = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
`;

const Row = styled.div`
  display: flex;
`;

const Cell = styled.div<{ color: string; active: boolean }>`
  width: 1rem;
  height: 1rem;
  background-color: ${({ color }) => color};
  font-size: 8px;
  box-sizing: border-box;
  border: ${({ active }) => (active ? "1px solid black" : "initial")};
`;

function App() {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [cells, setCells] = useState<number[][]>([]);
  const [playing, setPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(100);
  const [currentCell, setCurrentCell] = useState<{ y: number; x: number }>({
    x: 0,
    y: 0,
  });

  const intervalId = useRef<number>();

  const getCellState = useCallback(
    (y: number, x: number) => {
      const current = cells[y][x];
      // Reference for neighbors array [sad, happy]
      const neighbors = [0, 0];

      const sumUpper = () => {
        if (!cells[y - 1]) return;

        for (let i = x - 1; i < x + 2; i++) {
          if (cells[y - 1][i] === 1) neighbors[0] += 1;
          if (cells[y - 1][i] === 2) neighbors[1] += 1;
        }
      };

      const sumLower = () => {
        if (!cells[y + 1]) return;

        for (let i = x - 1; i < x + 2; i++) {
          if (cells[y + 1][i] === 1) neighbors[0] += 1;
          if (cells[y + 1][i] === 2) neighbors[1] += 1;
        }
      };

      const sumSides = () => {
        if (!cells[y]) return;

        if (cells[y][x - 1] === 1) neighbors[0] += 1;
        if (cells[y][x - 1] === 2) neighbors[1] += 1;

        if (cells[y][x + 1] === 1) neighbors[0] += 1;
        if (cells[y][x + 1] === 2) neighbors[1] += 1;
      };

      sumUpper();
      sumSides();
      sumLower();

      // Any sad or happy cell with a combined total of exactly two or three sad or happy neighbours survives.
      if (current > 0) {
        if (
          neighbors[0] === 2 ||
          neighbors[0] === 3 ||
          neighbors[1] === 2 ||
          neighbors[1] === 3
        ) {
          return current;
        }
      }

      // Any dead cell with exactly three sad neighbors becomes a sad cell.
      if (neighbors[0] === 3) {
        return 1;
      }

      // Any dead cell with exactly two sad neighbors and 1 happy neighbor becomes a sad cell.
      if (neighbors[0] === 2 && neighbors[1] === 1) {
        return 1;
      }

      // Any dead cell with exactly one sad neighbor and 2 happy neighbors becomes a happy cell.
      if (neighbors[0] === 1 && neighbors[1] === 2) {
        return 2;
      }

      // Any dead cell with exactly 3 happy neighbors becomes a happy cell.
      if (neighbors[1] === 3) {
        return 2;
      }

      return 0;
    },
    [cells]
  );

  useEffect(() => {
    setLoading(true);
    (async () => {
      try {
        const response = await fetch("/seed");
        const {
          data: { state },
        } = await response.json();

        setCells(state);
      } catch (e) {
        setError("There was problem when trying to get the data");
      } finally {
        setLoading(false);
      }
    })();
  }, [setLoading]);

  useEffect(() => {
    const newCells = [...cells];

    if (playing) {
      intervalId.current = window.setInterval(() => {
        let { y, x } = currentCell;
        newCells[y][x] = getCellState(y, x);
        setCells(newCells);

        x++;

        if (y >= cells.length - 1 && x >= cells[0].length) {
          setCurrentCell({ y: 0, x: 0 });
          return;
        }

        if (x >= cells[y].length) {
          setCurrentCell({ y: y + 1, x: 0 });
          return;
        }

        setCurrentCell({ y, x });
      }, speed);
    }

    return () => {
      clearInterval(intervalId.current!);
    };
  }, [playing, cells, speed, currentCell, getCellState]);

  if (error) {
    return <div className="App">{error}</div>;
  }

  if (loading) {
    return <div className="App">Loading...</div>;
  }

  return (
    <div className="App">
      <Container>
        {cells.map((row: number[], y: number) => (
          <Row key={y}>
            {row.map((cell: number, x: number) => {
              return (
                <Cell
                  key={x}
                  color={COLORS[cell]}
                  active={currentCell.x === x && currentCell.y === y}
                />
              );
            })}
          </Row>
        ))}
        <div>
          <button onClick={() => setPlaying(!playing)}>
            {!playing ? "Play" : "Pause"}
          </button>
          <label htmlFor="speed">
            <input
              type="number"
              id="speed"
              min="50"
              step="50"
              onChange={({ target }) =>
                +target.value <= 10 ? setSpeed(10) : setSpeed(+target.value)
              }
              value={speed}
            />
          </label>
        </div>
      </Container>
    </div>
  );
}

export default App;
