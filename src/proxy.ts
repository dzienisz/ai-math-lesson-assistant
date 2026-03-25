import { authMiddleware } from "@/lib/auth/server";

export default authMiddleware;

export const config = {
  matcher: ["/dashboard/:path*", "/upload/:path*"],
};
