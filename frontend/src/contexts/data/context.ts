import { createContext } from "react";
import type { DataContextType } from "./types";

export const DataContext = createContext<DataContextType | null>(null);
