import Image from "next/image";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Welcome to the Product School Help Center</h1>
      <p className="mb-6">Search for help articles, browse categories, or start a product tour.</p>
      {/* TODO: Add search bar and list of popular articles */}
      <div className="bg-gray-100 p-4 rounded">Search and popular articles coming soon.</div>
    </main>
  );
}
