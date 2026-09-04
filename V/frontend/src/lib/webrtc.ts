export interface IceServer {
  urls: string;
  username?: string;
  credential?: string;
}

export interface WebRTCConfig {
  iceServers: IceServer[];
  offerOptions?: RTCOfferOptions;
}

export interface ConnectionStats {
  bitrate: number;
  packetLoss: number;
  jitter: number;
  resolution: string;
  fps: number;
  latency: number;
}

export type ConnectionState = 'new' | 'connecting' | 'connected' | 'disconnected' | 'failed' | 'closed';

export class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private statsInterval: number | null = null;
  private config: WebRTCConfig;

  onConnectionStateChange?: (state: ConnectionState) => void;
  onRemoteStream?: (stream: MediaStream) => void;
  onSignal?: (signal: RTCSignalingState) => void;
  onDataChannelMessage?: (message: any) => void;
  onStatsUpdate?: (stats: ConnectionStats) => void;
  onError?: (error: Error) => void;

  constructor(config?: Partial<WebRTCConfig>) {
    this.config = {
      iceServers: config?.iceServers || [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
      ],
    };
  }

  async initializeLocalStream(video: boolean = true, audio: boolean = true): Promise<MediaStream> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: video ? {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 60 },
          facingMode: 'user',
        } : false,
        audio: audio ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } : false,
      });

      return this.localStream;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to get media stream');
      this.onError?.(err);
      throw err;
    }
  }

  async createPeerConnection(): Promise<RTCPeerConnection> {
    this.peerConnection = new RTCPeerConnection(this.config);

    this.localStream?.getTracks().forEach((track) => {
      this.peerConnection!.addTrack(track, this.localStream!);
    });

    this.remoteStream = new MediaStream();
    this.peerConnection.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        this.remoteStream!.addTrack(track);
      });
      this.onRemoteStream?.(this.remoteStream!);
    };

    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState as ConnectionState;
      this.onConnectionStateChange?.(state);

      if (state === 'connected') {
        this.startStatsMonitoring();
      } else {
        this.stopStatsMonitoring();
      }

      if (state === 'failed' || state === 'disconnected') {
        this.onError?.(new Error(`Connection ${state}`));
      }
    };

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.onSignal?.({
          type: 'ice-candidate',
          candidate: event.candidate,
        } as any);
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      const iceState = this.peerConnection?.iceConnectionState;
      if (iceState === 'failed') {
        this.onError?.(new Error('ICE connection failed'));
      }
    };

    this.dataChannel = this.peerConnection.createDataChannel('chat', {
      ordered: true,
    });

    this.dataChannel.onmessage = (event) => {
      try {
        this.onDataChannelMessage?.(JSON.parse(event.data));
      } catch {
        this.onDataChannelMessage?.(event.data);
      }
    };

    this.peerConnection.ondatachannel = (event) => {
      this.dataChannel = event.channel;
      this.dataChannel.onmessage = (e) => {
        try {
          this.onDataChannelMessage?.(JSON.parse(e.data));
        } catch {
          this.onDataChannelMessage?.(e.data);
        }
      };
    };

    return this.peerConnection;
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    const offer = await this.peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });

    await this.peerConnection.setLocalDescription(offer);
    return offer;
  }

  async handleOffer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      await this.createPeerConnection();
    }

    await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(offer));

    const answer = await this.peerConnection!.createAnswer();
    await this.peerConnection!.setLocalDescription(answer);

    return answer;
  }

  async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  }

  async handleIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  }

  muteAudio(): void {
    this.localStream?.getAudioTracks().forEach((track) => {
      track.enabled = false;
    });
  }

  unmuteAudio(): void {
    this.localStream?.getAudioTracks().forEach((track) => {
      track.enabled = true;
    });
  }

  isAudioMuted(): boolean {
    const audioTrack = this.localStream?.getAudioTracks()[0];
    return audioTrack ? !audioTrack.enabled : true;
  }

  toggleCamera(): void {
    this.localStream?.getVideoTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });
  }

  isCameraOff(): boolean {
    const videoTrack = this.localStream?.getVideoTracks()[0];
    return videoTrack ? !videoTrack.enabled : true;
  }

  switchCamera(): Promise<void> {
    if (!this.localStream) return Promise.reject(new Error('No local stream'));

    const videoTrack = this.localStream.getVideoTracks()[0];
    if (!videoTrack) return Promise.reject(new Error('No video track'));

    const currentFacing = videoTrack.getSettings()?.facingMode;
    const newFacing = currentFacing === 'user' ? 'environment' : 'user';

    return navigator.mediaDevices.getUserMedia({
      video: { facingMode: newFacing },
      audio: false,
    }).then((newStream) => {
      const newVideoTrack = newStream.getVideoTracks()[0];
      const sender = this.peerConnection?.getSenders().find((s) => s.track?.kind === 'video');
      if (sender) {
        sender.replaceTrack(newVideoTrack);
      }

      this.localStream?.getVideoTracks().forEach((t) => t.stop());
      this.localStream = new MediaStream([
        newVideoTrack,
        ...this.localStream!.getAudioTracks(),
      ]);
    });
  }

  async getStats(): Promise<ConnectionStats> {
    if (!this.peerConnection) {
      return { bitrate: 0, packetLoss: 0, jitter: 0, resolution: '0x0', fps: 0, latency: 0 };
    }

    const stats = await this.peerConnection.getStats();
    let bitrate = 0;
    let packetLoss = 0;
    let jitter = 0;
    let resolution = '0x0';
    let fps = 0;

    stats.forEach((report) => {
      if (report.type === 'inbound-rtp' && report.kind === 'video') {
        bitrate = report.bytesReceived ? Math.round((report.bytesReceived * 8) / 1000) : 0;
        packetLoss = report.packetsLost || 0;
        jitter = report.jitter || 0;
        resolution = `${report.frameWidth || 0}x${report.frameHeight || 0}`;
        fps = report.framesPerSecond || 0;
      }
    });

    return { bitrate, packetLoss, jitter, resolution, fps, latency: Math.round(jitter * 1000) };
  }

  private startStatsMonitoring(): void {
    this.statsInterval = window.setInterval(async () => {
      const stats = await this.getStats();
      this.onStatsUpdate?.(stats);
    }, 2000);
  }

  private stopStatsMonitoring(): void {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
  }

  sendChatMessage(message: string): void {
    if (this.dataChannel?.readyState === 'open') {
      this.dataChannel.send(JSON.stringify({ type: 'chat', content: message }));
    }
  }

  close(): void {
    this.stopStatsMonitoring();

    this.localStream?.getTracks().forEach((track) => track.stop());
    this.localStream = null;

    this.remoteStream = null;

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.dataChannel = null;
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  getConnectionState(): ConnectionState {
    return this.peerConnection?.connectionState as ConnectionState || 'new';
  }
}
