import { useState } from "react";
import { useNavigation, useExercises, useWorkouts } from "./hooks";
import { useAuth } from "./contexts/AuthContext";
import type { TabType, Screen } from "@/types";
import {
  MainLayout,
  BottomNavigation,
  TrainingsScreen,
  ExercisesScreen,
  StatsScreen,
  MenuScreen,
  AddExerciseScreen,
  EditExerciseScreen,
  WorkoutDetailScreen,
} from "./components";
import { LoginScreen } from "./components/screens/LoginScreen";
import { RegisterScreen } from "./components/screens/RegisterScreen";
import type { Exercise } from "./hooks/useExercises";

function App() {
  const { user, isLoading, login, register } = useAuth();
  const [authScreen, setAuthScreen] = useState<"login" | "register">("login");

  const { activeTab, setActiveTab, screen, setScreen } =
    useNavigation("trainings");

  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(
    null
  );
  const [pendingExerciseAdd, setPendingExerciseAdd] = useState<string | null>(
    null
  );

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
}: AuthenticatedAppProps) {
  const { createWorkout } = useWorkouts(undefined, false);
  const { addExercise, updateExercise } = useExercises(undefined, false);

  const handleStartWorkout = async () => {
    try {
      const newWorkout = await createWorkout({
        workoutDate: new Date().toISOString(),
      });
      setSelectedWorkoutId(newWorkout.id);
      setScreen("workout-detail");
    } catch (error) {
      alert("Nie udało się utworzyć treningu");
    }
  };

  const renderScreen = () => {
    if (screen === "workout-detail" && selectedWorkoutId) {
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
              const newExercise = await addExercise(data);
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

    switch (screen) {
      case "trainings":
        return (
          <TrainingsScreen
            onSelectWorkout={(workoutId) => {
              setSelectedWorkoutId(workoutId);
              setScreen("workout-detail");
            }}
          />
        );
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
        return <StatsScreen />;
      case "menu":
        return <MenuScreen />;
      default:
        return (
          <TrainingsScreen
            onSelectWorkout={(workoutId) => {
              setSelectedWorkoutId(workoutId);
              setScreen("workout-detail");
            }}
          />
        );
    }
  };

  return (
    <MainLayout
      bottomBar={
        <BottomNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onAddWorkout={handleStartWorkout}
          isWorkoutDetail={screen === "workout-detail"}
        />
      }
    >
      {renderScreen()}
    </MainLayout>
  );
}

export default App;
