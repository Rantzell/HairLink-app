import "./global.css";
import { useState } from "react";
import DashboardScreen from "./screens/dashboard/DashboardScreen";
import LoginScreen from "./screens/auth/LoginScreen";
import SignupScreen from "./screens/auth/SignupScreen";

export default function App() {
  // STATE: 
  // isLoggedIn = false -> Show Login/Signup
  // isLoggedIn = true  -> Show Dashboard
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showSignup, setShowSignup] = useState(false);

  // If logged in, show Dashboard. Otherwise, show Login or Signup forms.
  if (isLoggedIn) {
    return <DashboardScreen onLogout={() => setIsLoggedIn(false)} />;
  }

  if (showSignup) {
    return (
      <SignupScreen
        onSignupComplete={() => setIsLoggedIn(true)}
        onSwitchToLogin={() => setShowSignup(false)}
      />
    );
  }

  return (
    <LoginScreen
      onLogin={() => setIsLoggedIn(true)}
      onSwitchToSignup={() => setShowSignup(true)}
    />
  );
}