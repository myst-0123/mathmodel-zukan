import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-96 text-center p-8">
      <p className="text-6xl font-bold text-gray-700 mb-4">404</p>
      <p className="text-gray-400 mb-6">ページが見つかりません</p>
      <Link
        to="/"
        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors text-sm"
      >
        ホームへ戻る
      </Link>
    </div>
  );
}
