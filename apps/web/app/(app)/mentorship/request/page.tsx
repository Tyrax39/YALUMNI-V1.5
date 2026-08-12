import { Suspense } from "react";

import { MentorshipRequestCreate } from "@/components/mentorship/mentorship-surfaces";

export default function RequestMentorshipPage() {
  return (
    <Suspense fallback={null}>
      <MentorshipRequestCreate />
    </Suspense>
  );
}
