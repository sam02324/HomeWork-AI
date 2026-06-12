import { Waitlist } from '@clerk/nextjs';

export default function WaitlistPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'hsl(225, 25%, 5%)',
    }}>
      <Waitlist />
    </div>
  );
}
