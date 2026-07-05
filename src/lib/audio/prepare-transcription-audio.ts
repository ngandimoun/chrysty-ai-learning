const GEMINI_NATIVE_MIME_TYPES = new Set([
  'audio/ogg',
  'audio/wav',
  'audio/x-wav',
  'audio/mp3',
  'audio/mpeg',
  'audio/aiff',
  'audio/aac',
  'audio/flac',
  'audio/opus',
  'audio/m4a',
]);

function baseMimeType(mimeType: string): string {
  return mimeType.split(';')[0]?.trim().toLowerCase() ?? '';
}

function filenameForMime(mimeType: string): string {
  switch (baseMimeType(mimeType)) {
    case 'audio/ogg':
      return 'recording.ogg';
    case 'audio/mp3':
    case 'audio/mpeg':
      return 'recording.mp3';
    case 'audio/aiff':
      return 'recording.aiff';
    case 'audio/aac':
      return 'recording.aac';
    case 'audio/flac':
      return 'recording.flac';
    case 'audio/opus':
      return 'recording.opus';
    case 'audio/m4a':
      return 'recording.m4a';
    default:
      return 'recording.wav';
  }
}

function mixToMono(audioBuffer: AudioBuffer): Float32Array {
  if (audioBuffer.numberOfChannels === 1) {
    return audioBuffer.getChannelData(0);
  }

  const { length, numberOfChannels } = audioBuffer;
  const mono = new Float32Array(length);

  for (let channel = 0; channel < numberOfChannels; channel += 1) {
    const channelData = audioBuffer.getChannelData(channel);
    for (let i = 0; i < length; i += 1) {
      mono[i]! += channelData[i]! / numberOfChannels;
    }
  }

  return mono;
}

function encodeWavBlob(samples: Float32Array, sampleRate: number): Blob {
  const bytesPerSample = 2;
  const blockAlign = bytesPerSample;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i += 1) {
    const sample = samples[i] ?? 0;
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

async function blobToWav(blob: Blob): Promise<Blob> {
  const AudioContextClass =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;

  if (!AudioContextClass) {
    throw new Error('Audio decoding is not supported in this browser.');
  }

  const audioContext = new AudioContextClass();
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    const mono = mixToMono(audioBuffer);
    return encodeWavBlob(mono, audioBuffer.sampleRate);
  } finally {
    await audioContext.close();
  }
}

export async function prepareTranscriptionAudio(
  blob: Blob,
): Promise<{ blob: Blob; filename: string }> {
  const mimeType = baseMimeType(blob.type);

  if (GEMINI_NATIVE_MIME_TYPES.has(mimeType)) {
    return { blob, filename: filenameForMime(mimeType) };
  }

  const wavBlob = await blobToWav(blob);
  return { blob: wavBlob, filename: 'recording.wav' };
}
