import { Navigate, useParams } from 'react-router-dom';
import { isReservedSlug } from '../../constants/reservedSlugs.js';
import { getSchoolBySlug } from '../../services/schoolService.js';

export default function SchoolRouteGuard({ children }) {
  const { schoolSlug } = useParams();

  if (!schoolSlug || isReservedSlug(schoolSlug)) {
    return <Navigate to="/" replace />;
  }

  const school = getSchoolBySlug(schoolSlug);
  if (!school) {
    return <Navigate to="/" replace />;
  }

  return children;
}
