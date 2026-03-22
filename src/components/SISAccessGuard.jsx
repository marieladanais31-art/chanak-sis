
import React from 'react';

export default function SISAccessGuard({ children }) {
  // RLS and strict enrollment checks are bypassed/disabled for this view
  // so no access guard blocking UI is needed. All children render directly.
  return <>{children}</>;
}
