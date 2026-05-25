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
