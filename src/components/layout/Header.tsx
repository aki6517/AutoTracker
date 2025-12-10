function Header() {
  return (
    <header className="h-16 bg-[#1A1A1A] border-b border-gray-800 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-white">ダッシュボード</h2>
      </div>
      <div className="flex items-center gap-4">
        <button className="px-4 py-2 bg-[#E5C890] bg-opacity-20 text-[#E5C890] rounded-lg hover:bg-opacity-30 transition-colors">
          トラッキング開始
        </button>
      </div>
    </header>
  );
}

export default Header;

