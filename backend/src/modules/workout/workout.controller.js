import * as workoutService from "./workout.service.js";
export const createWorkout = async (req, res) => {
    try {
        const userId = req.userId || req.body?.userId || "1";
        const workout = await workoutService.createWorkout(userId, req.body);
        res.status(201).json({ success: true, data: workout });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
export const getWorkoutById = async (req, res) => {
    try {
        const userId = req.userId || "1";
        const workout = await workoutService.getWorkoutById(req.params.id, userId);
        res.json({ success: true, data: workout });
    }
    catch (error) {
        const statusCode = error instanceof Error && error.message.includes("nie znaleziony")
            ? 404
            : 403;
        res.status(statusCode).json({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
export const getUserWorkouts = async (req, res) => {
    try {
        const userId = req.userId || "1";
        const workouts = await workoutService.getUserWorkouts(userId, req.query);
        res.json({ success: true, data: workouts, count: workouts.length });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
export const updateWorkout = async (req, res) => {
    try {
        const userId = req.userId || "1";
        const workout = await workoutService.updateWorkout(req.params.id, userId, req.body);
        res.json({ success: true, data: workout });
    }
    catch (error) {
        const statusCode = error instanceof Error && error.message.includes("nie znaleziony")
            ? 404
            : 403;
        res.status(statusCode).json({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
export const deleteWorkout = async (req, res) => {
    try {
        const userId = req.userId || "1";
        await workoutService.deleteWorkout(req.params.id, userId);
        res.json({ success: true, message: "Trening usunięty" });
    }
    catch (error) {
        const statusCode = error instanceof Error && error.message.includes("nie znaleziony")
            ? 404
            : 403;
        res.status(statusCode).json({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
export const addExerciseToWorkout = async (req, res) => {
    try {
        const userId = req.userId || "1";
        const item = await workoutService.addExerciseToWorkout(req.params.workoutId, userId, req.body);
        res.status(201).json({ success: true, data: item });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
export const updateWorkoutItem = async (req, res) => {
    try {
        const userId = req.userId || "1";
        const item = await workoutService.updateWorkoutItem(req.params.itemId, userId, req.body);
        res.json({ success: true, data: item });
    }
    catch (error) {
        const statusCode = error instanceof Error && error.message.includes("nie znaleziona")
            ? 404
            : 403;
        res.status(statusCode).json({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
export const deleteWorkoutItem = async (req, res) => {
    try {
        const userId = req.userId || "1";
        await workoutService.deleteWorkoutItem(req.params.itemId, userId);
        res.json({ success: true, message: "Ćwiczenie usunięte z treningu" });
    }
    catch (error) {
        const statusCode = error instanceof Error && error.message.includes("nie znaleziona")
            ? 404
            : 403;
        res.status(statusCode).json({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
export const addSetToWorkoutItem = async (req, res) => {
    try {
        const userId = req.userId || "1";
        const set = await workoutService.addSetToWorkoutItem(req.params.itemId, userId, req.body);
        res.status(201).json({ success: true, data: set });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
export const updateWorkoutSet = async (req, res) => {
    try {
        const userId = req.userId || "1";
        const set = await workoutService.updateWorkoutSet(req.params.setId, userId, req.body);
        res.json({ success: true, data: set });
    }
    catch (error) {
        const statusCode = error instanceof Error && error.message.includes("Nie znaleziono")
            ? 404
            : 403;
        res.status(statusCode).json({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
export const deleteWorkoutSet = async (req, res) => {
    try {
        const userId = req.userId || "1";
        await workoutService.deleteWorkoutSet(req.params.setId, userId);
        res.json({ success: true, message: "Seria usunięta" });
    }
    catch (error) {
        const statusCode = error instanceof Error && error.message.includes("Nie znaleziono")
            ? 404
            : 403;
        res.status(statusCode).json({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
export const getExerciseStats = async (req, res) => {
    try {
        const userId = req.userId || "1";
        const stats = await workoutService.getExerciseStatsForUser(userId, req.params.exerciseId);
        if (!stats) {
            return res.json({
                success: true,
                data: null,
                message: "To twoje pierwsze wykonanie tego ćwiczenia",
            });
        }
        res.json({ success: true, data: stats });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
export const getAllUserStats = async (req, res) => {
    try {
        const userId = req.userId || "1";
        const stats = await workoutService.getAllUserStats(userId);
        res.json({ success: true, data: stats, count: stats.length });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
export const getActiveWorkout = async (req, res) => {
    try {
        const userId = req.userId || "1";
        const activeWorkoutId = await workoutService.getActiveWorkoutId(userId);
        res.json({ success: true, data: { activeWorkoutId } });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
export const clearActiveWorkout = async (req, res) => {
    try {
        const userId = req.userId || "1";
        await workoutService.clearActiveWorkout(userId);
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
//# sourceMappingURL=workout.controller.js.map