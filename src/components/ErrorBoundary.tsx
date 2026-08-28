import React, { Component, ErrorInfo, ReactNode } from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import { BRAND_COLOR } from "../theme/colors";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught Error inside React Native component tree:", error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.content}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>!</Text>
            </View>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.message}>
              {this.state.error?.message || "An unexpected error occurred."}
            </Text>
            <TouchableOpacity style={styles.button} onPress={this.handleRetry} activeOpacity={0.8}>
              <Text style={styles.buttonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090b",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  content: {
    width: "100%",
    backgroundColor: "#18181b",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#27272a",
  },
  badge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(244, 63, 94, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  badgeText: {
    color: "#f43f5e",
    fontSize: 24,
    fontWeight: "900",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 8,
  },
  message: {
    fontSize: 13,
    color: "#a1a1aa",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 18,
  },
  button: {
    backgroundColor: BRAND_COLOR,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },
});
