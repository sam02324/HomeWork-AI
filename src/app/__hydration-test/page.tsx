'use client';

import { useEffect, useState } from 'react';

export default function HydrationTest() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    document.documentElement.dataset.hydrated = 'yes';
  }, []);
  return <main data-mounted={mounted}>{mounted ? 'HYDRATED' : 'SSR-ONLY'}</main>;
}
