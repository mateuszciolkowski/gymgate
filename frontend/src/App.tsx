import { useState } from "react";
import { useNavigation, useTheme } from "./hooks";
import { useAuth } from "./contexts/AuthContext";
import { AuthenticatedApp } from "./components/app/AuthenticatedApp";
import { LoginScreen } from "./components/screens/LoginScreen";
import { RegisterScreen } from "./components/screens/RegisterScreen";

function App() {
  const { user, isLoading, login, register } = useAuth();
  const { theme, setTheme } = useTheme();
  const [authScreen, setAuthScreen] = useState<"login" | "register">("login");

  const { activeTab, setActiveTab, screen, setScreen } =
    useNavigation("trainings");

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--gg-bg)" }}>
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-10 h-10 rounded-full border-2 animate-spin"
            style={{ borderColor: "var(--gg-a1)", borderTopColor: "transparent" }}
          />
          <p className="text-[13px]" style={{ color: "var(--gg-text-muted)" }}>Ładowanie...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (authScreen === "register") {
      return (
        <RegisterScreen
          onRegister={register}
          onSwitchToLogin={() => setAuthScreen("login")}
        />
      );
    }
    return (
      <LoginScreen
        onLogin={login}
        onSwitchToRegister={() => setAuthScreen("register")}
      />
    );
  }

  return (
    <AuthenticatedApp
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      screen={screen}
      setScreen={setScreen}
      theme={theme}
      setTheme={setTheme}
    />
  );
}

export default App;
