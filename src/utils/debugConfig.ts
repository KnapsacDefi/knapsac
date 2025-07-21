
export const DEBUG_CONFIG = {
  WALLET_HEALTH: false, // Set to true for detailed wallet health logs
  NETWORK_MANAGER: true, // Enable detailed network logs for debugging
  WALLET_VALIDATION: false, // Set to true for detailed validation logs
  WITHDRAWAL: false, // Set to true for detailed withdrawal logs
};

export const debugLog = (category: keyof typeof DEBUG_CONFIG, message: string, ...args: any[]) => {
  if (DEBUG_CONFIG[category]) {
    console.log(`[${category}] ${message}`, ...args);
  }
};
