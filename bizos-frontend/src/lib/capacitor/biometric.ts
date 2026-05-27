import { Capacitor } from '@capacitor/core';

async function getPlugin() {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth');
    return BiometricAuth;
  } catch {
    return null;
  }
}

export async function isBiometricAvailable(): Promise<boolean> {
  const plugin = await getPlugin();
  if (!plugin) return false;
  try {
    const result = await plugin.checkBiometry();
    return result.isAvailable;
  } catch {
    return false;
  }
}

export async function authenticateWithBiometric(): Promise<boolean> {
  const plugin = await getPlugin();
  if (!plugin) return true; // web / not native — skip gate

  const available = await isBiometricAvailable();
  if (!available) return true; // device has no biometrics — skip gate

  try {
    await plugin.authenticate({
      reason: 'Verify your identity to access BizOS',
      title: 'BizOS',
      subtitle: 'Use biometrics to continue',
      cancelTitle: 'Cancel',
      allowDeviceCredential: true,
    });
    return true;
  } catch {
    return false;
  }
}
