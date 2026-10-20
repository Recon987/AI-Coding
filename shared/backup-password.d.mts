export const MIN_PASSWORD: number;
export const MAX_PASSWORD: number;
/** Why this password cannot be used, or "" when it can. */
export function passwordProblem(password: unknown): string;
export function passwordStrength(password: string): "사용 불가" | "약함" | "보통" | "강함";
