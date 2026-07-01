import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { PageHeader, EmptyState } from '../../components/ui/index.jsx';
import { getPhotos } from '../../services/mediaService.js';
import { Image } from 'lucide-react';

export default function ParentPhotos() {
  const [photos, setPhotos] = useState([]);

  useEffect(() => { getPhotos({ studentId: 'aarav' }).then(setPhotos); }, []);

  return (
    <DashboardLayout>
      <PageHeader title="Photos from Teacher" subtitle="Classroom photos shared by your child's teacher." />

      {photos.length === 0 ? (
        <EmptyState icon={Image} title="No Photos Shared Yet" description="Teacher-shared photos will appear here." />
      ) : (
        <div className="premium-photo-grid">
          {photos.map((photo) => (
            <div key={photo.id} className="premium-photo-card">
              <img src={photo.imageUrl} alt={photo.caption} />
              <div className="photo-card-body">
                <h4>{photo.caption}</h4>
                <p>{photo.teacherName} · {photo.className}</p>
                <p>{new Date(photo.sentAt).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
