import { Link } from 'react-router-dom';
import { categories } from '../data/modelRegistry';

export default function HomePage() {
  return (
    <div className="px-4 md:px-6 lg:px-8 py-6 max-w-screen-2xl mx-auto">
      <div className="mb-10">
        <h2 className="text-3xl font-bold text-white mb-3">数理モデル図鑑</h2>
        <p className="text-gray-400 text-lg leading-relaxed">
          様々な数理モデルをインタラクティブに体験できるWebアプリです。
          パラメータを操作してモデルの挙動を観察しましょう。
        </p>
      </div>

      <div className="grid gap-8">
        {categories.map((cat) => (
          <section key={cat.id}>
            <h3 className="text-lg font-semibold text-indigo-400 mb-3 border-b border-gray-800 pb-2">
              {cat.name}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {cat.models.map((model) => (
                <Link
                  key={model.id}
                  to={model.path}
                  className="block bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-indigo-500 hover:bg-gray-800 transition-all group"
                >
                  <h4 className="text-white font-medium mb-1 group-hover:text-indigo-300 transition-colors">
                    {model.name}
                  </h4>
                  <p className="text-gray-500 text-sm leading-relaxed">{model.description}</p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
