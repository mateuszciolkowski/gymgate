import { useEffect, useRef, useState } from "react";
import type { Theme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/data";
import type { TabType, Screen, Workout, WorkoutPlan } from "@/types";
import type { Exercise } from "@/types";
import {
  computeWorkoutLastActivity,
  STALE_WORKOUT_MS,
} from "@/utils/workoutTimer";
import {
  MainLayout,
  BottomNavigation,
  NavigationDrawer,
} from "@/components";
import {
  TrainingsScreen,
  WorkoutDetailScreen,
  WorkoutFormModal,
} from "@/features/workouts";
import {
  ExercisesScreen,
  AddExerciseScreen,
  EditExerciseScreen,
} from "@/features/exercises";
import { StatsScreen, StatsExerciseDetailScreen } from "@/features/stats";
import { PlansScreen, PlanFormScreen } from "@/features/plans";
import { MenuScreen } from "@/features/menu";
import { SyncFailureBanner } from "./SyncFailureBanner";
import { StaleWorkoutDialog } from "./StaleWorkoutDialog";

interface AuthenticatedAppProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  screen: Screen;
  setScreen: (screen: Screen) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
}

export function AuthenticatedApp({
  activeTab,
  setActiveTab,
  screen,
  setScreen,
  theme,
  setTheme,
}: AuthenticatedAppProps) {
  const { user: authUser } = useAuth();
  const {
    createWorkout,
    createExercise,
    updateExercise,
    activeWorkoutId,
    getWorkout,
    completeWorkout,
    isLoading,
    failedSyncOperations,
    dismissSyncFailures,
    syncNow,
  } = useData();

  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [editingPlan, setEditingPlan] = useState<WorkoutPlan | null>(null);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(
    null,
  );
  const [pendingExerciseAdd, setPendingExerciseAdd] = useState<string | null>(
    null,
  );
  const [selectedStatsExerciseId, setSelectedStatsExerciseId] = useState<
    string | null
  >(null);
  const [isWorkoutFormOpen, setIsWorkoutFormOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [staleWorkout, setStaleWorkout] = useState<Workout | null>(null);
  const staleCheckDone = useRef(new Set<string>());

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

  useEffect(() => {
    if (isLoading || !activeWorkoutId) return;
    if (staleCheckDone.current.has(activeWorkoutId)) return;

    const workout = getWorkout(activeWorkoutId);
    if (!workout || workout.status === "COMPLETED") return;

    staleCheckDone.current.add(activeWorkoutId);

    const lastActivity = computeWorkoutLastActivity(workout);
    if (Date.now() - lastActivity > STALE_WORKOUT_MS) {
      setStaleWorkout(workout);
    }
  }, [activeWorkoutId, isLoading, getWorkout]);

  const activeWorkout = activeWorkoutId ? getWorkout(activeWorkoutId) : null;
  const workoutStartedAt =
    activeWorkout && activeWorkout.status !== "COMPLETED"
      ? activeWorkout.createdAt
      : null;

  const handleCompleteStaleWorkout = async () => {
    if (!staleWorkout) return;
    // Re-fetch the workout from current state — the snapshot in staleWorkout
    // may have been captured before server data arrived (items: []), which
    // would produce durationSeconds = 0.
    const currentWorkout = getWorkout(staleWorkout.id) ?? staleWorkout;
    const lastActivity = computeWorkoutLastActivity(currentWorkout);
    const durationSeconds = Math.max(
      0,
      Math.floor((lastActivity - new Date(currentWorkout.createdAt).getTime()) / 1000),
    );
    try {
      await completeWorkout(staleWorkout.id, durationSeconds);
      setStaleWorkout(null);
    } catch {
      // Keep the modal visible so the user can retry
    }
  };

  const handleDismissStaleWorkout = () => setStaleWorkout(null);

  const handleAddWorkoutClick = () => {
    if (activeWorkout && activeWorkout.status !== "COMPLETED") {
      setSelectedWorkoutId(activeWorkoutId);
      setScreen("workout-detail");
    } else {
      setIsWorkoutFormOpen(true);
    }
  };

  const handleCreateWorkout = async (data: {
    workoutName?: string;
    gymName?: string;
    workoutDate: string;
    workoutPlanId?: string;
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
          isAdmin={authUser?.isAdmin}
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

    if (screen === "plan-form") {
      return (
        <PlanFormScreen
          editingPlan={editingPlan}
          onBack={() => {
            setEditingPlan(null);
            setScreen("plans");
            setActiveTab("plans");
          }}
          onSaved={() => {
            setEditingPlan(null);
            setScreen("plans");
            setActiveTab("plans");
          }}
          onCreateNewExercise={() => {
            setScreen("add-exercise");
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
      case "plans":
        return (
          <PlansScreen
            onCreatePlan={() => {
              setEditingPlan(null);
              setScreen("plan-form");
            }}
            onEditPlan={(plan) => {
              setEditingPlan(plan);
              setScreen("plan-form");
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
      topBanner={
        failedSyncOperations.length > 0 ? (
          <SyncFailureBanner
            operations={failedSyncOperations}
            onRetry={syncNow}
            onDismiss={dismissSyncFailures}
          />
        ) : undefined
      }
      drawer={
        <NavigationDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          onOpen={() => setIsDrawerOpen(true)}
          activeTab={activeTab}
          onNavigate={setActiveTab}
          theme={theme}
          setTheme={setTheme}
        />
      }
      bottomBar={
        <BottomNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onAddWorkout={handleAddWorkoutClick}
          onOpenMenu={() => setIsDrawerOpen(true)}
          isWorkoutDetail={screen === "workout-detail"}
          hasActiveWorkout={!!workoutStartedAt}
          workoutStartedAt={workoutStartedAt}
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

      {staleWorkout && (
        <StaleWorkoutDialog
          workout={staleWorkout}
          onComplete={handleCompleteStaleWorkout}
          onDismiss={handleDismissStaleWorkout}
        />
      )}
    </MainLayout>
  );
}
