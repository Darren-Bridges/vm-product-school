import type { Metadata } from "next";
import "./globals.css";
import { NavBar } from "../components/NavBar";
import { AuthProvider } from "../context/AuthContext";

export const metadata: Metadata = {
  title: "VM product school",
  description: "VM product school",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <NavBar />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
