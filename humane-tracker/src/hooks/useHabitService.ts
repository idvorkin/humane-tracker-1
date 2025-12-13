import { useMemo } from "react";
import { HabitService } from "../services/habitService";

/**
 * Hook that provides a stable HabitService instance.
 * This keeps HabitService instantiation in the hooks layer per CLAUDE.md.
 */
export function useHabitService(): HabitService {
	return useMemo(() => new HabitService(), []);
}
