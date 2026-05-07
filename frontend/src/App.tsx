import { useEffect, useState } from "react";
import { useNavigation, useTheme } from "./hooks";
import type { Theme } from "./hooks/useTheme";
import { useAuth } from "./contexts/AuthContext";
import { useData } from "./contexts/DataContext";
import type { TabType, Screen } from "@/types";
import {
  MainLayout,
  BottomNavigation,
  TrainingsScreen,
  ExercisesScreen,
    StatsScreen,
    StatsExerciseDetailScreen,
    MenuScreen,
  AddExerciseScreen,
  EditExerciseScreen,
  WorkoutDetailScreen,
} from "./components";
import { WorkoutFormModal } from "./components/modals";
import { LoginScreen } from "./components/screens/LoginScreen";
import { RegisterScreen } from "./components/screens/RegisterScreen";
import type { Exercise } from "./hooks/useExercises";

function App() {
  const { user, isLoading, login, register } = useAuth();
  const { theme, setTheme } = useTheme();
  const [authScreen, setAuthScreen] = useState<"login" | "register">("login");

  const { activeTab, setActiveTab, screen, setScreen } =
    useNavigation("trainings");

  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(
    null,
  );
  const [pendingExerciseAdd, setPendingExerciseAdd] = useState<string | null>(
    null,
  );
  const [selectedStatsExerciseId, setSelectedStatsExerciseId] = useState<
    string | null
  >(null);

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
      editingExercise={editingExercise}
      setEditingExercise={setEditingExercise}
      selectedWorkoutId={selectedWorkoutId}
      setSelectedWorkoutId={setSelectedWorkoutId}
      pendingExerciseAdd={pendingExerciseAdd}
      setPendingExerciseAdd={setPendingExerciseAdd}
      selectedStatsExerciseId={selectedStatsExerciseId}
      setSelectedStatsExerciseId={setSelectedStatsExerciseId}
      theme={theme}
      setTheme={setTheme}
    />
  );
}

interface AuthenticatedAppProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  screen: Screen;
  setScreen: (screen: Screen) => void;
  editingExercise: Exercise | null;
  setEditingExercise: (exercise: Exercise | null) => void;
  selectedWorkoutId: string | null;
  setSelectedWorkoutId: (id: string | null) => void;
  pendingExerciseAdd: string | null;
  setPendingExerciseAdd: (id: string | null) => void;
  selectedStatsExerciseId: string | null;
  setSelectedStatsExerciseId: (id: string | null) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
}

