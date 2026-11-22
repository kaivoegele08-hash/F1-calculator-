import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

/** Hand a JSON file to the share dialog (native) or download it (web). */
export async function shareJson(filename: string, content: string): Promise<'shared' | 'downloaded' | 'unavailable'> {
  try {
    if (Platform.OS === 'web') {
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      return 'downloaded';
    }
    const file = new File(Paths.cache, filename);
    if (file.exists) file.delete();
    file.create();
    file.write(content);
    if (!(await Sharing.isAvailableAsync())) return 'unavailable';
    await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Tagwerk-Daten exportieren', UTI: 'public.json' });
    return 'shared';
  } catch {
    return 'unavailable';
  }
}

/** Let the user pick a JSON file and return its text, or null if cancelled. */
export async function pickJson(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return await new Promise<string | null>((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json,.json';
        input.onchange = async () => {
          const f = input.files?.[0];
          resolve(f ? await f.text() : null);
        };
        input.oncancel = () => resolve(null);
        input.click();
      });
    }
    const res = await File.pickFileAsync();
    if (res.canceled) return null;
    return await res.result.text();
  } catch {
    return null;
  }
}
