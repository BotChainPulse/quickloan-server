import { useQuery } from "@tanstack/react-query";
export type BorrowerSession = {
  authenticated: boolean;
  phone?: string;
  phoneVerified?: boolean;
};
export function useBorrower() {
  return useQuery<BorrowerSession>({
    queryKey: ["borrower-session"],
    queryFn: async () => {
      const response = await fetch("/api/borrower/me", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!response.ok)
        throw new Error("Account service is temporarily unavailable");
      return response.json();
    },
    retry: false,
    staleTime: 30000,
  });
}
