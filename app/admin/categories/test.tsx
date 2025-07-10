"use client";

import { AdminLayout } from "../../../components/AdminLayout";

export default function TestPage() {
  console.log('Test page rendering...');
  
  return (
    <AdminLayout>
      <div className="p-8">
        <h1 className="text-3xl font-bold">Test Page</h1>
        <p>This is a test page to see if AdminLayout works.</p>
      </div>
    </AdminLayout>
  );
} 