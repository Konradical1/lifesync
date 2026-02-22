import React, { createContext, useContext, useRef, useState, useCallback } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';

const ConfettiContext = createContext(null);

export function ConfettiProvider({ children }) {
  const confettiRef = useRef(null);
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  const [isPlaying, setIsPlaying] = useState(false);
  const { height } = Dimensions.get('window');

  const fire = useCallback((pageX, pageY) => {
    setOrigin({
      x: pageX,
      y: height - pageY,
    });
    setIsPlaying(true);
    setTimeout(() => confettiRef.current?.start?.(), 50);
  }, [height]);

  const onAnimationEnd = useCallback(() => {
    setIsPlaying(false);
  }, []);

  return (
    <ConfettiContext.Provider value={{ fire }}>
      <View style={styles.wrapper}>
        {children}
        {isPlaying && (
          <View style={styles.overlay} pointerEvents="none">
            <ConfettiCannon
              ref={confettiRef}
              count={60}
              origin={origin}
              explosionSpeed={180}
              fallSpeed={3000}
              fadeOut
              colors={['#0EA5E9', '#38BDF8', '#7DD3FC', '#BAE6FD', '#22C55E', '#FBBF24']}
              autoStart={false}
              onAnimationEnd={onAnimationEnd}
            />
          </View>
        )}
      </View>
    </ConfettiContext.Provider>
  );
}

export function useConfetti() {
  const ctx = useContext(ConfettiContext);
  return ctx || { fire: () => {} };
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
});
