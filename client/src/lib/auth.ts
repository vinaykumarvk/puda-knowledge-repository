import { useAuth as useAuthContext } from "@/contexts/auth-context";

export { useAuth } from "@/contexts/auth-context";

export function useUser() {
  const { user } = useAuthContext();
  return user;
}

export function useLogout() {
  const { logout } = useAuthContext();
  return logout;
}
