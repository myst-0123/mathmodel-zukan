import { useLocation } from 'react-router-dom';
import { allModels } from '../data/modelRegistry';

export default function ModelPlaceholderPage() {
  const location = useLocation();
  const model = allModels.find((m) => m.path === location.pathname);

  if (!model) {
    return (
      <div className="p-8 text-gray-400">モデルが見つかりません</div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <span className="text-xs font-medium text-indigo-400 uppercase tracking-widest">
          {model.category}
        </span>
        <h2 className="text-2xl font-bold text-white mt-1 mb-2">{model.name}</h2>
        <p className="text-gray-400">{model.description}</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 flex flex-col items-center justify-center min-h-64 text-center">
        <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1 1 .03 2.798-1.338 2.798H4.136c-1.368 0-2.338-1.798-1.338-2.798L4.5 15.3" />
          </svg>
        </div>
        <p className="text-gray-500 text-sm">このモデルは現在実装中です</p>
        <p className="text-gray-600 text-xs mt-1">Coming soon</p>
      </div>
    </div>
  );
}
