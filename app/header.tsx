import Link from "next/link";
import { logout } from "./actions";

export function Header({ email, studioName }: { email: string; studioName?: string }) {
  return (
    <nav>
      <span className="muted">
        {email}
        {studioName && (
          <>
            {" · "}
            <Link href="/studio">{studioName}</Link>
          </>
        )}
      </span>
      <form action={logout}>
        <button type="submit">Sign out</button>
      </form>
    </nav>
  );
}
