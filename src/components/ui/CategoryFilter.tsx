interface CategoryFilterProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

const categoryLabels: Record<string, string> = {
  Casa: "Casa",
  Eletronicos: "Eletronicos",
  "Eletrônicos": "Eletronicos",
  Beleza: "Beleza",
  Audio: "Audio",
  "Roupas-Masc": "Masculino",
  "Roupas-Fem": "Feminino",
  Infantil: "Infantil",
  Bebe: "Bebe",
  Auto: "Auto",
  Suplementos: "Suplementos",
};

export default function CategoryFilter({
  categories,
  selectedCategory,
  onSelectCategory,
}: CategoryFilterProps) {
  return (
    <div className="flex flex-nowrap items-center gap-3 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4 mask-fade-edge">
      {categories.map((category) => (
        <button
          key={category}
          onClick={() => onSelectCategory(category)}
          className={`flex-shrink-0 whitespace-nowrap px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all border-2 ${
            selectedCategory === category
              ? "bg-[#FFE600] text-[#0F172A] border-[#FFE600] shadow-md scale-105"
              : "bg-[#0F172A] text-white border-[#0F172A] hover:bg-[#FFE600] hover:text-[#0F172A] hover:border-[#FFE600]"
          }`}
        >
          {categoryLabels[category] || category}
        </button>
      ))}
    </div>
  );
}
