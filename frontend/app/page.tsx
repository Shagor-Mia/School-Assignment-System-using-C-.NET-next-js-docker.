import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, getUserFromToken, roleHomePath } from "@/lib/auth";

export default async function RootPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const user = token ? getUserFromToken(token) : null;

  redirect(user ? roleHomePath(user.role) : "/login");
}
