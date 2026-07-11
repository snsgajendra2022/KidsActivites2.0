import { Link } from 'react-router-dom';
import { ChevronRight, Image, RefreshCw, Upload, FolderOpen } from 'lucide-react';
import Button from '../../ui/Button.jsx';
import StorageStatusCard from './StorageStatusCard.jsx';

export default function PhotoSharingHeader({
  tenantPath,
  photosReady,
  loading,
  refreshing,
  config,
  showUploadPanel,
  onToggleUpload,
  onRefresh,
}) {
  return (
    <header className="photo-sharing-header">
      <nav className="photo-sharing-breadcrumb" aria-label="Breadcrumb">
        <Link to={tenantPath('/admin/albums')} className="photo-sharing-breadcrumb__link">
          Media & Albums
        </Link>
        <ChevronRight size={14} aria-hidden className="photo-sharing-breadcrumb__sep" />
        <span className="photo-sharing-breadcrumb__current" aria-current="page">
          Photo Sharing
        </span>
      </nav>

      <div className="photo-sharing-header__main">
        <div className="photo-sharing-header__title-block">
          <div className="photo-sharing-header__icon" aria-hidden>
            <Image size={22} />
          </div>
          <div>
            <h1 className="photo-sharing-header__title">Photo Sharing</h1>
            <p className="photo-sharing-header__subtitle">
              Browse your media library, upload to class albums, and share photos &amp; videos with families.
            </p>
          </div>
        </div>

        <div className="photo-sharing-header__actions">
          {photosReady && (
            <>
              <Button
                type="button"
                variant={showUploadPanel ? 'primary' : 'secondary'}
                onClick={onToggleUpload}
                aria-expanded={showUploadPanel}
                aria-controls="media-upload-panel"
              >
                <Upload size={16} aria-hidden />
                Upload Media
              </Button>
              <Link to={tenantPath('/admin/albums')} className="btn btn-outline">
                <FolderOpen size={16} aria-hidden />
                Manage Albums
              </Link>
            </>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={onRefresh}
            disabled={loading || refreshing}
            aria-label="Refresh media library"
          >
            <RefreshCw size={16} className={refreshing ? 'photo-sharing-spin' : ''} aria-hidden />
            Refresh
          </Button>
        </div>
      </div>

      {!loading && (
        <StorageStatusCard config={config} photosReady={photosReady} />
      )}
    </header>
  );
}