function AuthenticatedApp({
  activeTab,
  setActiveTab,
  screen,
  setScreen,
  editingExercise,
  setEditingExercise,
  selectedWorkoutId,
  setSelectedWorkoutId,
  pendingExerciseAdd,
  setPendingExerciseAdd,
  selectedStatsExerciseId,
  setSelectedStatsExerciseId,
  theme,
  setTheme,
}: AuthenticatedAppProps) {
  const {
    createWorkout,
    createExercise,
    updateExercise,
    activeWorkoutId,
    getWorkout,
  } = useData();
  const [isWorkoutFormOpen, setIsWorkoutFormOpen] = useState(false);

  useEffect(() => {
    if (
      screen === "workout-detail" &&
      selectedWorkoutId &&
      !getWorkout(selectedWorkoutId)
    ) {
      setSelectedWorkoutId(null);
      setScreen("trainings");
    }
  }, [screen, selectedWorkoutId, getWorkout, setScreen, setSelectedWorkoutId]);

  const handleAddWorkoutClick = () => {
    // Sprawdź czy istnieje aktywny trening I czy jest załadowany I czy jest w trakcie (nie zakończony)
    const activeWorkout = activeWorkoutId ? getWorkout(activeWorkoutId) : null;
    if (activeWorkout && activeWorkout.status !== "COMPLETED") {
      // Jest aktywny trening w trakcie - przejdź do niego
      setSelectedWorkoutId(activeWorkoutId);
      setScreen("workout-detail");
    } else {
      // Brak aktywnego treningu lub jest zakończony - pokaż formularz
      setIsWorkoutFormOpen(true);
    }
  };

  const handleCreateWorkout = async (data: {
    workoutName?: string;
    gymName?: string;
    workoutDate: string;
  }) => {
    try {
      const newWorkout = await createWorkout(data);
      setIsWorkoutFormOpen(false);
      setSelectedWorkoutId(newWorkout.id);
      setScreen("workout-detail");
    } catch (error) {
      alert("Nie udało się utworzyć treningu");
    }
  };

  const renderTrainingsScreen = () => (
    <TrainingsScreen
      onSelectWorkout={(workoutId) => {
        setSelectedWorkoutId(workoutId);
        setScreen("workout-detail");
      }}
    />
  );

  const renderScreen = () => {
    if (screen === "workout-detail") {
      if (!selectedWorkoutId || !getWorkout(selectedWorkoutId)) {
        return renderTrainingsScreen();
      }

      return (
        <WorkoutDetailScreen
          workoutId={selectedWorkoutId}
          onBack={() => {
            setSelectedWorkoutId(null);
            setScreen("trainings");
          }}
          onCreateNewExercise={() => {
            setScreen("add-exercise");
          }}
          pendingExerciseId={pendingExerciseAdd}
          onExerciseAdded={() => setPendingExerciseAdd(null)}
        />
      );
    }

    if (screen === "add-exercise") {
      return (
        <AddExerciseScreen
          onBack={() => {
            if (selectedWorkoutId) {
              setScreen("workout-detail");
            } else {
              setScreen("exercises");
            }
          }}
          onAddExercise={async (data) => {
            try {
              const newExercise = await createExercise(data);
              if (selectedWorkoutId) {
                setPendingExerciseAdd(newExercise.id);
                setScreen("workout-detail");
              } else {
                setScreen("exercises");
              }
            } catch (error) {}
          }}
        />
      );
    }

    if (screen === "edit-exercise" && editingExercise) {
      return (
        <EditExerciseScreen
          exercise={editingExercise}
          onBack={() => {
            setEditingExercise(null);
            setScreen("exercises");
          }}
          onUpdate={async (id, data) => {
            try {
              await updateExercise(id, data);
              setEditingExercise(null);
              setScreen("exercises");
            } catch (error) {}
          }}
        />
      );
    }

    if (screen === "stats-exercise-detail" && selectedStatsExerciseId) {
      return (
        <StatsExerciseDetailScreen
          exerciseId={selectedStatsExerciseId}
          onBack={() => {
            setSelectedStatsExerciseId(null);
            setScreen("stats");
          }}
        />
      );
    }

    switch (screen) {
      case "trainings":
        return renderTrainingsScreen();
      case "exercises":
        return (
          <ExercisesScreen
            onAddExercise={() => {
              // Wyczyść selectedWorkoutId żeby nowe ćwiczenie nie dodało się do treningu
              setSelectedWorkoutId(null);
              setScreen("add-exercise");
            }}
            onEditExercise={(exercise) => {
              setEditingExercise(exercise);
              setScreen("edit-exercise");
            }}
          />
        );
      case "stats":
        return (
          <StatsScreen
            onOpenExerciseDetails={(exerciseId) => {
              setSelectedStatsExerciseId(exerciseId);
              setScreen("stats-exercise-detail");
            }}
          />
        );
      case "menu":
        return <MenuScreen theme={theme} setTheme={setTheme} />;
      default:
        return renderTrainingsScreen();
    }
  };

  return (
    <MainLayout
      bottomBar={
        <BottomNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onAddWorkout={handleAddWorkoutClick}
          isWorkoutDetail={screen === "workout-detail"}
          hasActiveWorkout={!!activeWorkoutId}
        />
      }
    >
      {renderScreen()}

      {isWorkoutFormOpen && (
        <WorkoutFormModal
          onClose={() => setIsWorkoutFormOpen(false)}
          onSubmit={handleCreateWorkout}
        />
      )}
    </MainLayout>
  );
}

export default App;
