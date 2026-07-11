import { Image, FolderOpen, Camera, Video } from 'lucide-react';
import BentoStatCard from '../../dashboard/BentoStatCard.jsx';

export default function MediaStats({ totalLoaded, albumCount, photoCount, videoCount }) {
  return (
    <section className="photo-media-stats" aria-label="Media library statistics">
      <BentoStatCard
        icon={Image}
        value={totalLoaded}
        label="Media in Library"
        variant="indigo"
      />
      <BentoStatCard
        icon={FolderOpen}
        value={albumCount}
        label="Class Albums"
        variant="rose"
      />
      <BentoStatCard
        icon={Camera}
        value={photoCount}
        label="Photos"
        variant="emerald"
      />
      <BentoStatCard
        icon={Video}
        value={videoCount}
        label="Videos"
        variant="indigo"
      />
    </section>
  );
}
