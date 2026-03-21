import { useState, useCallback } from "react";
import { AGENTS } from "../data/constants";
import { readStorage, isObjectArray } from "../utils/storage";
import type { Agent } from "../types";

const CUSTOM_AGENTS_KEY = "phq_custom_agents";

export function loadCustomAgents(): Agent[] {
  return readStorage(CUSTOM_AGENTS_KEY, isObjectArray, []) as Agent[];
}

function saveCustomAgents(agents: Agent[]) {
  try {
    localStorage.setItem(CUSTOM_AGENTS_KEY, JSON.stringify(agents));
  } catch { /* ignore */ }
}

export function useCustomAgents() {
  const [customAgents, setCustomAgents] = useState<Agent[]>(loadCustomAgents);

  const addAgent = useCallback((agent: Omit<Agent, "id">) => {
    const newAgent: Agent = { ...agent, id: `custom_${Date.now()}` };
    setCustomAgents(prev => {
      const updated = [...prev, newAgent];
      saveCustomAgents(updated);
      return updated;
    });
    return newAgent;
  }, []);

  const removeAgent = useCallback((id: string) => {
    setCustomAgents(prev => {
      const updated = prev.filter(a => a.id !== id);
      saveCustomAgents(updated);
      return updated;
    });
  }, []);

  const allAgents = [...AGENTS, ...customAgents];

  return { customAgents, allAgents, addAgent, removeAgent };
}
