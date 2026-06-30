import { useEffect, useRef, useState } from "react";
import { useNavigation, useTheme } from "./hooks";
import type { Theme } from "./hooks/useTheme";
import { useAuth } from "./contexts/AuthContext";
import { useData } from "./contexts/DataContext";
import type { TabType, Screen, Workout } from "@/types";
import {
  MainLayout,
  BottomNavigation,
  NavigationDrawer,
  TrainingsScreen,
  ExercisesScreen,
  StatsScreen,
  StatsExerciseDetailScreen,
  MenuScreen,
  AddExerciseScreen,
  EditExerciseScreen,
  WorkoutDetailScreen,
  PlansScreen,
  PlanFormScreen,
} from "./components";
import { WorkoutFormModal } from "./components/modals";
import { LoginScreen } from "./components/screens/LoginScreen";
import { RegisterScreen } from "./components/screens/RegisterScreen";
import type { Exercise } from "./hooks/useExercises";
import type { WorkoutPlan } from "./types";
import type { SyncOperation } from "./utils/localStore";

const STALE_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours

function computeLastActivity(workout: Workout): number {
  let latest = new Date(workout.updatedAt).getTime();
  for (const item of workout.items) {
    latest = Math.max(latest, new Date(item.updatedAt).getTime());
    for (const set of item.sets) {
      latest = Math.max(latest, new Date(set.updatedAt).getTime());
    }
  }
  return latest;
}

const ENTITY_LABELS: Record<SyncOperation["entity"], string> = {
  workout: "treningu",
  workoutItem: "ćwiczenia w treningu",
  set: "serii",
  exercise: "ćwiczenia",
  plan: "planu",
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
    <div
      className="px-4 py-2.5"
      style={{
        background: "var(--gg-active-bg)",
        borderBottom: "1px solid var(--gg-active-border)",
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold" style={{ color: "var(--gg-active-border)" }}>
            Nie udało się zsynchronizować zmian:
          </p>
          <ul className="mt-0.5">
            {unique.map((desc) => (
              <li key={desc} className="text-[11px]" style={{ color: "var(--gg-text-sub)" }}>
                · {desc}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex shrink-0 gap-3 mt-0.5">
          <button
            onClick={onRetry}
            className="text-[11px] font-bold border-none bg-transparent cursor-pointer"
            style={{ color: "var(--gg-active-border)" }}
          >
            Ponów
          </button>
          <button
            onClick={onDismiss}
            className="text-[11px] font-medium border-none bg-transparent cursor-pointer"
            style={{ color: "var(--gg-text-muted)" }}
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
  const { theme, setTheme } = useTheme();
  const [authScreen, setAuthScreen] = useState<"login" | "register">("login");

  const { activeTab, setActiveTab, screen, setScreen } =
    useNavigation("trainings");

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
      editingPlan={editingPlan}
      setEditingPlan={setEditingPlan}
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
  editingPlan: WorkoutPlan | null;
  setEditingPlan: (plan: WorkoutPlan | null) => void;
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
  editingPlan,
  setEditingPlan,
  selectedWorkoutId,
  setSelectedWorkoutId,
  pendingExerciseAdd,
  setPendingExerciseAdd,
  selectedStatsExerciseId,
  setSelectedStatsExerciseId,
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

    const lastActivity = computeLastActivity(workout);
    if (Date.now() - lastActivity > STALE_THRESHOLD_MS) {
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
    const lastActivity = computeLastActivity(currentWorkout);
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
    } catch (error) {
      alert("Nie udało się utworzyć treningu");
      // Rzuć dalej, by modal odblokował przycisk i pozwolił spróbować ponownie.
      throw error;
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

      {staleWorkout && (() => {
        const lastActivity = computeLastActivity(staleWorkout);
        const diffMs = Date.now() - lastActivity;
        const hoursAgo = Math.floor(diffMs / (60 * 60 * 1000));
        const minutesAgo = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));
        const timeLabel = hoursAgo > 0
          ? `${hoursAgo}h ${minutesAgo}min`
          : `${minutesAgo} min`;

        return (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center pb-8 px-4"
            style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
          >
            <div
              className="w-full max-w-sm rounded-[22px] p-5"
              style={{
                background: "var(--gg-surface)",
                border: "1.5px solid var(--gg-border)",
                boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="flex items-center justify-center rounded-full flex-shrink-0"
                  style={{ width: 36, height: 36, background: "var(--gg-active-bg)", border: "1.5px solid var(--gg-active-border)" }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gg-active-border)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                </div>
                <div>
                  <p className="text-[14px] font-bold" style={{ color: "var(--gg-text)" }}>Trening się skończył?</p>
                  <p className="text-[12px]" style={{ color: "var(--gg-text-muted)" }}>
                    Ostatnia aktywność {timeLabel} temu
                  </p>
                </div>
              </div>
              {staleWorkout.workoutName && (
                <p className="text-[13px] mb-3" style={{ color: "var(--gg-text-sub)" }}>
                  {staleWorkout.workoutName}
                </p>
              )}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleDismissStaleWorkout}
                  className="flex-1 py-2.5 rounded-xl text-[13px] font-bold cursor-pointer"
                  style={{ background: "var(--gg-surface2)", border: "1.5px solid var(--gg-border)", color: "var(--gg-text-sub)" }}
                >
                  Kontynuuj
                </button>
                <button
                  onClick={handleCompleteStaleWorkout}
                  className="flex-1 py-2.5 rounded-xl text-[13px] font-bold cursor-pointer text-white border-none"
                  style={{ background: "var(--gg-grad-btn)", boxShadow: "0 3px 14px var(--gg-glow)" }}
                >
                  Zakończ trening
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </MainLayout>
  );
}

export default App;
