import { useEffect, useState } from "react";
import { useNavigation, useTheme } from "./hooks";
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
import type { SyncOperation } from "./utils/localStore";

const ENTITY_LABELS: Record<SyncOperation["entity"], string> = {
  workout: "treningu",
  workoutItem: "ćwiczenia w treningu",
  set: "serii",
  exercise: "ćwiczenia",
};

const ACTION_LABELS: Record<SyncOperation["type"], string> = {
  create: "Zapisanie",
  update: "Aktualizacja",
  delete: "Usunięcie",
};

function describeOperation(op: SyncOperation): string {
  return `${ACTION_LABELS[op.type]} ${ENTITY_LABELS[op.entity]}`;
}

interface SyncFailureBannerProps {
  operations: SyncOperation[];
  onRetry: () => void;
  onDismiss: () => void;
}

function SyncFailureBanner({ operations, onRetry, onDismiss }: SyncFailureBannerProps) {
  const unique = [...new Set(operations.map(describeOperation))];

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-3 py-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
            Nie udało się zsynchronizować zmian:
          </p>
          <ul className="mt-0.5 space-y-0.5">
            {unique.map((desc) => (
              <li key={desc} className="text-xs text-amber-700 dark:text-amber-300">
                · {desc}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex shrink-0 gap-2 mt-0.5">
          <button
            onClick={onRetry}
            className="text-xs font-medium text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100"
          >
            Ponów
          </button>
          <button
            onClick={onDismiss}
            className="text-xs font-medium text-amber-500 dark:text-amber-500 hover:text-amber-700 dark:hover:text-amber-300"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const { user, isLoading, login, register } = useAuth();
  const { isDark, toggleTheme } = useTheme();
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Ładowanie...</p>
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
      isDark={isDark}
      toggleTheme={toggleTheme}
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
  isDark: boolean;
  toggleTheme: () => void;
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
  isDark,
  toggleTheme,
}: AuthenticatedAppProps) {
  const {
    createWorkout,
    createExercise,
    updateExercise,
    activeWorkoutId,
    getWorkout,
    failedSyncOperations,
    dismissSyncFailures,
    syncNow,
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
    } catch {
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
            } catch { /* DataContext handles rollback */ }
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
            } catch { /* DataContext handles rollback */ }
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
        return <MenuScreen isDark={isDark} toggleTheme={toggleTheme} />;
      default:
        return renderTrainingsScreen();
    }
  };

  return (
    <MainLayout
      topBanner={
        failedSyncOperations.length > 0 ? (
          <SyncFailureBanner
            operations={failedSyncOperations}
            onRetry={syncNow}
            onDismiss={dismissSyncFailures}
          />
        ) : undefined
      }
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
