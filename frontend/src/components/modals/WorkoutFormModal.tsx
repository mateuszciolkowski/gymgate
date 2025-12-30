import { useState } from "react";

interface WorkoutFormModalProps {
  onClose: () => void;
  onSubmit: (data: {
    workoutName?: string;
    gymName?: string;
    workoutDate: string;
  }) => void;
}

export function WorkoutFormModal({ onClose, onSubmit }: WorkoutFormModalProps) {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const [workoutName, setWorkoutName] = useState("");
  const [gymName, setGymName] = useState("");
  const [workoutDate, setWorkoutDate] = useState(today);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const dateObj = new Date(workoutDate);
    dateObj.setHours(new Date().getHours());
    dateObj.setMinutes(new Date().getMinutes());

    onSubmit({
      workoutName: workoutName.trim() || undefined,
      gymName: gymName.trim() || undefined,
      workoutDate: dateObj.toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full shadow-2xl">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
            Nowy trening
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nazwa treningu */}
            <div>
              <label
                htmlFor="workoutName"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Nazwa treningu (opcjonalnie)
              </label>
              <input
                type="text"
                id="workoutName"
                value={workoutName}
                onChange={(e) => setWorkoutName(e.target.value)}
                placeholder="np. Trening nóg"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Nazwa siłowni */}
            <div>
              <label
                htmlFor="gymName"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Nazwa siłowni (opcjonalnie)
              </label>
              <input
                type="text"
                id="gymName"
                value={gymName}
                onChange={(e) => setGymName(e.target.value)}
                placeholder="np. McFit"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Data treningu */}
            <div>
              <label
                htmlFor="workoutDate"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Data treningu
              </label>
              <input
                type="date"
                id="workoutDate"
                value={workoutDate}
                onChange={(e) => setWorkoutDate(e.target.value)}
                max={today}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Przyciski */}
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
              >
                Anuluj
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition-colors"
              >
                Rozpocznij
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
