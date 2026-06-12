import { redirect } from 'next/navigation';

// Public sign-up is disabled — this app is invite-only (Clerk waitlist mode).
// Any visit to /sign-up is funnelled to the request-access waitlist.
export default function SignUpPage() {
  redirect('/waitlist');
}
