import { useEffect, useRef } from 'react';

export interface TouchControlState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  bomb: boolean;
}

export const useTouchControls = () => {
  const p1Controls = useRef<TouchControlState>({
    up: false,
    down: false,
    left: false,
    right: false,
    bomb: false,
  });

  const p2Controls = useRef<TouchControlState>({
    up: false,
    down: false,
    left: false,
    right: false,
    bomb: false,
  });

  const updateP1Controls = (controls: TouchControlState) => {
    p1Controls.current = { ...controls };
  };

  const updateP2Controls = (controls: TouchControlState) => {
    p2Controls.current = { ...controls };
  };

  return {
    p1Controls,
    p2Controls,
    updateP1Controls,
    updateP2Controls,
  };
};
