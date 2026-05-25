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
      {
        id: 'polychora',
        name: '正多胞体ビューア',
        description: '5胞体・超立方体・16胞体・24胞体・120胞体・600胞体を3方式の射影で可視化',
        category: 'geometry',
        path: '/models/polychora',
      },
    ],
  },
];

export const allModels: ModelMeta[] = categories.flatMap((c) => c.models);
