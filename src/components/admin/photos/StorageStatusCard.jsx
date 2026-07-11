import { AlertCircle, CheckCircle2, Cloud, Loader2 } from 'lucide-react';

export default function StorageStatusCard({ config, photosReady }) {
  if (!config) return null;

  if (!photosReady) {
    const failed = config.connectionStatus === 'FAILED';
    return (
      <div
        className={`photo-storage-card photo-storage-card--${failed ? 'error' : 'warning'}`}
        role="status"
        aria-live="polite"
      >
        <AlertCircle size={20} aria-hidden />
        <div className="photo-storage-card__content">
          <strong>Photo storage not available</strong>
          {failed ? (
            <p>
              Cloud setup failed for this workspace
              {config.statusMessage ? `: ${config.statusMessage}` : '.'}
              {' '}Contact your administrator to retry provisioning.
            </p>
          ) : (
            <p>
              This school workspace does not have cloud photo storage connected yet.
              It is created automatically when the workspace is provisioned.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="photo-storage-card photo-storage-card--connected" role="status">
      <CheckCircle2 size={18} aria-hidden />
      <div className="photo-storage-card__content">
        <strong>Cloud storage connected</strong>
        <p>
          <Cloud size={14} aria-hidden />
          {config.filevaultUsername
            ? `Workspace: ${config.filevaultUsername}`
            : 'Ready for uploads and sharing'}
        </p>
      </div>
    </div>
  );
}

export function StorageStatusCardSkeleton() {
  return (
    <div className="photo-storage-card photo-storage-card--skeleton" aria-hidden>
      <Loader2 size={18} />
      <span>Checking storage status…</span>
    </div>
  );
}
