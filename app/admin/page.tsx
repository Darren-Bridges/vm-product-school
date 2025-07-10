export default function AdminPage() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Admin Panel</h1>
      <ul className="list-disc pl-6 space-y-2">
        <li><a href="/admin/articles" className="text-blue-600 underline">Manage Articles</a></li>
        <li><a href="/admin/categories" className="text-blue-600 underline">Manage Categories</a></li>
        <li><a href="/admin/tours" className="text-blue-600 underline">Manage Tours</a></li>
        <li><a href="/admin/theme" className="text-blue-600 underline">Theming</a></li>
      </ul>
    </main>
  );
} 