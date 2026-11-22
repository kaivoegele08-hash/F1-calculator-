import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
import { makeNoiseWav, type NoiseKind } from '@/lib/noise';

const cache = new Map<NoiseKind, string>();

/** Generate the noise file once and return a URI the audio player can use. */
export async function prepareSound(kind: NoiseKind): Promise<string> {
  const hit = cache.get(kind);
  if (hit) return hit;
  const bytes = makeNoiseWav(kind, 10);
  let uri: string;
  if (Platform.OS === 'web') {
    uri = URL.createObjectURL(new Blob([bytes.buffer as ArrayBuffer], { type: 'audio/wav' }));
  } else {
    const file = new File(Paths.cache, `tagwerk-${kind}.wav`);
    if (!file.exists) {
      file.create();
      file.write(bytes);
    }
    uri = file.uri;
  }
  cache.set(kind, uri);
  return uri;
}

export async function startSound(kind: NoiseKind): Promise<AudioPlayer> {
  try {
    await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true });
  } catch {
    /* audio mode is best effort */
  }
  const uri = await prepareSound(kind);
  const player = createAudioPlayer({ uri });
  player.loop = true;
  player.volume = 1;
  player.play();
  return player;
}
