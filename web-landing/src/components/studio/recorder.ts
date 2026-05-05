// MediaRecorder wrapper for live audio capture.
// Output: Blob (audio/webm; Opus). Caller is responsible for download URL.

export class Recorder {
  private rec: MediaRecorder | null = null;
  private chunks: Blob[] = [];

  constructor(private readonly stream: MediaStream) {}

  static isSupported(): boolean {
    return typeof window !== "undefined"
      && typeof window.MediaRecorder !== "undefined";
  }

  start(): void {
    if (this.rec) throw new Error("recorder already running");
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";
    this.rec = new MediaRecorder(this.stream, { mimeType });
    this.chunks = [];
    this.rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) this.chunks.push(e.data);
    };
    this.rec.start();
  }

  stop(): Promise<Blob> {
    return new Promise((resolve) => {
      if (!this.rec) {
        resolve(new Blob([], { type: "audio/webm" }));
        return;
      }
      this.rec.onstop = () => {
        const blob = new Blob(this.chunks, { type: "audio/webm" });
        this.rec = null;
        resolve(blob);
      };
      this.rec.stop();
    });
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
