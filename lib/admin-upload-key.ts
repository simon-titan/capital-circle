import { randomUUID } from "node:crypto";

/** UUID v4 (locker, wie bisher in der Upload-Route). */
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type AdminUploadKeyInput = {
  fileName: string;
  contentType?: string;
  folder?: "videos" | "attachments" | "covers" | "live-sessions";
  courseId?: string;
  moduleId?: string;
  /** Bei folder=videos: Modul-Video-ID; bei folder=live-sessions: live_session_videos.id */
  videoId?: string;
  subcategoryId?: string;
  /** Nur folder=live-sessions: live_sessions.id */
  sessionId?: string;
  kind?: "original" | "thumbnail";
  attachmentId?: string;
};

export function buildAdminStorageKey(body: AdminUploadKeyInput):
  | { ok: true; storageKey: string; contentType: string }
  | { ok: false; error: string; status: number } {
  const folder = body.folder ?? "attachments";
  let storageKey: string;

  if (folder === "videos") {
    const { courseId, moduleId, videoId } = body;
    if (!courseId || !moduleId || !videoId) {
      return { ok: false, error: "missing_video_path_ids", status: 400 };
    }
    if (![courseId, moduleId, videoId].every((id) => UUID_RE.test(id))) {
      return { ok: false, error: "invalid_uuid", status: 400 };
    }
    if (body.subcategoryId && !UUID_RE.test(body.subcategoryId)) {
      return { ok: false, error: "invalid_subcategory_uuid", status: 400 };
    }
    const kind = body.kind ?? "original";
    const fileLeaf = kind === "thumbnail" ? "thumbnail.jpg" : "original.mp4";
    const sub = body.subcategoryId ? `${body.subcategoryId}/` : "";
    storageKey = `videos/${courseId}/${moduleId}/${sub}${videoId}/${fileLeaf}`;
  } else if (folder === "live-sessions") {
    const sessionId = body.sessionId;
    const videoId = body.videoId;
    if (!sessionId || !videoId) {
      return { ok: false, error: "missing_live_session_ids", status: 400 };
    }
    if (![sessionId, videoId].every((id) => UUID_RE.test(id))) {
      return { ok: false, error: "invalid_uuid", status: 400 };
    }
    const kind = body.kind ?? "original";
    const fileLeaf = kind === "thumbnail" ? "thumbnail.jpg" : "original.mp4";
    storageKey = `live-sessions/${sessionId}/${videoId}/${fileLeaf}`;
  } else if (folder === "attachments") {
    const courseId = body.courseId ?? "unknown";
    const moduleId = body.moduleId ?? "unknown";
    const videoId = body.videoId ?? "unknown";
    const attId =
      body.attachmentId && UUID_RE.test(body.attachmentId) ? body.attachmentId : randomUUID();
    const safeName = body.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    storageKey = `attachments/${courseId}/${moduleId}/${videoId}/${attId}/${safeName}`;
  } else {
    const safeName = body.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    storageKey = `${folder}/${Date.now()}-${safeName}`;
  }

  const contentType =
    (folder === "videos" || folder === "live-sessions") && (body.kind ?? "original") === "thumbnail"
      ? body.contentType || "image/jpeg"
      : body.contentType || "application/octet-stream";

  return { ok: true, storageKey, contentType };
}
