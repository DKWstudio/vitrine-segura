interface CategoryFilterProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

const categoryLabels: Record<string, string> = {
  Casa: "Casa",
  Eletronicos: "Eletronicos",
  "Eletr\u00f4nicos": "Eletronicos",
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
    <div className="flex flex-nowrap items-center gap-2 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4 mask-fade-edge sm:gap-2.5">
      {categories.map((category) => (
        <button
          key={category}
          onClick={() => onSelectCategory(category)}
          className={`flex-shrink-0 whitespace-nowrap rounded-xl border-2 px-3.5 py-2.5 text-[9px] font-black uppercase tracking-wide transition-all sm:px-4 sm:text-[10px] lg:px-5 ${
            selectedCategory === category
              ? "border-[#FFE600] bg-[#FFE600] text-[#0F172A] shadow-md"
              : "border-[#0F172A] bg-[#0F172A] text-white hover:border-[#FFE600] hover:bg-[#FFE600] hover:text-[#0F172A]"
          }`}
        >
          {categoryLabels[category] || category}
        </button>
      ))}
    </div>
  );
}
