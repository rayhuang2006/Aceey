import { reactive, ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';

// --- Settings Store (from old main.js lines 22-100) ---
export const appSettings = reactive({
  clistUsername: "",
  clistApiKey: "",
  groqApiKey: "",
  autoTriggerCE: true,
  autoTriggerRE: true,
  autoTriggerWA: true,
  autoTriggerTLE: true,
  tokenBudget: 50000
});

let settingsStore = null;

export async function initApp() {
  try {
    const storeModule = window.__TAURI__?.store || window.__TAURI_PLUGIN_STORE__;
    if (storeModule) {
      settingsStore = await (storeModule.load ? storeModule.load('settings.json') : new storeModule.Store('settings.json'));
    } else {
      console.warn("Tauri Store plugin not found in window.__TAURI__");
      return;
    }

    appSettings.clistUsername = await settingsStore.get('clistUsername') ?? "";
    appSettings.clistApiKey = await settingsStore.get('clistApiKey') ?? "";
    appSettings.groqApiKey = await settingsStore.get('groqApiKey') ?? "";
    appSettings.autoTriggerCE = await settingsStore.get('autoTriggerCE') ?? true;
    appSettings.autoTriggerRE = await settingsStore.get('autoTriggerRE') ?? true;
    appSettings.autoTriggerWA = await settingsStore.get('autoTriggerWA') ?? true;
    appSettings.autoTriggerTLE = await settingsStore.get('autoTriggerTLE') ?? true;
    appSettings.tokenBudget = await settingsStore.get('tokenBudget') ?? 50000;

    // .env fallback
    if (!appSettings.clistUsername || !appSettings.clistApiKey || !appSettings.groqApiKey) {
      try {
        const envVars = await invoke('get_env_vars');
        let foundEnv = false;
        if (envVars.CLIST_USERNAME && !appSettings.clistUsername) {
          appSettings.clistUsername = envVars.CLIST_USERNAME;
          await settingsStore.set('clistUsername', appSettings.clistUsername);
          foundEnv = true;
        }
        if (envVars.CLIST_API_KEY && !appSettings.clistApiKey) {
          appSettings.clistApiKey = envVars.CLIST_API_KEY;
          await settingsStore.set('clistApiKey', appSettings.clistApiKey);
          foundEnv = true;
        }
        if (envVars.GROQ_API_KEY && !appSettings.groqApiKey) {
          appSettings.groqApiKey = envVars.GROQ_API_KEY;
          await settingsStore.set('groqApiKey', appSettings.groqApiKey);
          foundEnv = true;
        }
        if (foundEnv) {
          await settingsStore.save();
          console.log("Detected .env, auto-filled and saved settings");
        }
      } catch (envError) {
        console.warn("Failed to load .env fallback:", envError);
      }
    }
  } catch (e) {
    console.error("Store load failed:", e);
  }
}

export async function updateStoreValue(key, value) {
  appSettings[key] = value;
  if (!settingsStore) {
    try {
      const storeModule = window.__TAURI__?.store || window.__TAURI_PLUGIN_STORE__;
      if (storeModule) {
        settingsStore = await (storeModule.load ? storeModule.load('settings.json') : new storeModule.Store('settings.json'));
      }
    } catch (e) {
      console.error("Failed to reload Store:", e);
      return;
    }
  }
  if (settingsStore) {
    await settingsStore.set(key, value);
    await settingsStore.save();
  }
}

// --- Global UI State ---
export const activeView = ref('ide'); // 'ide', 'calendar', 'settings'
export const calendarActive = ref(false);
export const isAgentAnalyzing = ref(false);

// --- Test Cases State (from old main.js lines 16-19) ---
export const testCases = reactive([
  { id: 1, input: "1 2\n", expected_output: "3\n", actual_output: "", verdict: "-", time_ms: 0, error: null }
]);
export const activeTcId = ref(1);

// --- Token Monitor (from old main.js lines 528-581) ---
export const quotaData = reactive({
  totalTokens: 0,
  promptTokens: 0,
  completionTokens: 0,
  estimatedCost: "0.0000",
  percentage: 0
});

export async function updateTokenMonitorUI() {
  try {
    const usages = await invoke('get_token_usage');
    if (!usages) return;
    let totalPrompt = 0;
    let totalCompletion = 0;
    usages.forEach(u => {
      totalPrompt += u.prompt_tokens || 0;
      totalCompletion += u.completion_tokens || 0;
    });
    const total = totalPrompt + totalCompletion;
    const cost = (totalPrompt * 0.59 / 1000000) + (totalCompletion * 0.79 / 1000000);
    const budget = appSettings.tokenBudget || 50000;
    quotaData.totalTokens = total;
    quotaData.promptTokens = totalPrompt;
    quotaData.completionTokens = totalCompletion;
    quotaData.estimatedCost = cost.toFixed(4);
    quotaData.percentage = Math.min((total / budget) * 100, 100);
  } catch (e) {
    console.error("Failed to update token monitor:", e);
  }
}

// --- Helpers ---
export function openExternal(url) {
  try {
    invoke('plugin:shell|open', { path: url });
  } catch {
    window.open(url, '_blank');
  }
}
