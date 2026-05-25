export interface ModelMeta {
  id: string;
  name: string;
  description: string;
  category: string;
  path: string;
}

export interface Category {
  id: string;
  name: string;
  models: ModelMeta[];
}

export const categories: Category[] = [
  {
    id: 'differential',
    name: '微分方程式',
    models: [
      {
        id: 'sir',
        name: 'SIR モデル',
        description: '感染症の拡大・収束をシミュレートするモデル',
        category: 'differential',
        path: '/models/sir',
      },
      {
        id: 'lotka-volterra',
        name: 'ロトカ＝ヴォルテラ方程式',
        description: '捕食者と被食者の個体数変動モデル',
        category: 'differential',
        path: '/models/lotka-volterra',
      },
      {
        id: 'logistic',
        name: 'ロジスティック成長',
        description: '環境収容力を考慮した個体数成長モデル',
        category: 'differential',
        path: '/models/logistic',
      },
    ],
  },
  {
    id: 'chaos',
    name: 'カオス・フラクタル',
    models: [
      {
        id: 'lorenz',
        name: 'ローレンツアトラクター',
        description: 'カオス的振る舞いを示す3次元力学系',
        category: 'chaos',
        path: '/models/lorenz',
      },
      {
        id: 'logistic-map',
        name: 'ロジスティック写像',
        description: 'カオスへの分岐を示す離散力学系',
        category: 'chaos',
        path: '/models/logistic-map',
      },
      {
        id: 'mandelbrot',
        name: 'マンデルブロ集合',
        description: '複素数の反復写像が生み出すフラクタル図形',
        category: 'chaos',
        path: '/models/mandelbrot',
      },
    ],
  },
  {
    id: 'probability',
    name: '確率・統計',
    models: [
      {
        id: 'random-walk',
        name: 'ランダムウォーク',
        description: 'ランダムな移動の経路と統計的性質',
        category: 'probability',
        path: '/models/random-walk',
      },
      {
        id: 'monte-carlo',
        name: 'モンテカルロ法',
        description: '乱数サンプリングによる数値計算手法',
        category: 'probability',
        path: '/models/monte-carlo',
      },
    ],
  },
  {
    id: 'optimization',
    name: '最適化',
    models: [
      {
        id: 'gradient-descent',
        name: '勾配降下法',
        description: '損失関数を最小化する反復最適化アルゴリズム',
        category: 'optimization',
        path: '/models/gradient-descent',
      },
    ],
  },
  {
    id: 'geometry',
    name: '幾何学',
    models: [
      {
        id: 'polyhedra',
        name: '正多面体ビューア',
        description: '正十二面体と正二十面体をインタラクティブに観察できる 3D ビューア',
        category: 'geometry',
        path: '/models/polyhedra',
      },
    ],
  },
];

export const allModels: ModelMeta[] = categories.flatMap((c) => c.models);
