export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  url: string;
  category: 'Casa' | 'Eletrônicos' | 'Beleza' | 'Audio' | 'Roupas-Masc' | 'Roupas-Fem' | 'Infantil' | 'Bebe' | 'Auto' | 'Suplementos';
  rating: number;
  benefits?: string[]; // Para as Dicas do Dia
  isDailyTip?: boolean;
}