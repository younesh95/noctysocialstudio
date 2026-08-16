import type { Metadata } from "next";
import { Inter, Michroma, Rajdhani } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const michroma = Michroma({ variable: "--font-michroma", subsets: ["latin"], weight: "400" });
const rajdhani = Rajdhani({ variable: "--font-rajdhani", subsets: ["latin"], weight: ["500", "600", "700"] });

export async function generateMetadata(): Promise<Metadata> {
  const incoming = await headers();
  const host = incoming.get("x-forwarded-host") ?? incoming.get("host") ?? "localhost:3000";
  const protocol = incoming.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const image = new URL("/og-v21.png", `${protocol}://${host}`).toString();
  const title = "NOCTYS Creative Hub";
  const description = "Production social media NOCTYS : créez, validez et planifiez chaque campagne esport.";
  return {
    title,
    description,
    icons: { icon: "/noctys-logo.webp", shortcut: "/noctys-logo.webp" },
    openGraph: { title, description, images: [{ url: image, width: 1731, height: 908, alt: "NOCTYS Creative Hub" }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr"><body className={`${inter.variable} ${michroma.variable} ${rajdhani.variable}`}>{children}</body></html>;
}
