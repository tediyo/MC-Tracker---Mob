import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, TouchableOpacity } from "react-native";
import { supabase } from "../lib/supabase";
import { useTheme } from "../context/ThemeContext";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";

export function AuthScreen() {
  const { theme } = useTheme();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please enter both email and password");
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
        });
        if (error) throw error;
        Alert.alert("Success", "Account created successfully! You can now log in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });
        if (error) throw error;
      }
    } catch (err: any) {
      Alert.alert("Authentication Error", err.message || "An unexpected error occurred.");
    } finally {
      setIsSignUp(false);
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.brandContainer}>
          <View style={[styles.logoBadge, { backgroundColor: theme.primaryLight, borderColor: theme.primary }]}>
            <Text style={[styles.logoText, { color: theme.primary }]}>MC</Text>
          </View>
          <Text style={[styles.brandTitle, { color: theme.textPrimary }]}>MC Tracker</Text>
          <Text style={[styles.brandSubtitle, { color: theme.textSecondary }]}>Personal Financial Management</Text>
        </View>

        <Card style={styles.card}>
          <Text style={[styles.cardHeaderTitle, { color: theme.textPrimary }]}>
            {isSignUp ? "Create Account" : "Sign In"}
          </Text>
          <Text style={[styles.cardHeaderSubtitle, { color: theme.textMuted }]}>
            {isSignUp ? "Enter your email & password to sign up" : "Access your budget & expense tracker"}
          </Text>

          <Input
            label="Email Address"
            placeholder="name@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Input
            label="Password"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            isPassword
          />

          <Button
            title={isSignUp ? "Sign Up" : "Sign In"}
            onPress={handleAuth}
            loading={loading}
            style={styles.submitBtn}
          />

          <TouchableOpacity
            style={styles.toggleBtn}
            onPress={() => setIsSignUp(!isSignUp)}
          >
            <Text style={[styles.toggleText, { color: theme.primary }]}>
              {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
            </Text>
          </TouchableOpacity>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    padding: 20,
    justifyContent: "center",
  },
  brandContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  logoText: {
    fontSize: 22,
    fontWeight: "900",
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: "800",
  },
  brandSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  card: {
    padding: 20,
  },
  cardHeaderTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  cardHeaderSubtitle: {
    fontSize: 12,
    marginBottom: 18,
  },
  submitBtn: {
    marginTop: 10,
  },
  toggleBtn: {
    marginTop: 16,
    alignItems: "center",
  },
  toggleText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
