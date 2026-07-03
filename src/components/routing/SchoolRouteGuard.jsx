import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { isReservedSlug } from '../../constants/reservedSlugs.js';
import { getSchoolBySlug, resolveSchoolBySlug } from '../../services/schoolService.js';
import { isApiEnabled } from '../../services/api/config.js';
import InvalidWorkspace from '../../pages/public/InvalidWorkspace.jsx';

export default function SchoolRouteGuard({ children }) {
  const { schoolSlug } = useParams();
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!schoolSlug || isReservedSlug(schoolSlug)) {
      setSchool(null);
      setLoading(false);
      return undefined;
    }

    if (!isApiEnabled()) {
      setSchool(getSchoolBySlug(schoolSlug));
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    resolveSchoolBySlug(schoolSlug)
      .then((resolved) => {
        if (!cancelled) setSchool(resolved);
      })
      .catch(() => {
        if (!cancelled) setSchool(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [schoolSlug]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        Loading school…
      </div>
    );
  }

  if (!school) {
    return <InvalidWorkspace />;
  }

  return children;
}
