export {};

type GradeAiRole = 'teacher' | 'student' | 'admin';

declare global {
  interface CustomJwtSessionClaims {
    metadata?: {
      role?: GradeAiRole;
    };
  }

  interface UserPublicMetadata {
    role?: GradeAiRole;
  }
}
