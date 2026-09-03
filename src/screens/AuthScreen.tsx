import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from "react-native";
import { supabase } from "../lib/supabase";
import { useTheme } from "../context/ThemeContext";
import { useAppAlert } from "../context/AlertContext";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { AppLogo } from "../components/ui/AppLogo";

export function AuthScreen() {
  const { theme } = useTheme();
  const { showAlert } = useAppAlert();
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    setNameError("");
    setEmailError("");
    setPasswordError("");

    let hasError = false;

    if (isSignUp && !name.trim()) {
      setNameError("Please enter your name");
      hasError = true;
    }

    if (!email.trim()) {
      setEmailError("Please enter your email address");
      hasError = true;
    }

    if (!password.trim()) {
      setPasswordError("Please enter your password");
      hasError = true;
    }

    if (hasError) return;

    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
          options: {
            data: {
              name: name.trim(),
              full_name: name.trim(),
            },
          },
        });
        if (error) throw error;
        showAlert("Success", "Account created successfully! You can now log in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });
        if (error) throw error;
      }
    } catch (err: any) {
      showAlert("Authentication Error", err.message || "An unexpected error occurred.");
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
          <AppLogo width={180} style={styles.logo} />
          <Text style={[styles.brandSubtitle, { color: theme.textSecondary }]}>Personal Financial Management</Text>
        </View>

        <Card style={styles.card}>
          <Text style={[styles.cardHeaderTitle, { color: theme.textPrimary }]}>
            {isSignUp ? "Create Account" : "Sign In"}
          </Text>
          <Text style={[styles.cardHeaderSubtitle, { color: theme.textMuted }]}>
            {isSignUp ? "Enter your details to sign up" : "Access your budget & expense tracker"}
          </Text>

          {isSignUp && (
            <Input
              label="Full Name"
              placeholder="John Doe"
              value={name}
              onChangeText={(t) => {
                setName(t);
                if (nameError) setNameError("");
              }}
              error={nameError}
              autoCapitalize="words"
            />
          )}

          <Input
            label="Email Address"
            placeholder="name@example.com"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              if (emailError) setEmailError("");
            }}
            error={emailError}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Input
            label="Password"
            placeholder="••••••••"
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              if (passwordError) setPasswordError("");
            }}
            error={passwordError}
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
            onPress={() => {
              setIsSignUp(!isSignUp);
              setName("");
            }}
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
  logo: {
    marginBottom: 8,
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
