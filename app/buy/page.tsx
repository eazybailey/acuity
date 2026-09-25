import Link from "next/link";
import { requireStudio } from "@/lib/auth";
import type { Product } from "@/lib/acuity";
import { getProducts } from "@/lib/data";
import { checkoutUrl } from "@/lib/packages";
import { Header } from "../header";

export const dynamic = "force-dynamic";

// Buy: list this studio's products; checkout happens on Acuity (the studio's own Stripe).
export default async function BuyPage() {
  const { email, studio } = await requireStudio();

  let products: Product[] | null = null;
  try {
    products = (await getProducts(studio.code)).filter((p) => !p.hidden);
  } catch {
    products = null;
  }

  return (
    <main>
      <Header email={email} studioName={studio.name} />
      <p><Link href="/">← My minutes</Link></p>
      <h1>Buy package</h1>
      <p className="muted">Payment is taken by {studio.name} through Acuity. Come back here afterwards to see your minutes.</p>
      {!products ? (
        <p className="err">Could not load packages. Try again shortly.</p>
      ) : products.length === 0 ? (
        <p>No packages for sale at this studio.</p>
      ) : (
        <ul>
          {products.map((p) => (
            <li key={p.id}>
              <a className="btn" href={checkoutUrl(studio.credentials!.userId, p.id)} rel="noopener">
                {p.name}
                {typeof p.minutes === "number" ? ` · ${p.minutes} min` : ""}
                {p.price ? ` · £${p.price}` : ""}
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
