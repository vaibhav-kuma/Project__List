export type MLLabel = "nudity_explicit" | "violence_gore" | "underage";

export type MLResult = {
  label: MLLabel;
  score: number; // 0..1
  modelName: string;
  modelVersion?: string;
  metadata?: any;
};

type NsfwjsModule = typeof import("nsfwjs");

export async function loadNudityModel() {
  const nsfw = (await import("nsfwjs")) as unknown as NsfwjsModule;
  // nsfwjs loads a lightweight model by default
  const model = await nsfw.load();
  return model;
}

export async function analyzeFrameForNudity(model: any, canvas: HTMLCanvasElement): Promise<MLResult> {
  const predictions = (await model.classify(canvas)) as Array<{ className: string; probability: number }>;
  const byName = new Map(predictions.map((p) => [p.className, p.probability]));
  const porn = byName.get("Porn") ?? 0;
  const sexy = byName.get("Sexy") ?? 0;
  const score = Math.max(porn, sexy);
  return {
    label: "nudity_explicit",
    score,
    modelName: "nsfwjs",
    modelVersion: "default",
    metadata: { predictions }
  };
}

// Placeholders for violence + age estimation.
// In production, use a server-side CV pipeline (e.g. AWS Rekognition / Google Vision / custom TF model)
// because these are heavier + more sensitive.
export async function analyzeFrameForViolence(_canvas: HTMLCanvasElement): Promise<MLResult> {
  return { label: "violence_gore", score: 0, modelName: "stub", modelVersion: "0" };
}

export async function analyzeFrameForUnderage(_canvas: HTMLCanvasElement): Promise<MLResult> {
  return { label: "underage", score: 0, modelName: "stub", modelVersion: "0" };
}

