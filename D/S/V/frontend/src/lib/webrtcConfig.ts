export const ICE_SERVERS = [
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
];

const TURN_SERVER_URL = process.env.NEXT_PUBLIC_TURN_URL || '';
const TURN_USERNAME = process.env.NEXT_PUBLIC_TURN_USERNAME || '';
const TURN_CREDENTIAL = process.env.NEXT_PUBLIC_TURN_CREDENTIAL || '';

export function getIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [...ICE_SERVERS];

  if (TURN_SERVER_URL && TURN_USERNAME && TURN_CREDENTIAL) {
    servers.push({
      urls: TURN_SERVER_URL,
      username: TURN_USERNAME,
      credential: TURN_CREDENTIAL,
    });
  }

  return servers;
}

export const VIDEO_CONSTRAINTS = {
  high: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 },
  },
  medium: {
    width: { ideal: 854 },
    height: { ideal: 480 },
    frameRate: { ideal: 24 },
  },
  low: {
    width: { ideal: 640 },
    height: { ideal: 360 },
    frameRate: { ideal: 15 },
  },
};

export const AUDIO_CONSTRAINTS = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

export type QualityLevel = 'high' | 'medium' | 'low';

export interface ConnectionStats {
  bitrate: number;
  packetLoss: number;
  jitter: number;
  roundTripTime: number;
  resolution: { width: number; height: number };
  framesPerSecond: number;
}

export function getInitialConstraints(): MediaStreamConstraints {
  return {
    video: VIDEO_CONSTRAINTS.high,
    audio: AUDIO_CONSTRAINTS,
  };
}

export function selectQuality(stats: ConnectionStats): QualityLevel {
  if (stats.bitrate > 1000000 && stats.packetLoss < 0.02 && stats.roundTripTime < 200) {
    return 'high';
  }
  if (stats.bitrate > 500000 && stats.packetLoss < 0.05 && stats.roundTripTime < 400) {
    return 'medium';
  }
  return 'low';
}

export function getAdaptiveConstraints(quality: QualityLevel): MediaStreamConstraints {
  return {
    video: VIDEO_CONSTRAINTS[quality],
    audio: AUDIO_CONSTRAINTS,
  };
}

export function getEncoderConfig(quality: QualityLevel): RTCRtpEncodingParameters {
  switch (quality) {
    case 'high':
      return { maxBitrate: 2000000, maxFramerate: 30, scaleResolutionDownBy: 1 };
    case 'medium':
      return { maxBitrate: 800000, maxFramerate: 24, scaleResolutionDownBy: 1.5 };
    case 'low':
      return { maxBitrate: 300000, maxFramerate: 15, scaleResolutionDownBy: 2 };
  }
}

export function getSimulcastEncodings(): RTCRtpEncodingParameters[] {
  return [
    { maxBitrate: 200000, scaleResolutionDownBy: 3.0, maxFramerate: 15 },
    { maxBitrate: 500000, scaleResolutionDownBy: 2.0, maxFramerate: 24 },
    { maxBitrate: 1500000, scaleResolutionDownBy: 1.0, maxFramerate: 30 },
  ];
}

export function getScalabilityMode(quality: QualityLevel): string {
  switch (quality) {
    case 'high': return 'L3T3';
    case 'medium': return 'L2T2';
    case 'low': return 'L1T1';
  }
}

export function computeBitrate(stats: RTCStatsReport): number {
  let bitrate = 0;
  stats.forEach((report) => {
    if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
      const now = report.timestamp;
      const bytes = report.bytesReceived;
      if ((report as any)._prevBytes !== undefined) {
        const deltaBytes = bytes - (report as any)._prevBytes;
        const deltaTime = (now - (report as any)._prevTimestamp) / 1000;
        if (deltaTime > 0) {
          bitrate = (deltaBytes * 8) / deltaTime;
        }
      }
      (report as any)._prevBytes = bytes;
      (report as any)._prevTimestamp = now;
    }
  });
  return bitrate;
}

export function computePacketLoss(stats: RTCStatsReport): number {
  let packetLoss = 0;
  stats.forEach((report) => {
    if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
      const total = report.packetsReceived + (report.packetsLost || 0);
      if (total > 0) {
        packetLoss = (report.packetsLost || 0) / total;
      }
    }
  });
  return packetLoss;
}

export function computeJitter(stats: RTCStatsReport): number {
  let jitter = 0;
  stats.forEach((report) => {
    if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
      jitter = report.jitter || 0;
    }
  });
  return jitter;
}

export function computeRoundTripTime(stats: RTCStatsReport): number {
  let rtt = 0;
  stats.forEach((report) => {
    if (report.type === 'candidate-pair' && report.state === 'succeeded') {
      rtt = report.currentRoundTripTime || 0;
    }
  });
  return rtt * 1000;
}

export function extractConnectionStats(stats: RTCStatsReport): ConnectionStats {
  return {
    bitrate: computeBitrate(stats),
    packetLoss: computePacketLoss(stats),
    jitter: computeJitter(stats),
    roundTripTime: computeRoundTripTime(stats),
    resolution: { width: 0, height: 0 },
    framesPerSecond: 0,
  };
}

export function isConnectionHealthy(stats: ConnectionStats): boolean {
  return (
    stats.packetLoss < 0.1 &&
    stats.jitter < 0.5 &&
    stats.roundTripTime < 500 &&
    stats.bitrate > 200000
  );
}

export function shouldDowngrade(stats: ConnectionStats): boolean {
  return stats.packetLoss > 0.1 || stats.roundTripTime > 500 || stats.bitrate < 200000;
}

export function shouldUpgrade(stats: ConnectionStats): boolean {
  return stats.packetLoss < 0.02 && stats.roundTripTime < 150 && stats.bitrate > 1500000;
}
