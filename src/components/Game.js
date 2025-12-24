import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import './Game.css';
import GridCell from './GridCell';

const GRID_SIZE = 20;
const INITIAL_SPEED = 150;
const MIN_SPEED = 80;

const Game = () => {
  const [bird, setBird] = useState([{ x: 10, y: 10 }]);
  const [pill, setPill] = useState({ x: 15, y: 15 });
  const [direction, setDirection] = useState({ x: 1, y: 0 });
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  const directionRef = useRef({ x: 1, y: 0 });
  const gameLoopRef = useRef(null);
  const touchStartRef = useRef(null);
  const birdSetRef = useRef(new Set());
  const pillRef = useRef({ x: 15, y: 15 });

  // Create a Set for quick bird position lookup
  useEffect(() => {
    birdSetRef.current = new Set(bird.map(segment => `${segment.x},${segment.y}`));
  }, [bird]);

  const generatePill = useCallback((currentBird) => {
    const maxAttempts = 100;
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      const newPill = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      
      // Check if pill doesn't spawn on bird
      const isOnBird = currentBird.some(segment => 
        segment.x === newPill.x && segment.y === newPill.y
      );
      
      if (!isOnBird) {
        return newPill;
      }
      attempts++;
    }
    
    // Fallback (should rarely happen)
    return { x: 15, y: 15 };
  }, []);

  const checkCollision = useCallback((head, bodySet) => {
    // Check wall collision
    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
      return true;
    }
    
    // Check self collision using Set for O(1) lookup
    const headKey = `${head.x},${head.y}`;
    return bodySet.has(headKey);
  }, []);

  useEffect(() => {
    pillRef.current = pill;
  }, [pill]);

  const moveBird = useCallback(() => {
    if (gameOver || isPaused) return;

    setBird(prevBird => {
      const head = {
        x: prevBird[0].x + directionRef.current.x,
        y: prevBird[0].y + directionRef.current.y,
      };

      // Create set of body positions (excluding head) for collision check
      const bodySet = new Set(
        prevBird.slice(1).map(segment => `${segment.x},${segment.y}`)
      );

      if (checkCollision(head, bodySet)) {
        setGameOver(true);
        return prevBird;
      }

      const newBird = [head, ...prevBird];
      const currentPill = pillRef.current;

      // Check if bird ate pill - if yes, bird grows (don't pop tail)
      if (head.x === currentPill.x && head.y === currentPill.y) {
        const newPill = generatePill(newBird);
        setPill(newPill);
        setScore(prev => prev + 1);
        setSpeed(prev => Math.max(MIN_SPEED, prev - 2));
        return newBird; // Bird grows - no pop()
      }

      // Bird didn't eat pill - remove tail
      newBird.pop();
      return newBird;
    });
  }, [gameOver, isPaused, checkCollision, generatePill]);

  useEffect(() => {
    directionRef.current = direction;
  }, [direction]);

  useEffect(() => {
    if (!gameOver && !isPaused) {
      gameLoopRef.current = setInterval(() => {
        moveBird();
      }, speed);

      return () => {
        if (gameLoopRef.current) {
          clearInterval(gameLoopRef.current);
        }
      };
    }
  }, [gameOver, isPaused, speed, moveBird]);

  const resetGame = useCallback(() => {
    const initialBird = [{ x: 10, y: 10 }];
    setBird(initialBird);
    setPill(generatePill(initialBird));
    setDirection({ x: 1, y: 0 });
    setGameOver(false);
    setScore(0);
    setIsPaused(false);
    setSpeed(INITIAL_SPEED);
    directionRef.current = { x: 1, y: 0 };
  }, [generatePill]);

  const handleKeyPress = useCallback((e) => {
    if (gameOver) {
      if (e.key === ' ' || e.key === 'Enter') {
        resetGame();
      }
      return;
    }

    const key = e.key.toLowerCase();
    
    // Prevent reversing into itself
    if (key === 'arrowup' || key === 'w') {
      e.preventDefault();
      if (directionRef.current.y === 0) {
        setDirection({ x: 0, y: -1 });
      }
    } else if (key === 'arrowdown' || key === 's') {
      e.preventDefault();
      if (directionRef.current.y === 0) {
        setDirection({ x: 0, y: 1 });
      }
    } else if (key === 'arrowleft' || key === 'a') {
      e.preventDefault();
      if (directionRef.current.x === 0) {
        setDirection({ x: -1, y: 0 });
      }
    } else if (key === 'arrowright' || key === 'd') {
      e.preventDefault();
      if (directionRef.current.x === 0) {
        setDirection({ x: 1, y: 0 });
      }
    } else if (key === ' ') {
      e.preventDefault();
      setIsPaused(prev => !prev);
    }
  }, [gameOver, resetGame]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // Memoize grid cells for performance - optimized with Set for O(1) lookups
  const gridCells = useMemo(() => {
    const head = bird[0];
    const bodySet = new Set(
      bird.slice(1).map(segment => `${segment.x},${segment.y}`)
    );
    
    return Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => {
      const x = index % GRID_SIZE;
      const y = Math.floor(index / GRID_SIZE);
      const posKey = `${x},${y}`;
      
      return {
        index,
        x,
        y,
        isBirdHead: head.x === x && head.y === y,
        isBirdBody: bodySet.has(posKey),
        isPillCell: pill.x === x && pill.y === y,
      };
    });
  }, [bird, pill]);

  const handleDirectionButton = useCallback((dir) => {
    if (gameOver || isPaused) return;
    
    if (dir === 'up' && directionRef.current.y === 0) {
      setDirection({ x: 0, y: -1 });
    } else if (dir === 'down' && directionRef.current.y === 0) {
      setDirection({ x: 0, y: 1 });
    } else if (dir === 'left' && directionRef.current.x === 0) {
      setDirection({ x: -1, y: 0 });
    } else if (dir === 'right' && directionRef.current.x === 0) {
      setDirection({ x: 1, y: 0 });
    }
  }, [gameOver, isPaused]);

  const handleTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
    };
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (!touchStartRef.current) return;
    
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const minSwipeDistance = 30;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (Math.abs(deltaX) > minSwipeDistance) {
        handleDirectionButton(deltaX > 0 ? 'right' : 'left');
      }
    } else {
      if (Math.abs(deltaY) > minSwipeDistance) {
        handleDirectionButton(deltaY > 0 ? 'down' : 'up');
      }
    }

    touchStartRef.current = null;
  }, [handleDirectionButton]);

  return (
    <div className="game-container">
      <div className="game-header">
        <h1 className="game-title">🐦 Upbirdz</h1>
      </div>
      
      <div className="score-bar-container">
        <div className="score-bar-label">Kefteme Score</div>
        <div className="score-bar">
          <div className="score-bar-fill" style={{ width: `${Math.min((score / 50) * 100, 100)}%` }}></div>
          <div className="score-bar-text">{score}</div>
        </div>
      </div>
      
      <div className="game-board-container">
        <div 
          className="game-board"
          style={{ 
            gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
            gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`
          }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {gridCells.map((cell) => (
            <GridCell
              key={cell.index}
              index={cell.index}
              isBirdHead={cell.isBirdHead}
              isBirdBody={cell.isBirdBody}
              isPillCell={cell.isPillCell}
            />
          ))}
        </div>
      </div>

      {gameOver && (
        <div className="game-over-overlay">
          <div className="game-over-content">
            <h2>Game Over!</h2>
            <p>Kefteme Score: {score}</p>
            <button onClick={resetGame} className="restart-button">
              Play Again
            </button>
          </div>
        </div>
      )}

      {isPaused && !gameOver && (
        <div className="pause-overlay">
          <div className="pause-content">
            <h2>Paused</h2>
            <button onClick={() => setIsPaused(false)} className="resume-button">
              Resume
            </button>
          </div>
        </div>
      )}

      <div className="controls">
        <div className="control-buttons">
          <button 
            className="control-button up"
            onClick={() => handleDirectionButton('up')}
            aria-label="Move up"
          >
            ↑
          </button>
          <div className="horizontal-controls">
            <button 
              className="control-button left"
              onClick={() => handleDirectionButton('left')}
              aria-label="Move left"
            >
              ←
            </button>
            <button 
              className="control-button down"
              onClick={() => handleDirectionButton('down')}
              aria-label="Move down"
            >
              ↓
            </button>
            <button 
              className="control-button right"
              onClick={() => handleDirectionButton('right')}
              aria-label="Move right"
            >
              →
            </button>
          </div>
        </div>
        <div className="mobile-controls-hint">
          <p>Use buttons or swipe to control the bird</p>
        </div>
      </div>

      <div className="game-info">
        <p className="desktop-hint">Use arrow keys or WASD to move | Space to pause</p>
      </div>
    </div>
  );
};

export default Game;
