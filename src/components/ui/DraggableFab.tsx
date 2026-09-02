import React, { useRef, useState } from "react";
import {
  View,
  StyleSheet,
  PanResponder,
  Animated,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import { Plus } from "lucide-react-native";
import { useLiveMode } from "../../context/LiveModeContext";
import { useTheme } from "../../context/ThemeContext";
import { QuickAddModal } from "./QuickAddModal";

interface DraggableFabProps {
  onNavigate?: (tab: "dashboard" | "income" | "costs" | "plans" | "profile" | "history") => void;
}

export function DraggableFab({ onNavigate }: DraggableFabProps) {
  const { isLiveMode } = useLiveMode();
  const { theme } = useTheme();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const [modalVisible, setModalVisible] = useState(false);

  const FAB_SIZE = 56;
  const initialX = windowWidth - FAB_SIZE - 20;
  const initialY = windowHeight - FAB_SIZE - 120;

  const pan = useRef(new Animated.ValueXY({ x: initialX, y: initialY })).current;
  const panOffset = useRef({ x: initialX, y: initialY });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.hypot(gestureState.dx, gestureState.dy) > 4;
      },
      onPanResponderGrant: () => {
        pan.setOffset({
          x: panOffset.current.x,
          y: panOffset.current.y,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_, gestureState) => {
        pan.flattenOffset();
        const finalX = panOffset.current.x + gestureState.dx;
        const finalY = panOffset.current.y + gestureState.dy;

        // Clamp inside screen bounds
        const clampedX = Math.min(Math.max(12, finalX), windowWidth - FAB_SIZE - 12);
        const clampedY = Math.min(Math.max(40, finalY), windowHeight - FAB_SIZE - 90);

        panOffset.current = { x: clampedX, y: clampedY };
        pan.setValue({ x: clampedX, y: clampedY });

        // If tap (displacement < 6px), open QuickAddModal directly
        if (Math.hypot(gestureState.dx, gestureState.dy) < 6) {
          setModalVisible(true);
        }
      },
    })
  ).current;

  if (!isLiveMode) {
    return null;
  }

  return (
    <>
      <Animated.View
        style={[
          styles.fabContainer,
          {
            transform: pan.getTranslateTransform(),
          },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.fabButton, { backgroundColor: theme.primary }]}
          onPress={() => setModalVisible(true)}
        >
          <Plus size={26} color="#ffffff" strokeWidth={2.5} />
        </TouchableOpacity>
      </Animated.View>

      {/* Directly opens the Quick Add Expense & Income modal */}
      <QuickAddModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 999,
    elevation: 20,
  },
  fabButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 12,
  },
});
